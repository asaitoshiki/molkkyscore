import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { computeGameState } from '../domain/game'
import { newId } from '../domain/id'
import { withGameDefaults, withHandicap, withRules } from '../domain/legacy'
import type { LegacyGame } from '../domain/legacy'
import { gamesOfSeries, nextEntries, seriesResult } from '../domain/series'
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
  /** 広告除去を購入済みか */
  adFree: boolean
  /** 効果音を鳴らすか */
  soundOn: boolean
  /** 観戦に共有中のセット。キーはセットの識別子、値は観戦リンクの鍵 */
  shares: Record<string, string>
  /** 前回の全画面広告から何ゲーム終えたか */
  gamesSinceInterstitial: number

  setAdFree: (adFree: boolean) => void
  setSoundOn: (soundOn: boolean) => void
  startShare: (seriesId: string, shareId: string) => void
  endShare: (seriesId: string) => void
  countFinishedGame: () => void
  resetInterstitialCount: () => void

  addMember: (name: string) => Member
  renameMember: (memberId: string, name: string) => void
  removeMember: (memberId: string) => void

  createGame: (entries: Entry[], rules: GameRules, link: MatchLink | null) => string
  /** 同じ顔ぶれで次のゲームを始める */
  addGameToSeries: (seriesId: string) => string
  recordThrow: (gameId: string, pins: number[], memberId?: string) => void
  /** 記録した投球を差し替える。誤入力の訂正に使う */
  editThrow: (gameId: string, index: number, pins: number[]) => void
  /** 先頭から count 投だけ残して、それ以降を取り消す。打ち切りやモルックアウトの結果も外す */
  rewindTo: (gameId: string, count: number) => void
  /** 時間切れでゲームを打ち切る。null を渡すと打ち切りを取り消す */
  setTimeUp: (gameId: string, at: number | null) => void
  /** 首位が並んだときにモルックアウトで勝った組を記録する。null で選び直し */
  setShootoutWinner: (gameId: string, entryId: string | null) => void
  deleteGame: (gameId: string) => void
  /** チーム名を変える。キーはチームの ID */
  renameEntries: (names: Record<string, string>) => void

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
  return { games, tournaments: linkWinners(state.tournaments, games, finished) }
}

/** 大会の一戦なら、試合（セット）全体の勝者を対戦表に書き込む */
const linkWinners = (tournaments: Tournament[], games: Game[], game: Game): Tournament[] => {
  const result = seriesResult(gamesOfSeries(games, game.seriesId))
  return tournaments.map((tournament) => {
    if (tournament.id !== game.tournamentId) return tournament
    const matches = tournament.matches.map((match) =>
      match.id === game.matchId ? { ...match, winnerEntryId: result.winnerEntryId } : match,
    )
    // 次のラウンドへ送る処理はトーナメントだけ。総当たりは対戦表が固定なので触らない
    return {
      ...tournament,
      matches: tournament.format === 'knockout' ? propagateWinners(matches) : matches,
    }
  })
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
      adFree: false,
      soundOn: true,
      shares: {},
      gamesSinceInterstitial: 0,

      setAdFree: (adFree) => set({ adFree }),

      setSoundOn: (soundOn) => set({ soundOn }),

      startShare: (seriesId, shareId) =>
        set((state) => ({ shares: { ...state.shares, [seriesId]: shareId } })),

      endShare: (seriesId) =>
        set((state) => ({
          shares: Object.fromEntries(Object.entries(state.shares).filter(([key]) => key !== seriesId)),
        })),

      countFinishedGame: () =>
        set((state) => ({ gamesSinceInterstitial: state.gamesSinceInterstitial + 1 })),

      resetInterstitialCount: () => set({ gamesSinceInterstitial: 0 }),

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
          timeUpAt: null,
          shootoutWinnerId: null,
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
          entries: nextEntries(previous),
          throws: [],
          gameNumber: previous.gameNumber + 1,
          timeUpAt: null,
          shootoutWinnerId: null,
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
        set(
          settle(state, {
            ...game,
            throws: game.throws.slice(0, count),
            finishedAt: null,
            timeUpAt: null,
            shootoutWinnerId: null,
          }),
        )
      },

      setTimeUp: (gameId, at) => {
        const state = get()
        const game = state.games.find((item) => item.id === gameId)!
        set(settle(state, { ...game, timeUpAt: at, finishedAt: null, shootoutWinnerId: null }))
      },

      setShootoutWinner: (gameId, entryId) => {
        const state = get()
        const game = state.games.find((item) => item.id === gameId)!
        set(settle(state, { ...game, shootoutWinnerId: entryId }))
      },

      // 同じチームが続きのゲームや大会の対戦表にもいるので、ID が同じものはまとめて変える。
      // 投球は ID にひも付いているため、名前を変えても点数と手番はそのまま残る
      renameEntries: (names) =>
        set((state) => {
          const rename = (entry: Entry) =>
            entry.id in names ? { ...entry, name: names[entry.id].trim() } : entry
          return {
            games: state.games.map((game) => ({ ...game, entries: game.entries.map(rename) })),
            tournaments: state.tournaments.map((tournament) => ({
              ...tournament,
              entries: tournament.entries.map(rename),
            })),
          }
        }),

      // 大会から作った試合を消すときは、対戦表に残るリンクと勝者も一緒に外す。
      // 対戦表がひも付くのは最初のゲームなので、続きのゲームだけを消したときは残りで勝者を出し直す
      deleteGame: (gameId) =>
        set((state) => {
          const target = state.games.find((game) => game.id === gameId)!
          const games = state.games.filter((game) => game.id !== gameId)
          const earlier = gamesOfSeries(games, target.seriesId).filter(
            (game) => game.gameNumber < target.gameNumber,
          )
          if (target.matchId !== null && earlier.length > 0) {
            return { games, tournaments: linkWinners(state.tournaments, games, earlier.at(-1)!) }
          }
          const detached = games.map((game) =>
            game.seriesId === target.seriesId ? { ...game, tournamentId: null, matchId: null } : game,
          )
          const tournaments = state.tournaments.map((tournament) => {
            if (tournament.id !== target.tournamentId) return tournament
            const matches = tournament.matches.map((match) =>
              match.gameId === gameId ? { ...match, gameId: null, winnerEntryId: null } : match,
            )
            return {
              ...tournament,
              matches: tournament.format === 'knockout' ? propagateWinners(matches) : matches,
            }
          })
          return { games: detached, tournaments }
        }),

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
      version: 6,
      // 保存済みの形に足りない項目を補う。セット（連戦）・ハンデ・観戦の共有・効果音・
      // 試合ルール（ゲーム数・時間切れなど）はあとから入れた
      migrate: (persisted) => {
        const state = persisted as {
          games?: LegacyGame[]
          tournaments?: (Omit<Tournament, 'entries' | 'rules'> & {
            entries: LegacyGame['entries']
            rules: Partial<GameRules>
          })[]
          shares?: Record<string, string>
          soundOn?: boolean
        }
        return {
          ...state,
          shares: state.shares ?? {},
          soundOn: state.soundOn ?? true,
          games: (state.games ?? []).map(withGameDefaults),
          tournaments: (state.tournaments ?? []).map((tournament) => ({
            ...tournament,
            entries: withHandicap(tournament.entries),
            rules: withRules(tournament.rules, 1),
          })),
        } as AppState
      },
    },
  ),
)
