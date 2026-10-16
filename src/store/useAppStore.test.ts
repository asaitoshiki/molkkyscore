import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_RULES } from '../domain/rules'
import { useAppStore } from './useAppStore'
import type { Entry, GameRules } from '../domain/types'

/** 大会の一戦は 1 ゲームで勝敗を決める */
const ONE_GAME: GameRules = { ...DEFAULT_RULES, gameCount: 1 }

const entriesOf = (count: number): Entry[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `e${index + 1}`,
    name: `E${index + 1}`,
    memberIds: [`m${index + 1}`],
    handicap: 0,
  }))

/** 先攻が 50 点に届くまで投げて決着させる。後攻は失格しないよう 1 点を返す */
const finishGame = (gameId: string) => {
  const finished = () => useAppStore.getState().games.find((item) => item.id === gameId)!.finishedAt
  const game = useAppStore.getState().games.find((item) => item.id === gameId)!
  for (let i = 0; i < 5 && finished() === null; i += 1) {
    useAppStore.getState().recordThrow(gameId, [10], game.entries[0].memberIds[0])
    if (finished() !== null) break
    useAppStore.getState().recordThrow(gameId, [1], game.entries[1].memberIds[0])
  }
}

beforeEach(() => {
  useAppStore.setState({ members: [], games: [], tournaments: [], practices: [] })
})

describe('大会と試合の連動', () => {
  it('総当たりの対戦表は試合が決着しても組み替えられない', () => {
    const tournamentId = useAppStore
      .getState()
      .createTournament('総当たり', 'roundRobin', entriesOf(4), ONE_GAME)
    const before = useAppStore.getState().tournaments.find((t) => t.id === tournamentId)!
    const pairs = before.matches.map((match) => [...match.entryIds])
    // 1 番手以外の対戦を消化する。先頭固定の組み合わせだと書き換えが表に出ない
    const match = before.matches[1]

    const gameId = useAppStore.getState().createGame(
      match.entryIds.map((entryId) => before.entries.find((entry) => entry.id === entryId)!),
      ONE_GAME,
      { tournamentId, matchId: match.id },
    )
    finishGame(gameId)

    const after = useAppStore.getState().tournaments.find((t) => t.id === tournamentId)!
    expect(after.matches.map((m) => m.entryIds)).toEqual(pairs)
    expect(after.matches.find((m) => m.id === match.id)!.winnerEntryId).not.toBeNull()
  })

  it('試合を削除すると対戦表のリンクと勝者も外れる', () => {
    const tournamentId = useAppStore
      .getState()
      .createTournament('トーナメント', 'knockout', entriesOf(4), ONE_GAME)
    const match = useAppStore.getState().tournaments.find((t) => t.id === tournamentId)!.matches[0]

    const gameId = useAppStore
      .getState()
      .createGame(entriesOf(4).slice(0, 2), ONE_GAME, { tournamentId, matchId: match.id })
    finishGame(gameId)
    useAppStore.getState().deleteGame(gameId)

    const after = useAppStore.getState().tournaments.find((t) => t.id === tournamentId)!
    const cleared = after.matches.find((m) => m.id === match.id)!
    expect(cleared.gameId).toBeNull()
    expect(cleared.winnerEntryId).toBeNull()
    // 決勝の枠も空に戻る
    expect(after.matches.find((m) => m.round === 2)!.entryIds).toEqual([null, null])
  })

  it('チーム名を変えても投球は残り、続きのゲームと大会の対戦表の名前もそろう', () => {
    const tournamentId = useAppStore
      .getState()
      .createTournament('名前変更', 'knockout', entriesOf(2), ONE_GAME)
    const match = useAppStore.getState().tournaments.find((t) => t.id === tournamentId)!.matches[0]
    const gameId = useAppStore
      .getState()
      .createGame(entriesOf(2), ONE_GAME, { tournamentId, matchId: match.id })
    useAppStore.getState().recordThrow(gameId, [12], 'm1')
    const seriesId = useAppStore.getState().games.find((g) => g.id === gameId)!.seriesId
    const nextId = useAppStore.getState().addGameToSeries(seriesId)

    useAppStore.getState().renameEntries({ e1: '  ひまわり  ' })

    const state = useAppStore.getState()
    const game = state.games.find((g) => g.id === gameId)!
    expect(game.entries.map((e) => e.name)).toEqual(['ひまわり', 'E2'])
    expect(game.throws).toHaveLength(1)
    expect(state.games.find((g) => g.id === nextId)!.entries.find((e) => e.id === 'e1')!.name).toBe(
      'ひまわり',
    )
    expect(state.tournaments.find((t) => t.id === tournamentId)!.entries[0].name).toBe('ひまわり')
  })
})

describe('試合ルール', () => {
  it('2 ゲームの試合は続きを逆順で始め、並んだらモルックアウトの勝者が対戦表に入る', () => {
    const rules: GameRules = { ...DEFAULT_RULES, gameCount: 2 }
    const tournamentId = useAppStore
      .getState()
      .createTournament('2 ゲーム', 'knockout', entriesOf(2), rules)
    const match = useAppStore.getState().tournaments.find((t) => t.id === tournamentId)!.matches[0]
    const firstId = useAppStore
      .getState()
      .createGame(entriesOf(2), rules, { tournamentId, matchId: match.id })
    finishGame(firstId)
    const matchOf = () =>
      useAppStore.getState().tournaments.find((t) => t.id === tournamentId)!.matches[0]
    // 1 ゲーム目だけでは試合は終わらない
    expect(matchOf().winnerEntryId).toBeNull()

    const seriesId = useAppStore.getState().games.find((g) => g.id === firstId)!.seriesId
    const secondId = useAppStore.getState().addGameToSeries(seriesId)
    const second = useAppStore.getState().games.find((g) => g.id === secondId)!
    expect(second.entries.map((e) => e.id)).toEqual(['e2', 'e1'])

    // 2 ゲーム目は先に投げる e2 が勝つ。1 勝 1 敗・合計 54 点ずつで並ぶので、まだ決まらない
    finishGame(secondId)
    expect(matchOf().winnerEntryId).toBeNull()

    // モルックアウトで勝った組を選ぶと、対戦表に入る
    useAppStore.getState().setShootoutWinner(secondId, 'e2')
    expect(matchOf().winnerEntryId).toBe('e2')
  })

  it('タイムアップで打ち切ったゲームは、時刻を外すと続きから投げられる', () => {
    const rules: GameRules = { ...DEFAULT_RULES, gameCount: 1, timeLimitMinutes: 20 }
    const gameId = useAppStore.getState().createGame(entriesOf(2), rules, null)
    useAppStore.getState().recordThrow(gameId, [12], 'm1')
    useAppStore.getState().setTimeUp(gameId, 1)
    const gameOf = () => useAppStore.getState().games.find((g) => g.id === gameId)!
    expect(gameOf().finishedAt).not.toBeNull()

    useAppStore.getState().setTimeUp(gameId, null)
    expect(gameOf().finishedAt).toBeNull()
  })
})
