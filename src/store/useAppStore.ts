import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { computeGameState, createThrow } from '../domain/game'
import { newId } from '../domain/id'
import { DEFAULT_RULES } from '../domain/rules'
import { createMatches, propagateWinners } from '../domain/tournament'
import type {
  Entry,
  Game,
  GameRules,
  Member,
  PracticeSession,
  Tournament,
  TournamentFormat,
} from '../domain/types'

type MatchLink = { tournamentId: string; matchId: string }

type AppState = {
  members: Member[]
  games: Game[]
  tournaments: Tournament[]
  practices: PracticeSession[]

  addMember: (name: string) => Member
  renameMember: (memberId: string, name: string) => void
  removeMember: (memberId: string) => void

  createGame: (entries: Entry[], rules: GameRules, link: MatchLink | null) => string
  recordThrow: (gameId: string, pins: number[]) => void
  undoThrow: (gameId: string) => void
  deleteGame: (gameId: string) => void

  createTournament: (
    name: string,
    format: TournamentFormat,
    entries: Entry[],
    rules: GameRules,
  ) => string
  deleteTournament: (tournamentId: string) => void

  addPractice: (session: Omit<PracticeSession, 'id' | 'createdAt'>) => void
  removePractice: (practiceId: string) => void
}

/** 試合が決着していれば終了時刻を打ち、大会側の勝者も確定させる。 */
const settle = (state: AppState, game: Game): Partial<AppState> => {
  const computed = computeGameState(game)
  const finished: Game = {
    ...game,
    finishedAt: computed.finished ? (game.finishedAt ?? Date.now()) : null,
  }
  const games = state.games.map((item) => (item.id === finished.id ? finished : item))
  const tournaments = state.tournaments.map((tournament) =>
    tournament.id === finished.tournamentId
      ? {
          ...tournament,
          matches: propagateWinners(
            tournament.matches.map((match) =>
              match.id === finished.matchId
                ? { ...match, winnerEntryId: computed.winnerEntryId }
                : match,
            ),
          ),
        }
      : tournament,
  )
  return { games, tournaments }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      members: [],
      games: [],
      tournaments: [],
      practices: [],

      addMember: (name) => {
        const member: Member = { id: newId(), name: name.trim(), createdAt: Date.now() }
        set((state) => ({ members: [...state.members, member] }))
        return member
      },

      renameMember: (memberId, name) =>
        set((state) => ({
          members: state.members.map((member) =>
            member.id === memberId ? { ...member, name: name.trim() } : member,
          ),
        })),

      removeMember: (memberId) =>
        set((state) => ({ members: state.members.filter((member) => member.id !== memberId) })),

      createGame: (entries, rules, link) => {
        const game: Game = {
          id: newId(),
          createdAt: Date.now(),
          finishedAt: null,
          rules,
          entries,
          throws: [],
          tournamentId: link?.tournamentId ?? null,
          matchId: link?.matchId ?? null,
        }
        set((state) => ({
          games: [...state.games, game],
          tournaments: state.tournaments.map((tournament) =>
            tournament.id === game.tournamentId
              ? {
                  ...tournament,
                  matches: tournament.matches.map((match) =>
                    match.id === game.matchId ? { ...match, gameId: game.id } : match,
                  ),
                }
              : tournament,
          ),
        }))
        return game.id
      },

      recordThrow: (gameId, pins) => {
        const state = get()
        const game = state.games.find((item) => item.id === gameId)!
        const next: Game = { ...game, throws: [...game.throws, createThrow(computeGameState(game), pins)] }
        set(settle(state, next))
      },

      undoThrow: (gameId) => {
        const state = get()
        const game = state.games.find((item) => item.id === gameId)!
        const next: Game = { ...game, throws: game.throws.slice(0, -1), finishedAt: null }
        set(settle(state, next))
      },

      deleteGame: (gameId) =>
        set((state) => ({ games: state.games.filter((game) => game.id !== gameId) })),

      createTournament: (name, format, entries, rules) => {
        const tournament: Tournament = {
          id: newId(),
          name: name.trim(),
          format,
          createdAt: Date.now(),
          rules,
          entries,
          matches: createMatches(format, entries),
        }
        set((state) => ({ tournaments: [...state.tournaments, tournament] }))
        return tournament.id
      },

      deleteTournament: (tournamentId) =>
        set((state) => ({
          tournaments: state.tournaments.filter((tournament) => tournament.id !== tournamentId),
          games: state.games.filter((game) => game.tournamentId !== tournamentId),
        })),

      addPractice: (session) =>
        set((state) => ({
          practices: [...state.practices, { ...session, id: newId(), createdAt: Date.now() }],
        })),

      removePractice: (practiceId) =>
        set((state) => ({
          practices: state.practices.filter((practice) => practice.id !== practiceId),
        })),
    }),
    { name: 'molkky-note-v1' },
  ),
)

/** 既定ルールは設定画面を作るまで固定で配る。 */
export const defaultRules = DEFAULT_RULES
