import { describe, expect, it } from 'vitest'
import { DEFAULT_RULES } from './rules'
import { outcomeOf } from './outcome'
import type { Game, ThrowRecord } from './types'

const gameWith = (throws: [string, number[]][]): Game => ({
  id: 'g',
  createdAt: 0,
  finishedAt: null,
  rules: DEFAULT_RULES,
  entries: [
    { id: 'a', name: 'A', memberIds: ['ma'], handicap: 0 },
    { id: 'b', name: 'B', memberIds: ['mb'], handicap: 0 },
  ],
  throws: throws.map(
    ([entryId, pins], index): ThrowRecord => ({ entryId, memberId: `m${entryId}`, pins, at: index }),
  ),
  seriesId: 's',
  gameNumber: 1,
  timeUpAt: null,
  shootoutWinnerId: null,
  tournamentId: null,
  matchId: null,
})

describe('1 投の結果', () => {
  it('得点・ミス・超過・決着を見分ける', () => {
    expect(outcomeOf(gameWith([]), [7])).toBe('score')
    expect(outcomeOf(gameWith([]), [])).toBe('miss')
    // A は 48 点。12 を倒すと 60 になり超過
    const at48: [string, number[]][] = [
      ['a', [12]], ['b', [1]], ['a', [12]], ['b', [1]], ['a', [12]], ['b', [1]], ['a', [12]], ['b', [1]],
    ]
    expect(outcomeOf(gameWith(at48), [12])).toBe('overshoot')
    expect(outcomeOf(gameWith(at48), [2])).toBe('win')
  })

  it('3 回続けてミスすると失格', () => {
    const twoMisses: [string, number[]][] = [['a', []], ['b', [1]], ['a', []], ['b', [1]]]
    expect(outcomeOf(gameWith(twoMisses), [])).toBe('eliminated')
  })
})
