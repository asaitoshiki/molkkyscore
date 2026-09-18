import { describe, expect, it } from 'vitest'
import { computeGameState } from './game'
import { DEFAULT_RULES, advanceScore, pointsOf } from './rules'
import type { Game, ThrowRecord } from './types'

const gameWith = (throwsSpec: [string, number[]][]): Game => ({
  id: 'g1',
  createdAt: 0,
  finishedAt: null,
  rules: DEFAULT_RULES,
  entries: [
    { id: 'a', name: 'A', memberIds: ['m1'] },
    { id: 'b', name: 'B', memberIds: ['m2'] },
  ],
  throws: throwsSpec.map<ThrowRecord>(([entryId, pins], index) => ({
    entryId,
    memberId: entryId === 'a' ? 'm1' : 'm2',
    pins,
    at: index,
  })),
  seriesId: 's1',
  gameNumber: 1,
  tournamentId: null,
  matchId: null,
})

/** 交互に投げる記録を組み立てる */
const alternating = (pinsList: number[][]): [string, number[]][] =>
  pinsList.map((pins, index) => [index % 2 === 0 ? 'a' : 'b', pins])

describe('pointsOf', () => {
  it('1 本だけ倒したらそのスキットルの番号が得点', () => {
    expect(pointsOf([12])).toBe(12)
  })

  it('2 本以上倒したら倒した本数が得点', () => {
    expect(pointsOf([12, 11, 10])).toBe(3)
  })

  it('1 本も倒さなければ 0 点', () => {
    expect(pointsOf([])).toBe(0)
  })
})

describe('advanceScore', () => {
  it('50 を超えたら 25 に戻される', () => {
    expect(advanceScore(45, 12, DEFAULT_RULES)).toBe(25)
  })

  it('ちょうど 50 は超過扱いにならない', () => {
    expect(advanceScore(38, 12, DEFAULT_RULES)).toBe(50)
  })
})

describe('computeGameState', () => {
  it('初期状態は 0 点で先頭の参加者の番', () => {
    const state = computeGameState(gameWith([]))
    expect(state.entries.map((entry) => entry.score)).toEqual([0, 0])
    expect(state.currentEntryId).toBe('a')
    expect(state.round).toBe(1)
  })

  it('投げると手番が次の参加者に移る', () => {
    const state = computeGameState(gameWith([['a', [7]]]))
    expect(state.currentEntryId).toBe('b')
    expect(state.entries[0].score).toBe(7)
  })

  it('ちょうど 50 点に到達した参加者が勝ち', () => {
    const state = computeGameState(
      gameWith(alternating([[12], [1], [12], [1], [12], [1], [12], [1], [2], [1]])),
    )
    expect(state.entries[0].score).toBe(50)
    expect(state.winnerEntryId).toBe('a')
    expect(state.finished).toBe(true)
    expect(state.currentEntryId).toBeNull()
  })

  it('3 回連続でミスすると失格し、残った参加者が勝つ', () => {
    const state = computeGameState(gameWith(alternating([[], [5], [], [5], [], [5]])))
    expect(state.entries[0].eliminated).toBe(true)
    expect(state.winnerEntryId).toBe('b')
  })

  it('間で 1 本でも倒せば連続ミスは 0 に戻る', () => {
    const state = computeGameState(gameWith(alternating([[], [5], [], [5], [3], [5], [], [5]])))
    expect(state.entries[0].consecutiveMisses).toBe(1)
    expect(state.entries[0].eliminated).toBe(false)
  })

  it('失格した参加者は手番を飛ばされる', () => {
    const game = gameWith(alternating([[], [5], [], [5], [], [5]]))
    game.entries.push({ id: 'c', name: 'C', memberIds: ['m3'] })
    const state = computeGameState(game)
    expect(state.entries[0].eliminated).toBe(true)
    expect(state.currentEntryId).toBe('c')
  })

  it('ラウンドは全員が投げ終わると進む', () => {
    expect(computeGameState(gameWith([['a', [3]]])).round).toBe(1)
    expect(computeGameState(gameWith(alternating([[3], [3]]))).round).toBe(2)
  })

  it('チーム戦では投げるメンバーがローテーションする', () => {
    const game = gameWith([])
    game.entries[0].memberIds = ['m1', 'm1b']
    expect(computeGameState(game).currentMemberId).toBe('m1')

    game.throws.push({ entryId: 'a', memberId: 'm1', pins: [4], at: 1 })
    game.throws.push({ entryId: 'b', memberId: 'm2', pins: [4], at: 2 })
    expect(computeGameState(game).currentMemberId).toBe('m1b')
  })
})
