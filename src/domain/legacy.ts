import { newId } from './id'
import { DEFAULT_RULES } from './rules'
import type { Entry, Game, GameRules } from './types'

/** 古い版で作られた試合。あとから足した項目が欠けている */
export type LegacyGame = Omit<Game, 'seriesId' | 'gameNumber' | 'timeUpAt' | 'shootoutWinnerId'> &
  Partial<Pick<Game, 'seriesId' | 'gameNumber' | 'timeUpAt' | 'shootoutWinnerId'>> & {
    entries: (Omit<Entry, 'handicap'> & { handicap?: number })[]
    rules: Partial<GameRules>
  }

export const withHandicap = (entries: LegacyGame['entries']): Entry[] =>
  entries.map((entry) => ({ ...entry, handicap: entry.handicap ?? 0 }))

/** ルールの欠けた項目を補う。以前の大会の一戦は 1 ゲームで勝敗を決めていた */
export const withRules = (rules: Partial<GameRules>, gameCount: number | null): GameRules => ({
  ...DEFAULT_RULES,
  gameCount,
  ...rules,
})

/**
 * 古い版の試合に、あとから増えた項目を補う。
 * 端末に保存された記録の移行と、古い版のアプリから届いた観戦データの両方で使う。
 */
export const withGameDefaults = (game: LegacyGame): Game => ({
  ...game,
  seriesId: game.seriesId ?? newId(),
  gameNumber: game.gameNumber ?? 1,
  entries: withHandicap(game.entries),
  rules: withRules(game.rules, game.tournamentId === null ? null : 1),
  timeUpAt: game.timeUpAt ?? null,
  shootoutWinnerId: game.shootoutWinnerId ?? null,
})
