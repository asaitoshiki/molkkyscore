import { describe, expect, it } from 'vitest'
import { buildTimeline } from './timeline'
import { DEFAULT_RULES } from './rules'
import type { Game } from './types'

const game = (throwsSpec: [string, number[]][]): Game => ({
  id: 'g1',
  createdAt: 0,
  finishedAt: null,
  rules: DEFAULT_RULES,
  entries: [
    { id: 'a', name: 'A', memberIds: ['m1'] },
    { id: 'b', name: 'B', memberIds: ['m2'] },
  ],
  throws: throwsSpec.map(([entryId, pins], index) => ({
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

describe('buildTimeline', () => {
  it('投球ごとに、その組にとって何投目かと投了時点の合計を添える', () => {
    const timeline = buildTimeline(game([['a', [10]], ['b', [4]], ['a', [5]]]))
    expect(timeline.map((item) => item.round)).toEqual([1, 1, 2])
    expect(timeline.map((item) => item.totalAfter)).toEqual([10, 4, 15])
  })

  it('50 点を超えた投球は合計が罰則点に戻る', () => {
    const timeline = buildTimeline(game([['a', [12]], ['a', [12]], ['a', [12]], ['a', [12]], ['a', [12]]]))
    expect(timeline.at(-1)!.totalAfter).toBe(25)
  })

  it('ミスは 0 点として並ぶ', () => {
    expect(buildTimeline(game([['a', []]]))[0].points).toBe(0)
  })
})
