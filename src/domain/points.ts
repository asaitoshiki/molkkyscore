import { computeGameState } from './game'
import type { Game } from './types'

/**
 * ゲームの順位に応じて配るポイント（ポイント制の大会）。
 * 例：50 点ちょうどで上がって 1 位なら 10P、15 ターンや時間切れで点数が一番高くて 1 位なら 8P、
 * 2 位 6P、3 位 2P
 */
export type PointRules = {
  /** 目標点ちょうどで上がって 1 位 */
  targetWin: number
  /** ターン制限・時間切れで、点数が一番高くて 1 位 */
  cutoffWin: number
  /** 2 位、3 位…のポイント。書いていない順位は 0 */
  places: number[]
}

export const DEFAULT_POINT_RULES: PointRules = { targetWin: 10, cutoffWin: 8, places: [6, 2] }

/**
 * ゲームの中の順位。上がった組を 1 位に、残りは点数の高い順。同じ点数は同じ順位にする。
 * 失格した組は 0 点として扱われるので、自然に下になる
 */
export const gamePlaces = (game: Game): Record<string, number> => {
  const state = computeGameState(game)
  const keyOf = (entry: (typeof state.entries)[number]) => [
    Number(entry.entryId === state.winnerEntryId),
    entry.score,
  ]
  const ahead = (a: number[], b: number[]) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])
  return Object.fromEntries(
    state.entries.map((entry) => [
      entry.entryId,
      1 + state.entries.filter((other) => ahead(keyOf(other), keyOf(entry))).length,
    ]),
  )
}

/** 1 ゲームで各組が取ったポイント */
export const gamePoints = (game: Game, rules: PointRules): Record<string, number> => {
  const state = computeGameState(game)
  const places = gamePlaces(game)
  // 1 位は上がり方で変わる。上がった組（相手が全員失格した場合も含む）は目標点ちょうどになっている
  const reachedTarget = state.entries.some(
    (entry) => entry.entryId === state.winnerEntryId && entry.score === game.rules.targetScore,
  )
  const firstPlace = reachedTarget ? rules.targetWin : rules.cutoffWin
  return Object.fromEntries(
    Object.entries(places).map(([entryId, place]) => [
      entryId,
      place === 1 ? firstPlace : (rules.places[place - 2] ?? 0),
    ]),
  )
}

/** 試合（セット）全体のポイント。出なかったゲームは数えない */
export const seriesPoints = (games: Game[], rules: PointRules): Record<string, number> =>
  games
    .map((game) => gamePoints(game, rules))
    .reduce<Record<string, number>>((sum, points) => {
      Object.entries(points).forEach(([entryId, value]) => (sum[entryId] = (sum[entryId] ?? 0) + value))
      return sum
    }, {})
