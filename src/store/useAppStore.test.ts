import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_RULES } from '../domain/rules'
import { useAppStore } from './useAppStore'
import type { Entry } from '../domain/types'

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
      .createTournament('総当たり', 'roundRobin', entriesOf(4), DEFAULT_RULES)
    const before = useAppStore.getState().tournaments.find((t) => t.id === tournamentId)!
    const pairs = before.matches.map((match) => [...match.entryIds])
    // 1 番手以外の対戦を消化する。先頭固定の組み合わせだと書き換えが表に出ない
    const match = before.matches[1]

    const gameId = useAppStore.getState().createGame(
      match.entryIds.map((entryId) => before.entries.find((entry) => entry.id === entryId)!),
      DEFAULT_RULES,
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
      .createTournament('トーナメント', 'knockout', entriesOf(4), DEFAULT_RULES)
    const match = useAppStore.getState().tournaments.find((t) => t.id === tournamentId)!.matches[0]

    const gameId = useAppStore
      .getState()
      .createGame(entriesOf(4).slice(0, 2), DEFAULT_RULES, { tournamentId, matchId: match.id })
    finishGame(gameId)
    useAppStore.getState().deleteGame(gameId)

    const after = useAppStore.getState().tournaments.find((t) => t.id === tournamentId)!
    const cleared = after.matches.find((m) => m.id === match.id)!
    expect(cleared.gameId).toBeNull()
    expect(cleared.winnerEntryId).toBeNull()
    // 決勝の枠も空に戻る
    expect(after.matches.find((m) => m.round === 2)!.entryIds).toEqual([null, null])
  })
})
