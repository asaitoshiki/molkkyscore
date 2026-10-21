import { computeGameState } from './game'
import type { GameState } from './game'
import type { DecideBy, Entry, Game, NextOrder } from './types'

/** セット全体での 1 組の成績。ゲームごとの得点と、その合計。 */
export type SeriesStanding = {
  entry: Entry
  /** 出なかったゲーム（最終ゲームを勝った組だけで行うときなど）は null */
  perGame: (number | null)[]
  total: number
  wins: number
  /** 時間切れで点が並んで終わったゲームの数 */
  draws: number
}

/** 同じセットに属するゲームをゲーム番号順に取り出す。 */
export const gamesOfSeries = (games: Game[], seriesId: string): Game[] =>
  games
    .filter((game) => game.seriesId === seriesId)
    .sort((a, b) => a.gameNumber - b.gameNumber)

const scoreOf = (state: GameState, entryId: string): number | null =>
  state.entries.find((item) => item.entryId === entryId)?.score ?? null

/** 勝者なしで終わったゲームでは、いちばん点の高い組どうしが引き分け */
const drew = (state: GameState, entryId: string) =>
  state.finished &&
  state.winnerEntryId === null &&
  scoreOf(state, entryId) === Math.max(...state.entries.map((item) => item.score))

/**
 * 公式スコアシートと同じ「ゲームごとの得点＋合計」の形に集計する。
 * 参加者はセットを通して変わらないため、最初のゲームの並びを基準にする。
 */
export const seriesStandings = (seriesGames: Game[]): SeriesStanding[] => {
  const base = seriesGames[0]
  const states = seriesGames.map(computeGameState)

  return base.entries.map((entry) => {
    const perGame = states.map((state) => scoreOf(state, entry.id))
    return {
      entry,
      perGame,
      total: perGame.reduce((sum: number, score) => sum + (score ?? 0), 0),
      wins: states.filter((state) => state.winnerEntryId === entry.id).length,
      draws: states.filter((state) => drew(state, entry.id)).length,
    }
  })
}

const byWins = (a: SeriesStanding, b: SeriesStanding) =>
  b.wins - a.wins || b.draws - a.draws || b.total - a.total

/**
 * 順位の比べ方。wins と race は公式どおり勝ったゲーム数 → 引き分け → 合計点、
 * total は 100 点ゲームのように合計点を先に比べる。
 */
const COMPARE: Record<DecideBy, (a: SeriesStanding, b: SeriesStanding) => number> = {
  wins: byWins,
  total: (a, b) => b.total - a.total || b.wins - a.wins || b.draws - a.draws,
  race: byWins,
}

/**
 * 試合が決着したか（時間切れを除く）。standings は順位の並び、played は終えたゲーム数。
 * wins は決めたゲーム数を終えたか、残りを全部取っても追いつけないとき。
 * race は誰かが決めた数のゲームを取ったとき。チームが多いと何ゲームでも続く
 */
const SETTLED: Record<DecideBy, (standings: SeriesStanding[], played: number, count: number) => boolean> = {
  wins: ([first, second], played, count) =>
    played >= count || first.wins > second.wins + (count - played),
  total: (_, played, count) => played >= count,
  race: ([first], _, count) => first.wins >= count,
}

export const rankStandings = (
  standings: SeriesStanding[],
  decideBy: DecideBy,
): SeriesStanding[] => [...standings].sort(COMPARE[decideBy])

export type SeriesResult = {
  /** 順位の並び */
  standings: SeriesStanding[]
  /** 決めたゲーム数を終えた、勝ち数で決着が付いた、または時間切れで打ち切った */
  finished: boolean
  /** 終わったときに首位で並んだ組。2 組以上ならモルックアウトで決める */
  leaders: Entry[]
  /** 決着が付いていなければ null */
  winnerEntryId: string | null
}

/** 試合（セット）全体の勝敗。ゲーム数を決めていない試合は終わらない。 */
export const seriesResult = (seriesGames: Game[]): SeriesResult => {
  const last = seriesGames.at(-1)!
  const { gameCount, decideBy } = last.rules
  const standings = rankStandings(seriesStandings(seriesGames), decideBy)
  const [first] = standings

  const finished =
    gameCount !== null &&
    computeGameState(last).finished &&
    (last.timeUpAt !== null || SETTLED[decideBy](standings, seriesGames.length, gameCount))
  const leaders = standings
    .filter((standing) => COMPARE[decideBy](first, standing) === 0)
    .map((standing) => standing.entry)
  // 首位が並んだときはモルックアウトで選ばれた組を勝者にする
  const decided = leaders.length === 1 ? leaders[0].id : last.shootoutWinnerId

  return {
    standings,
    finished,
    leaders,
    winnerEntryId: finished ? decided : null,
  }
}

/** 続きのゲームの投げる順番。前のゲームの並びと点数から決める */
const NEXT_ORDER: Record<NextOrder, (previous: Game) => Entry[]> = {
  reverse: (previous) => [...previous.entries].reverse(),
  same: (previous) => previous.entries,
  loserFirst: (previous) => {
    const state = computeGameState(previous)
    return [...previous.entries].sort((a, b) => scoreOf(state, a.id)! - scoreOf(state, b.id)!)
  },
}

/**
 * 最終ゲームに出られるチームの見分け方。wins は勝ったゲーム数、played は終えたゲーム数、count は決めた数。
 * 決めたゲーム数で行う形は、最後のゲームをそれまでにゲームを取ったチームで行う。
 * 先取は、あと 1 ゲーム取れば勝ちのチームどうしで行う（兵庫の「3 セット目はセットを取った人同士」）
 */
const FINALIST: Record<DecideBy, (wins: number, played: number, count: number) => boolean> = {
  wins: (wins, played, count) => played + 1 === count && wins > 0,
  total: (wins, played, count) => played + 1 === count && wins > 0,
  race: (wins, _, count) => wins === count - 1,
}

/**
 * 続きのゲームに出る組と投げる順番。
 * 最終ゲームを勝った組だけで行う決まりなら、出られる組に絞る
 */
export const nextEntries = (seriesGames: Game[]): Entry[] => {
  const previous = seriesGames.at(-1)!
  const ordered = NEXT_ORDER[previous.rules.nextOrder](previous)
  if (!previous.rules.finalAmongWinners) return ordered

  const { decideBy, gameCount } = previous.rules
  const winsOf = (entryId: string) =>
    seriesGames.filter((game) => computeGameState(game).winnerEntryId === entryId).length
  const finalists = ordered.filter((entry) =>
    FINALIST[decideBy](winsOf(entry.id), seriesGames.length, gameCount ?? Infinity),
  )
  // 出られる組が 1 組以下なら絞りようがないので、全員で行う
  return finalists.length >= 2 ? finalists : ordered
}
