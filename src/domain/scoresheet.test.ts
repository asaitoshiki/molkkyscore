import { describe, expect, it } from 'vitest'
import { buildScoreSheet } from './scoresheet'
import { DEFAULT_RULES } from './rules'
import type { Game } from './types'

const game = (pinsByThrow: [string, number[]][]): Game => ({
  id: 'g1',
  createdAt: 0,
  finishedAt: null,
  rules: DEFAULT_RULES,
  entries: [
    { id: 'a', name: 'A', memberIds: ['m1'] },
    { id: 'b', name: 'B', memberIds: ['m2'] },
  ],
  throws: pinsByThrow.map(([entryId, pins], index) => ({
    entryId,
    memberId: entryId === 'a' ? 'm1' : 'm2',
    pins,
    at: index,
  })),
  tournamentId: null,
  matchId: null,
})

describe('buildScoreSheet', () => {
  it('参加者ごとに投球を並べ、合計を積み上げる', () => {
    const sheet = buildScoreSheet(game([['a', [12]], ['b', [3]], ['a', [5]]]))
    expect(sheet.rows[0].cells.map((cell) => cell.total)).toEqual([12, 17])
    expect(sheet.rows[1].cells.map((cell) => cell.total)).toEqual([3])
  })

  it('ラウンド数は最も多く投げた人に合わせる', () => {
    expect(buildScoreSheet(game([['a', [1]], ['b', [1]], ['a', [1]]])).rounds).toBe(2)
  })

  it('50 点を超えた投球は合計が 25 点に戻る', () => {
    const rows = buildScoreSheet(
      game([['a', [12]], ['a', [12]], ['a', [12]], ['a', [12]], ['a', [12]]]),
    ).rows
    expect(rows[0].cells.map((cell) => cell.total)).toEqual([12, 24, 36, 48, 25])
  })

  it('投球がなければラウンドは 0', () => {
    expect(buildScoreSheet(game([])).rounds).toBe(0)
  })
})
