import { describe, expect, it } from 'vitest'
import { DEFAULT_POINT_RULES, gamePlaces, gamePoints, seriesPoints } from './points'
import { DEFAULT_RULES } from './rules'
import type { Game } from './types'

/** 4 チームのゲーム。throws は [チーム, 倒した点] を投げた順に並べる */
const gameOf = (throws: [string, number][], patch: Partial<Game['rules']> = {}): Game => ({
  id: 'g',
  createdAt: 0,
  finishedAt: null,
  rules: { ...DEFAULT_RULES, gameCount: 1, ...patch },
  entries: ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id, memberIds: [id], handicap: 0 })),
  throws: throws.map(([entryId, points], index) => ({
    entryId,
    memberId: entryId,
    pins: points === 0 ? [] : [points],
    at: index,
  })),
  seriesId: 's',
  gameNumber: 1,
  timeUpAt: null,
  shootoutWinnerId: null,
  tournamentId: null,
  matchId: null,
})

/** 1 巡で a, b, c, d がこの点を取る */
const round = (a: number, b: number, c: number, d: number): [string, number][] => [
  ['a', a],
  ['b', b],
  ['c', c],
  ['d', d],
]

describe('ポイント制', () => {
  it('50 点ちょうどで上がった 1 位は 10P、2 位 6P、3 位 2P、4 位 0P', () => {
    // a が 4 巡目で 50 点に上がる。b 36 点、c 24 点、d 12 点
    const game = gameOf([
      ...round(12, 12, 8, 4),
      ...round(12, 12, 8, 4),
      ...round(12, 12, 8, 4),
      ['a', 12],
      ['b', 0],
      ['c', 0],
      ['d', 0],
      ['a', 2],
    ])
    expect(gamePoints(game, DEFAULT_POINT_RULES)).toEqual({ a: 10, b: 6, c: 2, d: 0 })
  })

  it('ターン制限で打ち切ったら、点数が一番高い組の 1 位は 8P', () => {
    const game = gameOf([...round(12, 10, 8, 1), ...round(12, 10, 8, 1)], { maxTurns: 2 })
    expect(gamePoints(game, DEFAULT_POINT_RULES)).toEqual({ a: 8, b: 6, c: 2, d: 0 })
  })

  it('同じ点数は同じ順位になり、同じポイントを取る', () => {
    const game = gameOf([...round(12, 5, 5, 1), ...round(12, 5, 5, 1)], { maxTurns: 2 })
    expect(gamePlaces(game)).toEqual({ a: 1, b: 2, c: 2, d: 4 })
    expect(gamePoints(game, DEFAULT_POINT_RULES)).toEqual({ a: 8, b: 6, c: 6, d: 0 })
  })

  it('試合のポイントはゲームごとのポイントの合計', () => {
    const first = gameOf([...round(12, 10, 8, 1)], { maxTurns: 1 })
    const second = { ...gameOf([...round(1, 8, 10, 12)], { maxTurns: 1 }), id: 'g2', gameNumber: 2 }
    expect(seriesPoints([first, second], DEFAULT_POINT_RULES)).toEqual({ a: 8, b: 8, c: 8, d: 8 })
  })
})
