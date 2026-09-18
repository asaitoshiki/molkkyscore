import { computeGameState } from './game'
import { PIN_NUMBERS, advanceScore, pointsOf } from './rules'
import type { Game, Member } from './types'

export type MemberStats = {
  member: Member
  games: number
  wins: number
  winRate: number
  throws: number
  totalPoints: number
  averagePoints: number
  misses: number
  missRate: number
  /** 1 本だけ狙って倒した回数 */
  singleHits: number
  /** 2 本以上まとめて倒した回数 */
  multiHits: number
  /** 50 点を超えて 25 点に戻された回数 */
  overshoots: number
  /** スキットル番号ごとの撃破数（添字 0 が 1 番） */
  pinHits: number[]
}

const emptyStats = (member: Member): MemberStats => ({
  member,
  games: 0,
  wins: 0,
  winRate: 0,
  throws: 0,
  totalPoints: 0,
  averagePoints: 0,
  misses: 0,
  missRate: 0,
  singleHits: 0,
  multiHits: 0,
  overshoots: 0,
  pinHits: PIN_NUMBERS.map(() => 0),
})

/** 保存済みの試合を再生してメンバーごとの通算成績を求める。 */
export const computeMemberStats = (games: Game[], members: Member[]): MemberStats[] => {
  const stats = new Map(members.map((member) => [member.id, emptyStats(member)]))
  const finished = games.filter((game) => game.finishedAt !== null)

  for (const game of finished) {
    const state = computeGameState(game)
    const scores = new Map<string, number>(game.entries.map((entry) => [entry.id, 0]))

    for (const entry of game.entries) {
      const won = entry.id === state.winnerEntryId
      for (const memberId of entry.memberIds) {
        const stat = stats.get(memberId)
        if (!stat) continue
        stat.games += 1
        stat.wins += won ? 1 : 0
      }
    }

    for (const record of game.throws) {
      const stat = stats.get(record.memberId)
      const points = pointsOf(record.pins)
      const before = scores.get(record.entryId)!
      const after = advanceScore(before, points, game.rules)
      scores.set(record.entryId, after)
      if (!stat) continue

      stat.throws += 1
      stat.totalPoints += points
      stat.misses += points === 0 ? 1 : 0
      stat.singleHits += record.pins.length === 1 ? 1 : 0
      stat.multiHits += record.pins.length >= 2 ? 1 : 0
      stat.overshoots += after === game.rules.penaltyScore && before + points > game.rules.targetScore ? 1 : 0
      record.pins.forEach((pin) => (stat.pinHits[pin - 1] += 1))
    }
  }

  return [...stats.values()].map((stat) => ({
    ...stat,
    winRate: ratio(stat.wins, stat.games),
    averagePoints: stat.throws === 0 ? 0 : stat.totalPoints / stat.throws,
    missRate: ratio(stat.misses, stat.throws),
  }))
}

const ratio = (part: number, whole: number): number => (whole === 0 ? 0 : part / whole)

/** 直近の試合から順に、各参加者の最終得点と勝敗をまとめる。 */
export type GameSummary = {
  game: Game
  winnerName: string | null
  lines: { name: string; score: number; eliminated: boolean }[]
}

export const summarizeGame = (game: Game): GameSummary => {
  const state = computeGameState(game)
  const nameOf = new Map(game.entries.map((entry) => [entry.id, entry.name]))
  return {
    game,
    winnerName: state.winnerEntryId === null ? null : (nameOf.get(state.winnerEntryId) ?? null),
    lines: state.entries.map((entryState) => ({
      name: nameOf.get(entryState.entryId)!,
      score: entryState.score,
      eliminated: entryState.eliminated,
    })),
  }
}
