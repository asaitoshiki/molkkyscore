import { computeGameState } from './game'
import { pointsOf } from './rules'
import type { Game } from './types'

/** 1 投の結果。合図の文字と効果音を選ぶのに使う */
export type ThrowOutcome = 'win' | 'eliminated' | 'miss' | 'overshoot' | 'score'

/**
 * いまの手番の組が pins を倒したら、どういう結果になるか。
 * 実際に記録へ足したときと同じ計算で求めるので、判定が食い違わない。
 */
export const outcomeOf = (game: Game, pins: number[]): ThrowOutcome => {
  const before = computeGameState(game)
  const entryId = before.currentEntryId!
  const after = computeGameState({
    ...game,
    throws: [...game.throws, { entryId, memberId: before.currentMemberId!, pins, at: 0 }],
  })
  const was = before.entries.find((entry) => entry.entryId === entryId)!
  const now = after.entries.find((entry) => entry.entryId === entryId)!

  if (after.winnerEntryId === entryId) return 'win'
  if (now.eliminated && !was.eliminated) return 'eliminated'
  if (pins.length === 0) return 'miss'
  if (was.score + pointsOf(pins) > game.rules.targetScore) return 'overshoot'
  return 'score'
}
