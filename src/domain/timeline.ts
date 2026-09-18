import { advanceScore, pointsOf } from './rules'
import type { Game, ThrowRecord } from './types'

/** 投球 1 件を、その時点の文脈込みで表したもの。訂正と巻き戻しの画面で使う。 */
export type TimelineItem = {
  index: number
  record: ThrowRecord
  /** その組にとって何投目か */
  round: number
  points: number
  /** この投を終えた時点のその組の合計 */
  totalAfter: number
}

/** 記録を古い順に並べ、各投の時点での得点を添える。 */
export const buildTimeline = (game: Game): TimelineItem[] => {
  const totals = new Map(game.entries.map((entry) => [entry.id, 0]))
  const counts = new Map(game.entries.map((entry) => [entry.id, 0]))

  return game.throws.map((record, index) => {
    const points = pointsOf(record.pins)
    const totalAfter = advanceScore(totals.get(record.entryId)!, points, game.rules)
    const round = counts.get(record.entryId)! + 1
    totals.set(record.entryId, totalAfter)
    counts.set(record.entryId, round)
    return { index, record, round, points, totalAfter }
  })
}
