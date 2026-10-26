import { describe, expect, it } from 'vitest'
import { defaultAvatar } from './avatar'
import { DEFAULT_RULES } from './rules'
import { computeMemberStats } from './stats'
import type { Game, Member } from './types'

const member = (id: string): Member => ({
  id,
  name: id,
  createdAt: 0,
  avatar: defaultAvatar(id, id),
  listed: true,
})

/** a と b の 1 対 1。a が 12 点ずつ取って最後に 2 点で上がる。b は 1 回ミスして、あとは 1 点 */
const game: Game = {
  id: 'g',
  createdAt: 0,
  finishedAt: 1,
  rules: DEFAULT_RULES,
  entries: [
    { id: 'A', name: 'A', memberIds: ['a'], handicap: 0 },
    { id: 'B', name: 'B', memberIds: ['b'], handicap: 0 },
  ],
  throws: (
    [
      ['A', 'a', [12]],
      ['B', 'b', []],
      ['A', 'a', [12]],
      ['B', 'b', [1]],
      ['A', 'a', [12]],
      ['B', 'b', [1]],
      ['A', 'a', [12]],
      ['B', 'b', [1]],
      ['A', 'a', [2]],
    ] as [string, string, number[]][]
  ).map(([entryId, memberId, pins], index) => ({ entryId, memberId, pins, at: index })),
  seriesId: 's',
  gameNumber: 1,
  timeUpAt: null,
  shootoutWinnerId: null,
  tournamentId: null,
  matchId: null,
}

describe('プレイヤーの成績', () => {
  it('勝率・命中率・上がりの回数を数える', () => {
    const [a, b] = computeMemberStats([game], [member('a'), member('b')])
    expect(a).toMatchObject({ games: 1, wins: 1, winRate: 1, hitRate: 1, finishes: 1 })
    // b は 4 投のうち 1 回ミス
    expect(b).toMatchObject({ games: 1, wins: 0, winRate: 0, hitRate: 0.75, finishes: 0 })
  })
})
