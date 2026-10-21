import type { DecideBy, GameRules } from './types'

/** よく使われる試合の形。選ぶとゲーム数と勝敗の決め方がまとめて入る */
export type FormatPreset = {
  label: string
  note: string
  gameCount: number | null
  decideBy: DecideBy
}

const OPEN: FormatPreset = {
  label: '自由',
  note: 'ゲーム数を決めずに、続けたいだけ続ける',
  gameCount: null,
  decideBy: 'wins',
}

const FIXED: FormatPreset[] = [
  { label: '1 ゲーム', note: '1 ゲームで勝敗を決める', gameCount: 1, decideBy: 'wins' },
  {
    label: '2 ゲーム',
    note: '公式の形。勝ったゲーム数 → 合計点で決める',
    gameCount: 2,
    decideBy: 'wins',
  },
  {
    label: '2 ゲーム先取',
    note: '先に 2 ゲーム取ったチームの勝ち。決まるまで続けます',
    gameCount: 2,
    decideBy: 'race',
  },
  {
    label: '100 点ゲーム',
    note: '50 点ゲームを 2 回やり、合計点で決める',
    gameCount: 2,
    decideBy: 'total',
  },
]

/** 普段の試合はゲーム数を決めない形も選べる */
export const CASUAL_PRESETS = [OPEN, ...FIXED]
/** 大会は対戦表に勝者を書き込むので、必ず終わる形だけにする */
export const TOURNAMENT_PRESETS = FIXED

/** 型に当てはまらない数にしたときの名前 */
const CUSTOM_LABEL: Record<DecideBy, (count: number) => string> = {
  wins: (count) => `${count} ゲーム（勝ち数）`,
  total: (count) => `${count} ゲーム（合計点）`,
  race: (count) => `${count} ゲーム先取`,
}

/** 試合の形の名前。決めたゲーム数と比べ方が一致する型があればその名前にする */
export const formatLabel = (rules: GameRules): string =>
  [OPEN, ...FIXED].find(
    (preset) => preset.gameCount === rules.gameCount && preset.decideBy === rules.decideBy,
  )?.label ?? CUSTOM_LABEL[rules.decideBy](rules.gameCount!)

/** ゲームの見出しに添える、試合の中での位置。先取は終わりが決まっていないので先取数を書く */
const TITLE_SUFFIX: Record<DecideBy, (count: number) => string> = {
  wins: (count) => ` / ${count}`,
  total: (count) => ` / ${count}`,
  race: (count) => `（${count} ゲーム先取）`,
}

/** 「第 2 ゲーム / 3」「第 3 ゲーム（2 ゲーム先取）」など */
export const gameTitle = (gameNumber: number, rules: GameRules): string =>
  `第 ${gameNumber} ゲーム${rules.gameCount === null ? '' : TITLE_SUFFIX[rules.decideBy](rules.gameCount)}`
