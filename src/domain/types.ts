// アプリ全体で共有するデータ構造。永続化される形そのままなので後方互換に注意する。

/** 登録メンバー（個人）。ゲスト参加者もここに登録される。 */
export type Member = {
  id: string
  name: string
  createdAt: number
}

/** 試合の参加単位。個人戦は memberIds が 1 人、チーム戦は複数人。 */
export type Entry = {
  id: string
  name: string
  memberIds: string[]
}

/** 1 投の記録。pins は倒したスキットルの番号で、空配列がミス。 */
export type ThrowRecord = {
  entryId: string
  memberId: string
  pins: number[]
  at: number
}

/** 試合ルール。公式ルールを既定値としつつ変更できるようにしている。 */
export type GameRules = {
  targetScore: number
  penaltyScore: number
  maxMisses: number
}

export type Game = {
  id: string
  createdAt: number
  finishedAt: number | null
  rules: GameRules
  entries: Entry[]
  throws: ThrowRecord[]
  /** 大会の一戦として作られた場合のみ紐付く */
  tournamentId: string | null
  matchId: string | null
}

export type TournamentFormat = 'roundRobin' | 'knockout'

/** 大会の 1 試合。gameId が入ると実際のスコア記録に紐付く。 */
export type TournamentMatch = {
  id: string
  round: number
  order: number
  entryIds: (string | null)[]
  gameId: string | null
  winnerEntryId: string | null
}

export type Tournament = {
  id: string
  name: string
  format: TournamentFormat
  createdAt: number
  rules: GameRules
  entries: Entry[]
  matches: TournamentMatch[]
}

/** 的当て練習の 1 セッション。狙ったスキットルに対する結果を並べる。 */
export type PracticeSession = {
  id: string
  memberId: string
  targetPin: number
  distance: number
  results: boolean[]
  createdAt: number
}
