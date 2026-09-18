import { advanceScore, pointsOf } from './rules'
import type { Entry, Game } from './types'

/** 1 投分のマス。倒したピン、その投の得点、投げ終えた時点の合計。 */
export type SheetCell = {
  pins: number[]
  points: number
  total: number
}

export type SheetRow = {
  entry: Entry
  cells: SheetCell[]
}

export type ScoreSheet = {
  rounds: number
  rows: SheetRow[]
}

/** 投球記録を参加者 × ラウンドの表に組み直す。画像化と一覧表示の両方で使う。 */
export const buildScoreSheet = (game: Game): ScoreSheet => {
  const rows = new Map<string, SheetRow>(
    game.entries.map((entry) => [entry.id, { entry, cells: [] }]),
  )

  for (const record of game.throws) {
    const row = rows.get(record.entryId)!
    const points = pointsOf(record.pins)
    const previous = row.cells.at(-1)?.total ?? 0
    row.cells.push({ pins: record.pins, points, total: advanceScore(previous, points, game.rules) })
  }

  const list = [...rows.values()]
  return { rounds: Math.max(0, ...list.map((row) => row.cells.length)), rows: list }
}
