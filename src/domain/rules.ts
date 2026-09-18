import type { GameRules } from './types'

/** 公式ルールの既定値 */
export const DEFAULT_RULES: GameRules = {
  targetScore: 50,
  penaltyScore: 25,
  maxMisses: 3,
}

/** スキットルの番号（1〜12） */
export const PIN_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1)

/**
 * 公式の初期配置。手前の列から順に並べた 2 次元配列。
 * 倒れたスキットルは倒れた位置で立て直すため、これは第 1 投前だけの形。
 */
export const INITIAL_FORMATION: number[][] = [
  [1, 2],
  [3, 10, 4],
  [5, 11, 12, 6],
  [7, 9, 8],
]

/** 1 本だけ倒したらその番号、2 本以上なら倒した本数が得点になる。 */
export const pointsOf = (pins: number[]): number =>
  pins.length === 1 ? pins[0] : pins.length

/** 目標点を超えた場合は罰則点まで戻される。 */
export const advanceScore = (current: number, points: number, rules: GameRules): number => {
  const total = current + points
  return total > rules.targetScore ? rules.penaltyScore : total
}

/** 1 投で取りうる最大得点（残り点数の目安表示に使う） */
export const MAX_POINTS_PER_THROW = 12
