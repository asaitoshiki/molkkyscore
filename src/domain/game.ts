import { advanceScore, pointsOf } from './rules'
import type { Game, ThrowRecord } from './types'

/** 投球記録から計算される参加者の状態。永続化せず毎回導出する。 */
export type EntryState = {
  entryId: string
  score: number
  /** 連続ミス数。1 本でも倒すと 0 に戻る。 */
  consecutiveMisses: number
  eliminated: boolean
  throwCount: number
  /** チーム戦で次に投げるメンバー */
  nextMemberId: string
}

export type GameState = {
  entries: EntryState[]
  /** 決着後は null */
  currentEntryId: string | null
  currentMemberId: string | null
  winnerEntryId: string | null
  finished: boolean
  /** 1 巡目を 1 とした現在のラウンド */
  round: number
}

/** 投球記録を順に畳み込んで現在の状態を求める。undo は記録を削って再計算するだけで済む。 */
export const computeGameState = (game: Game): GameState => {
  const indexOf = new Map(game.entries.map((entry, index) => [entry.id, index]))
  const states: EntryState[] = game.entries.map((entry) => ({
    entryId: entry.id,
    score: 0,
    consecutiveMisses: 0,
    eliminated: false,
    throwCount: 0,
    nextMemberId: entry.memberIds[0],
  }))

  let turn = 0
  let winnerEntryId: string | null = null

  for (const record of game.throws) {
    const index = indexOf.get(record.entryId)!
    const state = states[index]
    const points = pointsOf(record.pins)

    state.throwCount += 1
    state.consecutiveMisses = points === 0 ? state.consecutiveMisses + 1 : 0
    state.eliminated = state.consecutiveMisses >= game.rules.maxMisses
    state.score = advanceScore(state.score, points, game.rules)
    state.nextMemberId = game.entries[index].memberIds[state.throwCount % game.entries[index].memberIds.length]

    winnerEntryId = state.score === game.rules.targetScore ? state.entryId : winnerEntryId
    turn = nextTurn(states, index)
  }

  // 失格者が出て 1 人だけ残った場合もその参加者の勝ち
  const survivors = states.filter((state) => !state.eliminated)
  const lastSurvivor = survivors.length === 1 && states.length > 1 ? survivors[0].entryId : null
  const winner = winnerEntryId ?? lastSurvivor
  const playing = survivors.length > 0 && winner === null
  const current = states[turn]
  const roundBase = survivors.length > 0 ? survivors : states

  return {
    entries: states,
    currentEntryId: playing ? current.entryId : null,
    currentMemberId: playing ? current.nextMemberId : null,
    winnerEntryId: winner,
    finished: !playing,
    round: Math.min(...roundBase.map((state) => state.throwCount)) + 1,
  }
}

/** 失格者を飛ばして次の投球順を返す。全員失格の異常系は呼び出し元が作れない前提。 */
const nextTurn = (states: EntryState[], from: number): number => {
  for (let step = 1; step <= states.length; step += 1) {
    const index = (from + step) % states.length
    if (!states[index].eliminated) return index
  }
  return from
}

/** 1 投分の記録を作る。実際に投げた人はチーム内のローテーションで決まる。 */
export const createThrow = (state: GameState, pins: number[]): ThrowRecord => ({
  entryId: state.currentEntryId!,
  memberId: state.currentMemberId!,
  pins,
  at: Date.now(),
})

/** 目標点までの残り。超過扱いになる投球を UI で警告するために使う。 */
export const remainingTo = (score: number, game: Game): number => game.rules.targetScore - score
