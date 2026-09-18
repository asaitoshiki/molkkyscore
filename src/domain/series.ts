import { computeGameState } from './game'
import type { Entry, Game } from './types'

/** セット全体での 1 組の成績。ゲームごとの得点と、その合計。 */
export type SeriesStanding = {
  entry: Entry
  perGame: number[]
  total: number
  wins: number
}

/** 同じセットに属するゲームをゲーム番号順に取り出す。 */
export const gamesOfSeries = (games: Game[], seriesId: string): Game[] =>
  games
    .filter((game) => game.seriesId === seriesId)
    .sort((a, b) => a.gameNumber - b.gameNumber)

/**
 * 公式スコアシートと同じ「ゲームごとの得点＋合計」の形に集計する。
 * 参加者はセットを通して変わらないため、最初のゲームの並びを基準にする。
 */
export const seriesStandings = (seriesGames: Game[]): SeriesStanding[] => {
  const base = seriesGames[0]
  const states = seriesGames.map(computeGameState)

  return base.entries.map((entry) => {
    const perGame = states.map(
      (state) => state.entries.find((item) => item.entryId === entry.id)?.score ?? 0,
    )
    return {
      entry,
      perGame,
      total: perGame.reduce((sum, score) => sum + score, 0),
      wins: states.filter((state) => state.winnerEntryId === entry.id).length,
    }
  })
}
