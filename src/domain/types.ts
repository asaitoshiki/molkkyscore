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
  /** 持ち点。力の差を埋めるため、この点から始める */
  handicap: number
}

/** 1 投の記録。pins は倒したスキットルの番号で、空配列がミス。 */
export type ThrowRecord = {
  entryId: string
  memberId: string
  pins: number[]
  at: number
}

/**
 * 試合の勝敗の決め方。wins は決めたゲーム数を行って勝ったゲーム数を先に比べ、
 * total は合計点だけで比べる。race は先に決めた数のゲームを取ったチームの勝ち（2 ゲーム先取など）
 */
export type DecideBy = 'wins' | 'total' | 'race'

/** 2 ゲーム目以降の投げる順番。reverse は前のゲームの逆順、loserFirst は点の低い組から */
export type NextOrder = 'reverse' | 'same' | 'loserFirst'

/**
 * 試合ルール。公式ルールを既定値としつつ、大会ごとの決まりに合わせて変えられる。
 * 1 ゲームの決まりと、何ゲームで勝敗を決めるかの両方を持ち、続きのゲームにも引き継ぐ。
 */
export type GameRules = {
  targetScore: number
  penaltyScore: number
  maxMisses: number
  /**
   * 試合のゲーム数。null は決めずに続けたいだけ続ける。
   * 先取（race）のときは、先に取ったら勝ちになるゲーム数で、決まるまで何ゲームでも続ける
   */
  gameCount: number | null
  decideBy: DecideBy
  nextOrder: NextOrder
  /** 試合の制限時間（分）。null は時間を決めない */
  timeLimitMinutes: number | null
  /** 1 ゲームのターン数の上限。全員が投げ終えたらその時点の点数で決める。null は上限なし */
  maxTurns: number | null
  /** 最終ゲームは、それまでにゲームを取った組だけで行う（3 人対戦の 3 セット目など） */
  finalAmongWinners: boolean
}

export type Game = {
  id: string
  createdAt: number
  finishedAt: number | null
  rules: GameRules
  entries: Entry[]
  throws: ThrowRecord[]
  /** 同じ顔ぶれで続けて戦うゲーム群（セット）。単発の試合でも必ず 1 つ作る */
  seriesId: string
  /** セット内の何ゲーム目か。1 始まり */
  gameNumber: number
  /** 時間切れで打ち切った時刻。打ち切ったゲームはその時点の点数で勝敗を決める */
  timeUpAt: number | null
  /** 試合の最後に首位が並び、モルックアウトで勝った組 */
  shootoutWinnerId: string | null
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
