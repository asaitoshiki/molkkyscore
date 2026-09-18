import { describe, expect, it } from 'vitest'
import { gamesOfSeries, seriesStandings } from './series'
import { DEFAULT_RULES } from './rules'
import type { Game } from './types'

const entries = [
  { id: 'a', name: 'A', memberIds: ['m1'] },
  { id: 'b', name: 'B', memberIds: ['m2'] },
]

const game = (gameNumber: number, throwsSpec: [string, number[]][]): Game => ({
  id: `g${gameNumber}`,
  createdAt: gameNumber,
  finishedAt: null,
  rules: DEFAULT_RULES,
  entries,
  throws: throwsSpec.map(([entryId, pins], index) => ({
    entryId,
    memberId: entryId === 'a' ? 'm1' : 'm2',
    pins,
    at: index,
  })),
  seriesId: 's1',
  gameNumber,
  tournamentId: null,
  matchId: null,
})

describe('seriesStandings', () => {
  it('ゲームごとの得点を並べ、合計を出す', () => {
    const standings = seriesStandings([
      game(1, [['a', [10]], ['b', [4]]]),
      game(2, [['a', [3]], ['b', [7]]]),
    ])
    expect(standings[0].perGame).toEqual([10, 3])
    expect(standings[0].total).toBe(13)
    expect(standings[1].perGame).toEqual([4, 7])
    expect(standings[1].total).toBe(11)
  })

  it('勝ったゲーム数を数える', () => {
    const won = game(1, [
      ['a', [12]], ['b', [1]], ['a', [12]], ['b', [1]],
      ['a', [12]], ['b', [1]], ['a', [12]], ['b', [1]], ['a', [2]],
    ])
    expect(seriesStandings([won])[0].wins).toBe(1)
    expect(seriesStandings([won])[1].wins).toBe(0)
  })
})

describe('gamesOfSeries', () => {
  it('同じセットのゲームだけをゲーム番号順に返す', () => {
    const other = { ...game(1, []), id: 'x', seriesId: 's2' }
    const list = gamesOfSeries([game(2, []), other, game(1, [])], 's1')
    expect(list.map((item) => item.gameNumber)).toEqual([1, 2])
  })
})
