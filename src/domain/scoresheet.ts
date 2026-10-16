import { computeGameState } from './game'
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
  /** このゲームの得点。失格は 0、相手の失格で勝った組は 50 になる */
  final: number
}

export type ScoreSheet = {
  rounds: number
  rows: SheetRow[]
}

/** 投球記録を参加者 × ラウンドの表に組み直す。画像化と一覧表示の両方で使う。 */
export const buildScoreSheet = (game: Game): ScoreSheet => {
  const state = computeGameState(game)
  const finalOf = new Map(state.entries.map((entry) => [entry.entryId, entry.score]))
  const rows = new Map<string, SheetRow>(
    game.entries.map((entry) => [entry.id, { entry, cells: [], final: finalOf.get(entry.id)! }]),
  )
  const misses = new Map(game.entries.map((entry) => [entry.id, 0]))

  for (const record of game.throws) {
    const row = rows.get(record.entryId)!
    const points = pointsOf(record.pins)
    const previous = row.cells.at(-1)?.total ?? row.entry.handicap
    misses.set(record.entryId, points === 0 ? misses.get(record.entryId)! + 1 : 0)
    // 3 回目のミスで失格した投球は、公式の記入どおり合計を 0 と書く
    const eliminated = misses.get(record.entryId)! >= game.rules.maxMisses
    const total = eliminated ? 0 : advanceScore(previous, points, game.rules)
    row.cells.push({ pins: record.pins, points, total })
  }

  const list = [...rows.values()]
  return { rounds: Math.max(0, ...list.map((row) => row.cells.length)), rows: list }
}
