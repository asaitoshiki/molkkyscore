import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { computeGameState } from '../domain/game'
import { newId } from '../domain/id'
import { DEFAULT_RULES } from '../domain/rules'
import { gamesOfSeries } from '../domain/series'
import { createMatches, propagateWinners } from '../domain/tournament'
import type {
  Entry,
  Game,
  GameRules,
  Member,
  PracticeSession,
  ThrowRecord,
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
  /** 同じ顔ぶれで次のゲームを始める */
  addGameToSeries: (seriesId: string) => string
  recordThrow: (gameId: string, pins: number[], memberId?: string) => void
  /** 記録した投球を差し替える。誤入力の訂正に使う */
  editThrow: (gameId: string, index: number, pins: number[]) => void
  /** 先頭から count 投だけ残して、それ以降を取り消す */
  rewindTo: (gameId: string, count: number) => void
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

/** 投球記録を入れ替えた試合を作り、決着判定まで通す。 */
const replaceThrows = (state: AppState, gameId: string, throws: ThrowRecord[]) => {
  const game = state.games.find((item) => item.id === gameId)!
  return settle(state, { ...game, throws, finishedAt: null })
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
          seriesId: newId(),
          gameNumber: 1,
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

      addGameToSeries: (seriesId) => {
        const previous = gamesOfSeries(get().games, seriesId).at(-1)!
        const game: Game = {
          ...previous,
          id: newId(),
          createdAt: Date.now(),
          finishedAt: null,
          throws: [],
          gameNumber: previous.gameNumber + 1,
          matchId: null,
        }
        set((state) => ({ games: [...state.games, game] }))
        return game.id
      },

      recordThrow: (gameId, pins, memberId) => {
        const state = get()
        const game = state.games.find((item) => item.id === gameId)!
        const computed = computeGameState(game)
        const record: ThrowRecord = {
          entryId: computed.currentEntryId!,
          memberId: memberId ?? computed.currentMemberId!,
          pins,
          at: Date.now(),
        }
        set(replaceThrows(state, gameId, [...game.throws, record]))
      },

      editThrow: (gameId, index, pins) => {
        const state = get()
        const game = state.games.find((item) => item.id === gameId)!
        set(
          replaceThrows(
            state,
            gameId,
            game.throws.map((record, position) =>
              position === index ? { ...record, pins } : record,
            ),
          ),
        )
      },

      rewindTo: (gameId, count) => {
        const state = get()
        const game = state.games.find((item) => item.id === gameId)!
        set(replaceThrows(state, gameId, game.throws.slice(0, count)))
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
    {
      name: 'molkky-note-v1',
      version: 2,
      // セット（連戦）を導入する前に保存された試合は、単独のセットとして扱う
      migrate: (persisted) => {
        const state = persisted as { games?: Game[] }
        return {
          ...state,
          games: (state.games ?? []).map((game) => ({
            ...game,
            seriesId: game.seriesId ?? newId(),
            gameNumber: game.gameNumber ?? 1,
          })),
        } as AppState
      },
    },
  ),
)

/** 既定ルールは設定画面を作るまで固定で配る。 */
export const defaultRules = DEFAULT_RULES
