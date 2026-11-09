import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { computeGameState } from '../domain/game'
import { defaultAvatar } from '../domain/avatar'
import { newId } from '../domain/id'
import { withGameDefaults, withHandicap, withRules } from '../domain/legacy'
import type { LegacyGame } from '../domain/legacy'
import { gamesOfSeries, nextEntries } from '../domain/series'
import type {
  Entry,
  Game,
  GameRules,
  Member,
  PracticeSession,
  ThrowRecord,
  Tournament,
} from '../domain/types'

type AppState = {
  members: Member[]
  games: Game[]
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

  /**
   * 名前でメンバーを探し、いなければ作る。同じ名前は同じ人として扱う。
   * listed を付けて呼ぶと、チーム名として記録していただけの人もプレイヤーの一覧に出す
   */
  memberNamed: (name: string, listed: boolean) => Member
  updateMember: (memberId: string, patch: Partial<Pick<Member, 'name' | 'avatar'>>) => void
  /** プレイヤーの一覧から外す。投球の記録と名前は試合の履歴に残す */
  unlistMember: (memberId: string) => void

  createGame: (entries: Entry[], rules: GameRules) => string
  /** 同じ顔ぶれで次のゲームを始める */
  addGameToSeries: (seriesId: string) => string
  recordThrow: (gameId: string, pins: number[], memberId?: string) => void
  /** 記録した投球を差し替える。誤入力の訂正に使う */
  editThrow: (gameId: string, index: number, pins: number[]) => void
  /**
   * 先頭から count 投だけ残して、それ以降を取り消す。モルックアウトの結果は外す。
   * 時間切れはそのまま残す（時間切れのあとのラウンドで投げ直すこともあるため）
   */
  rewindTo: (gameId: string, count: number) => void
  /** 時間切れでゲームを打ち切る。null を渡すと打ち切りを取り消す */
  setTimeUp: (gameId: string, at: number | null) => void
  /** 首位が並んだときにモルックアウトで勝った組を記録する。null で選び直し */
  setShootoutWinner: (gameId: string, entryId: string | null) => void
  deleteGame: (gameId: string) => void
  /** チーム名を変える。キーはチームの ID */
  renameEntries: (names: Record<string, string>) => void

  addPractice: (session: Omit<PracticeSession, 'id' | 'createdAt'>) => void
  removePractice: (practiceId: string) => void
}

/** 試合が決着していれば終了時刻を打つ */
const settle = (state: AppState, game: Game): Partial<AppState> => {
  const computed = computeGameState(game)
  const finished: Game = {
    ...game,
    finishedAt: computed.finished ? (game.finishedAt ?? Date.now()) : null,
  }
  return { games: state.games.map((item) => (item.id === finished.id ? finished : item)) }
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

      memberNamed: (rawName, listed) => {
        const name = rawName.trim()
        const found = get().members.find((member) => member.name === name)
        if (found !== undefined) {
          const promoted = { ...found, listed: found.listed || listed }
          set((state) => ({
            members: state.members.map((member) => (member.id === found.id ? promoted : member)),
          }))
          return promoted
        }
        const id = newId()
        const member: Member = { id, name, createdAt: Date.now(), avatar: defaultAvatar(name, id), listed }
        set((state) => ({ members: [...state.members, member] }))
        return member
      },

      updateMember: (memberId, patch) =>
        set((state) => ({
          members: state.members.map((member) =>
            member.id === memberId ? { ...member, ...patch } : member,
          ),
        })),

      unlistMember: (memberId) =>
        set((state) => ({
          members: state.members.map((member) =>
            member.id === memberId ? { ...member, listed: false } : member,
          ),
        })),

      // 大会の対戦表とのリンクは、大会アプリ（モルメモ 大会）に移したので持たない
      createGame: (entries, rules) => {
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
          tournamentId: null,
          matchId: null,
        }
        set((state) => ({ games: [...state.games, game] }))
        return game.id
      },

      addGameToSeries: (seriesId) => {
        const previous = gamesOfSeries(get().games, seriesId).at(-1)!
        const game: Game = {
          ...previous,
          id: newId(),
          createdAt: Date.now(),
          finishedAt: null,
          entries: nextEntries(gamesOfSeries(get().games, seriesId)),
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

      // 同じチームが続きのゲームにもいるので、ID が同じものはまとめて変える。
      // 投球は ID にひも付いているため、名前を変えても点数と手番はそのまま残る
      renameEntries: (names) =>
        set((state) => {
          const rename = (entry: Entry) =>
            entry.id in names ? { ...entry, name: names[entry.id].trim() } : entry
          return {
            games: state.games.map((game) => ({ ...game, entries: game.entries.map(rename) })),
          }
        }),

      deleteGame: (gameId) =>
        set((state) => ({ games: state.games.filter((game) => game.id !== gameId) })),

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
      version: 9,
      // 保存済みの形に足りない項目を補う。セット（連戦）・ハンデ・観戦の共有・効果音・
      // 試合ルール（ゲーム数・時間切れなど）・本部とつなぐ大会・プレイヤーのアバターはあとから入れた
      migrate: (persisted) => {
        const state = persisted as {
          games?: LegacyGame[]
          tournaments?: (Omit<Tournament, 'entries' | 'rules'> & {
            entries: LegacyGame['entries']
            rules: Partial<GameRules>
          })[]
          shares?: Record<string, string>
          soundOn?: boolean
          hostedEvents?: unknown[]
          eventGroups?: Record<string, string>
          eventSeries?: Record<string, { matchKey?: string }>
          members?: (Omit<Member, 'avatar' | 'listed'> & Partial<Pick<Member, 'avatar' | 'listed'>>)[]
        }
        // 大会の記録はもう使わないが、大会アプリ（モルメモ 大会）の Web 版が引き取れるよう今の形に直して残す
        return {
          ...state,
          // 以前はチーム名もメンバーとして登録していた。「チーム1」や番号だけの名前はプレイヤーの一覧に出さない
          members: (state.members ?? []).map((member) => ({
            ...member,
            avatar: member.avatar ?? defaultAvatar(member.name, member.id),
            listed: member.listed ?? !/^(チーム\d+|\d+)$/.test(member.name),
          })),
          shares: state.shares ?? {},
          soundOn: state.soundOn ?? true,
          hostedEvents: state.hostedEvents ?? [],
          eventGroups: state.eventGroups ?? {},
          // コート番号で記録していた頃の試合は、今の大会の形に結び付けられないので外す
          eventSeries: Object.fromEntries(
            Object.entries(state.eventSeries ?? {}).filter(([, link]) => link.matchKey !== undefined),
          ),
          games: (state.games ?? []).map(withGameDefaults),
          tournaments: (state.tournaments ?? []).map((tournament) => ({
            ...tournament,
            entries: withHandicap(tournament.entries),
            rules: withRules(tournament.rules, 1),
          })),
        } as unknown as AppState
      },
    },
  ),
)
