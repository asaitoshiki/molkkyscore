import { describe, expect, it } from 'vitest'
import { DEFAULT_RULES } from './rules'
import {
  SHARE_TTL_MS,
  acceptsWatchThrow,
  buildWatchRecord,
  buildWatchThrow,
  isShareExpired,
  newShareId,
  pinsOfWatchThrow,
  toWatchState,
} from './watchSnapshot'
import type { Game, Member } from './types'

const members: Member[] = [
  { id: 'm1', name: 'たろう', createdAt: 0, avatar: { color: '#000', mark: 'x' }, listed: true },
  { id: 'm2', name: 'はなこ', createdAt: 0, avatar: { color: '#000', mark: 'x' }, listed: true },
  { id: 'm3', name: '関係ない人', createdAt: 0, avatar: { color: '#000', mark: 'x' }, listed: true },
]

const game: Game = {
  id: 'g1',
  createdAt: 0,
  finishedAt: null,
  rules: DEFAULT_RULES,
  entries: [
    { id: 'e1', name: 'A', memberIds: ['m1'], handicap: 0 },
    { id: 'e2', name: 'B', memberIds: ['m2'], handicap: 10 },
  ],
  // 2 投目はミス（空の配列）。データベースを通すと消えやすいので必ず残っているか見る
  throws: [
    { entryId: 'e1', memberId: 'm1', pins: [12], at: 1 },
    { entryId: 'e2', memberId: 'm2', pins: [], at: 2 },
  ],
  seriesId: 's1',
  gameNumber: 1,
  timeUpAt: null,
  shootoutWinnerId: null,
  tournamentId: null,
  matchId: null,
}

describe('観戦用の記録', () => {
  it('送って受け取ると、ミスも null もそのまま戻る', () => {
    const record = buildWatchRecord('uid', [game], members, 1000, false)
    const state = toWatchState(record, 1000)
    expect(state).toEqual({
      kind: 'live',
      games: [game],
      memberNames: { m1: 'たろう', m2: 'はなこ' },
      openInput: false,
    })
  })

  it('試合に出ていないメンバーの名前は送らない', () => {
    const record = buildWatchRecord('uid', [game], members, 1000, false)
    expect(record.payload).not.toContain('関係ない人')
  })

  it('期限を過ぎたら終了と見なす', () => {
    const record = buildWatchRecord('uid', [game], members, 1000, false)
    expect(toWatchState(record, 1000 + SHARE_TTL_MS).kind).toBe('live')
    expect(toWatchState(record, 1000 + SHARE_TTL_MS + 1).kind).toBe('ended')
  })

  it('記録が無ければ見つからない扱い', () => {
    expect(toWatchState(null, 0).kind).toBe('missing')
  })

  it('観戦リンクの鍵は十分に長く、毎回違う', () => {
    const ids = new Set(Array.from({ length: 100 }, newShareId))
    expect(ids.size).toBe(100)
    expect([...ids][0]).toMatch(/^[a-zA-Z0-9]{20}$/)
  })

  it('最後の投球から期限を数え、試合が消されていれば期限切れ扱い', () => {
    expect(isShareExpired([game], 2 + SHARE_TTL_MS)).toBe(false)
    expect(isShareExpired([game], 3 + SHARE_TTL_MS)).toBe(true)
    expect(isShareExpired([], 0 + SHARE_TTL_MS + 1)).toBe(true)
  })
})

describe('観戦する人の入力', () => {
  it('入れたときと局面が同じなら受け付け、ミス（空の配列）もそのまま戻る', () => {
    const input = buildWatchThrow('viewer', game, [], 5)
    expect(acceptsWatchThrow([game], input)).toBe(true)
    expect(pinsOfWatchThrow(input)).toEqual([])
  })

  it('先に別の人が入れて投球数が進んでいたら捨てる', () => {
    const input = buildWatchThrow('viewer', game, [3], 5)
    const advanced: Game = {
      ...game,
      throws: [...game.throws, { entryId: 'e1', memberId: 'm1', pins: [5], at: 6 }],
    }
    expect(acceptsWatchThrow([advanced], input)).toBe(false)
  })

  it('次のゲームに移っていたら、前のゲームへの入力は捨てる', () => {
    const input = buildWatchThrow('viewer', game, [3], 5)
    const next: Game = { ...game, id: 'g2', gameNumber: 2, throws: [] }
    expect(acceptsWatchThrow([game, next], input)).toBe(false)
  })

  it('1〜12 以外や重複したピン番号は受け付けない', () => {
    expect(() => pinsOfWatchThrow({ ...buildWatchThrow('v', game, [], 0), pins: '[13]' })).toThrow()
    expect(() => pinsOfWatchThrow({ ...buildWatchThrow('v', game, [], 0), pins: '[2,2]' })).toThrow()
  })
})
