import { describe, expect, it } from 'vitest'
import { computeGameState } from './game'
import { DEFAULT_RULES } from './rules'
import { buildScoreSheet } from './scoresheet'
import { rankStandings, seriesStandings } from './series'
import type { Game } from './types'

/** 投球を [組, 倒した点] の並びで書く。0 はミス。1 本倒しなら点数がそのままピン番号になる */
const gameOf = (throws: [string, number][], entryIds = ['a', 'b'], gameNumber = 1): Game => ({
  id: `g${gameNumber}`,
  createdAt: 0,
  finishedAt: null,
  rules: DEFAULT_RULES,
  entries: entryIds.map((id) => ({ id, name: id.toUpperCase(), memberIds: [`m${id}`], handicap: 0 })),
  throws: throws.map(([entryId, points], index) => ({
    entryId,
    memberId: `m${entryId}`,
    pins: points === 0 ? [] : [points],
    at: index,
  })),
  seriesId: 's',
  gameNumber,
  tournamentId: null,
  matchId: null,
})

// 公式スコアシートの記入例・1st set（TeamA 先攻、TeamB 後攻）
const officialFirstSet = gameOf([
  ['a', 12], ['b', 7],
  ['a', 8], ['b', 8],
  ['a', 0], ['b', 8],
  ['a', 11], ['b', 0],
  ['a', 12], ['b', 0],
  ['a', 12], ['b', 10],
  ['a', 9], ['b', 0],
  ['a', 0], ['b', 2],
  ['a', 0], ['b', 3],
  ['a', 0],
])

describe('公式スコアシートの記入例と同じ結果になる', () => {
  it('3 ミスで失格した組は 0 点、相手は 50 点で勝つ', () => {
    const state = computeGameState(officialFirstSet)
    expect(state.winnerEntryId).toBe('b')
    expect(state.entries.map((entry) => entry.score)).toEqual([0, 50])
  })

  it('スコアシートの合計欄も記入例と同じ（50 超えは 25、失格の投球は 0）', () => {
    const [a, b] = buildScoreSheet(officialFirstSet).rows
    expect(a.cells.map((cell) => cell.total)).toEqual([12, 20, 20, 31, 43, 25, 34, 34, 34, 0])
    expect(b.cells.map((cell) => cell.total)).toEqual([7, 15, 23, 23, 23, 33, 33, 35, 38])
    expect([a.final, b.final]).toEqual([0, 50])
  })

  it('3 チーム以上なら、失格した組だけ 0 点になり、残りの組で続ける', () => {
    const state = computeGameState(
      gameOf(
        [['a', 0], ['b', 5], ['c', 7], ['a', 0], ['b', 5], ['c', 7], ['a', 0]],
        ['a', 'b', 'c'],
      ),
    )
    expect(state.finished).toBe(false)
    expect(state.entries.map((entry) => entry.score)).toEqual([0, 10, 14])
    expect(state.currentEntryId).toBe('b')
  })

  it('順位は勝ったゲーム数が先、同じなら合計点', () => {
    // A は 1 ゲーム目を 50 点で勝ち、2 ゲーム目は 48 点で負け。B は 13 点と 50 点
    const first = gameOf([['a', 12], ['b', 10], ['a', 12], ['b', 1], ['a', 12], ['b', 1], ['a', 12], ['b', 1], ['a', 2]])
    const second = gameOf(
      [['b', 12], ['a', 12], ['b', 12], ['a', 12], ['b', 12], ['a', 12], ['b', 12], ['a', 12], ['b', 2]],
      ['b', 'a'],
      2,
    )
    const ranked = rankStandings(seriesStandings([first, second]))
    expect(ranked.map((standing) => [standing.entry.id, standing.wins, standing.total])).toEqual([
      ['a', 1, 98],
      ['b', 1, 63],
    ])
  })
})
