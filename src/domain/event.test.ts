import { describe, expect, it } from 'vitest'
import { buildEventMeta, resultsOf, submissionsCsv, summarize, toEventInfo } from './event'
import type { EventPlan } from './eventPlan'
import type { Submission } from './event'
import { DEFAULT_RULES } from './rules'
import type { Game, GameRules } from './types'
import { decodeSeries, encodeSeries } from './watchSnapshot'

const rules: GameRules = { ...DEFAULT_RULES, gameCount: 2 }

/** a が 50 点で勝つゲーム。b は 1 点ずつで 4 点 */
const aWins = (gameNumber: number, order: string[]): Game => ({
  id: `g${gameNumber}`,
  createdAt: 0,
  finishedAt: 1,
  rules,
  entries: order.map((id) => ({ id, name: id.toUpperCase(), memberIds: [`m${id}`], handicap: 0 })),
  // 交互に投げ、a が 12 × 4 と 2 で 50 点に届いたところで終わる。b は毎回 1 点
  throws: Array.from({ length: 10 }, (_, index) => order[index % 2])
    .slice(0, order[0] === 'a' ? 9 : 10)
    .map((entryId, index) => ({
      entryId,
      memberId: `m${entryId}`,
      pins: entryId === 'b' ? [1] : [index >= 8 ? 2 : 12],
      at: index,
    })),
  seriesId: 's1',
  gameNumber,
  timeUpAt: null,
  shootoutWinnerId: null,
  tournamentId: null,
  matchId: null,
})

const plan: EventPlan = {
  players: [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
  ],
  stages: [
    {
      id: 's1',
      name: '決勝',
      format: 'knockout',
      rules,
      groupSize: 2,
      advancePerGroup: 1,
      wildcards: 0,
      pointsBreakTies: false,
      tiebreaks: {},
      groups: [{ id: 'g1', label: '第 1 試合', playerIds: ['a', 'b'] }],
      started: true,
    },
  ],
}

const submission = (status: Submission['status']): Submission => ({
  courtUid: 'u',
  submittedAt: 0,
  payload: encodeSeries([aWins(1, ['a', 'b']), aWins(2, ['b', 'a'])], []),
  status,
  note: '',
})

describe('本部とコートの大会', () => {
  it('大会プランは文字列にして送り、受け取った側で戻せる', () => {
    const meta = buildEventMeta('owner', '  春の大会 ', plan, 100)
    const info = toEventInfo(meta)
    expect(info.name).toBe('春の大会')
    expect(info.plan).toEqual(plan)
    expect(meta.expiresAt).toBeGreaterThan(meta.createdAt)
  })

  it('試合のまとめは最初のゲームの並びのまま、各ゲームの点と勝者を出す', () => {
    const series = decodeSeries(encodeSeries([aWins(1, ['a', 'b']), aWins(2, ['b', 'a'])], []))
    const summary = summarize(series)
    expect(summary.teams.map((team) => [team.name, team.perGame, team.total])).toEqual([
      ['A', [50, 50], 100],
      ['B', [4, 5], 9],
    ])
    expect(summary.winnerName).toBe('A')
    expect(summary.finished).toBe(true)
  })

  it('提出から勝ったゲーム数と合計点を取り出し、差し戻した試合は数えない', () => {
    const results = resultsOf({ 's1-g1-1': submission('approved'), other: submission('returned') })
    expect(Object.keys(results)).toEqual(['s1-g1-1'])
    expect(results['s1-g1-1']).toEqual({
      sets: { a: 2, b: 0 },
      points: { a: 100, b: 9 },
      winnerId: 'a',
      approved: true,
    })
  })

  it('CSV は 1 行 1 人で、ステージとグループを添える', () => {
    const lines = submissionsCsv(plan, { 's1-g1-1': submission('approved') })
      .replace('\ufeff', '')
      .split('\r\n')
    expect(lines[0]).toBe(
      '"ステージ","グループ","試合","名前","第1ゲーム","第2ゲーム","合計","勝ったゲーム","勝敗","状態"',
    )
    expect(lines[1]).toBe('"決勝","第 1 試合","s1-g1-1","A","50","50","100","2","勝ち","承認済み"')
    expect(lines[2]).toBe('"決勝","第 1 試合","s1-g1-1","B","4","5","9","0","","承認済み"')
  })
})
