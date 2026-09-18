import { newId } from './id'
import type { Entry, Game, Tournament, TournamentFormat, TournamentMatch } from './types'
import { computeGameState } from './game'

/** 大会形式に応じた対戦表を作る。 */
export const createMatches = (format: TournamentFormat, entries: Entry[]): TournamentMatch[] =>
  format === 'roundRobin' ? roundRobinMatches(entries) : propagateWinners(knockoutMatches(entries))

/** 総当たり。サークル法で「同じラウンドに同じ参加者が 2 度出ない」組み合わせを作る。 */
const roundRobinMatches = (entries: Entry[]): TournamentMatch[] => {
  // 奇数人数は空き枠（null）を足して偶数にし、当たった相手が null の回は休みになる
  const slots: (string | null)[] = entries.map((entry) => entry.id)
  const padded = slots.length % 2 === 0 ? slots : [...slots, null]
  const size = padded.length
  const matches: TournamentMatch[] = []

  for (let round = 1; round <= size - 1; round += 1) {
    for (let index = 0; index < size / 2; index += 1) {
      const home = padded[index]
      const away = padded[size - 1 - index]
      const playable = home !== null && away !== null
      if (playable) {
        matches.push(emptyMatch(round, index, [home, away]))
      }
    }
    // 先頭を固定して残りを 1 つずつ回す
    padded.splice(1, 0, padded.pop()!)
  }
  return matches
}

/** トーナメント。参加者数を 2 のべき乗まで空き枠で埋め、空き枠の相手は不戦勝になる。 */
const knockoutMatches = (entries: Entry[]): TournamentMatch[] => {
  const size = 2 ** Math.ceil(Math.log2(Math.max(entries.length, 2)))
  const seeds = Array.from({ length: size }, (_, index) => entries[index]?.id ?? null)
  const matches: TournamentMatch[] = []

  for (let round = 1; round <= Math.log2(size); round += 1) {
    const count = size / 2 ** round
    for (let order = 0; order < count; order += 1) {
      const pair: (string | null)[] =
        round === 1 ? [seeds[order * 2], seeds[order * 2 + 1]] : [null, null]
      matches.push(emptyMatch(round, order, pair))
    }
  }
  return matches
}

const emptyMatch = (
  round: number,
  order: number,
  entryIds: (string | null)[],
): TournamentMatch => ({
  id: newId(),
  round,
  order,
  entryIds,
  gameId: null,
  winnerEntryId: null,
})

/** 確定した勝者と不戦勝を次のラウンドへ送る。決着まで繰り返し適用できる。 */
export const propagateWinners = (matches: TournamentMatch[]): TournamentMatch[] => {
  const next = matches.map((match) => ({ ...match, entryIds: [...match.entryIds] }))
  const byRound = new Map<number, TournamentMatch[]>()
  next.forEach((match) => byRound.set(match.round, [...(byRound.get(match.round) ?? []), match]))

  for (const round of [...byRound.keys()].sort((a, b) => a - b)) {
    for (const match of byRound.get(round)!) {
      const filled = match.entryIds.filter((id): id is string => id !== null)
      // 相手がいない枠は不戦勝として勝者を確定させる
      match.winnerEntryId = match.winnerEntryId ?? (filled.length === 1 ? filled[0] : null)

      const target = byRound.get(round + 1)?.[Math.floor(match.order / 2)]
      if (target && match.winnerEntryId) {
        target.entryIds[match.order % 2] = match.winnerEntryId
      }
    }
  }
  return next
}

export type Standing = {
  entry: Entry
  played: number
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
}

/** 総当たりの順位表。勝ち数 → 得失点差の順に並べる。 */
export const computeStandings = (tournament: Tournament, games: Game[]): Standing[] => {
  const gameById = new Map(games.map((game) => [game.id, game]))
  const standings = new Map<string, Standing>(
    tournament.entries.map((entry) => [
      entry.id,
      { entry, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 },
    ]),
  )

  for (const match of tournament.matches) {
    const game = match.gameId === null ? undefined : gameById.get(match.gameId)
    if (!game || game.finishedAt === null) continue

    const state = computeGameState(game)
    for (const entryState of state.entries) {
      const standing = standings.get(entryState.entryId)
      if (!standing) continue
      const opponents = state.entries.filter((other) => other.entryId !== entryState.entryId)
      standing.played += 1
      standing.wins += entryState.entryId === state.winnerEntryId ? 1 : 0
      standing.losses += entryState.entryId === state.winnerEntryId ? 0 : 1
      standing.pointsFor += entryState.score
      standing.pointsAgainst += Math.max(...opponents.map((other) => other.score))
    }
  }

  return [...standings.values()].sort(
    (a, b) =>
      b.wins - a.wins ||
      b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst) ||
      b.pointsFor - a.pointsFor,
  )
}

/** 大会全体の優勝者。トーナメントは決勝の勝者、総当たりは順位表の首位。 */
export const championOf = (tournament: Tournament, games: Game[]): Entry | null => {
  const finished = tournament.matches.every((match) => match.winnerEntryId !== null)
  if (!finished) return null

  const lastRound = Math.max(...tournament.matches.map((match) => match.round))
  const final = tournament.matches.find((match) => match.round === lastRound)!
  const winnerId =
    tournament.format === 'knockout'
      ? final.winnerEntryId
      : (computeStandings(tournament, games)[0]?.entry.id ?? null)
  return tournament.entries.find((entry) => entry.id === winnerId) ?? null
}
