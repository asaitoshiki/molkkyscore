import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_RULES } from '../domain/rules'
import { gamesOfSeries, seriesResult } from '../domain/series'
import { useAppStore } from './useAppStore'
import type { Entry, GameRules } from '../domain/types'

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
  useAppStore.setState({ members: [], games: [], practices: [] })
})

describe('試合ルール', () => {
  it('2 ゲームの試合は続きを逆順で始め、並んだらモルックアウトの勝者が試合の勝者になる', () => {
    const rules: GameRules = { ...DEFAULT_RULES, gameCount: 2 }
    const firstId = useAppStore.getState().createGame(entriesOf(2), rules)
    finishGame(firstId)
    const seriesId = useAppStore.getState().games.find((g) => g.id === firstId)!.seriesId
    const resultOf = () => seriesResult(gamesOfSeries(useAppStore.getState().games, seriesId))
    // 1 ゲーム目だけでは試合は終わらない
    expect(resultOf().winnerEntryId).toBeNull()

    const secondId = useAppStore.getState().addGameToSeries(seriesId)
    const second = useAppStore.getState().games.find((g) => g.id === secondId)!
    expect(second.entries.map((e) => e.id)).toEqual(['e2', 'e1'])

    // 2 ゲーム目は先に投げる e2 が勝つ。1 勝 1 敗・合計 54 点ずつで並ぶので、まだ決まらない
    finishGame(secondId)
    expect(resultOf().winnerEntryId).toBeNull()

    // モルックアウトで勝った組を選ぶと、試合の勝者になる
    useAppStore.getState().setShootoutWinner(secondId, 'e2')
    expect(resultOf().winnerEntryId).toBe('e2')
  })

  it('時間切れのあとは全チームが同じ数だけ投げてから終わり、戻しても時間切れは残る', () => {
    const rules: GameRules = { ...DEFAULT_RULES, gameCount: 1, timeLimitMinutes: 20 }
    const gameId = useAppStore.getState().createGame(entriesOf(2), rules)
    const gameOf = () => useAppStore.getState().games.find((g) => g.id === gameId)!
    useAppStore.getState().recordThrow(gameId, [12], 'm1')
    useAppStore.getState().setTimeUp(gameId, 1)
    // 後攻がまだ投げていないので終わらない
    expect(gameOf().finishedAt).toBeNull()

    useAppStore.getState().recordThrow(gameId, [5], 'm2')
    expect(gameOf().finishedAt).not.toBeNull()

    // 最後の投球を戻しても時間切れのまま。後攻が投げ直せる
    useAppStore.getState().rewindTo(gameId, 1)
    expect(gameOf().finishedAt).toBeNull()
    expect(gameOf().timeUpAt).toBe(1)

    // 押し間違いなら時間切れそのものを外せる
    useAppStore.getState().setTimeUp(gameId, null)
    useAppStore.getState().recordThrow(gameId, [5], 'm2')
    expect(gameOf().finishedAt).toBeNull()
  })
})

describe('メンバー', () => {
  it('チーム名で記録しただけの人は一覧に出さず、メンバーとして選ばれたら一覧に出す', () => {
    const asTeam = useAppStore.getState().memberNamed('ひまわり', false)
    expect(asTeam.listed).toBe(false)
    const asPlayer = useAppStore.getState().memberNamed(' ひまわり ', true)
    // 同じ名前は同じ人。記録をまとめるため ID は変えない
    expect(asPlayer.id).toBe(asTeam.id)
    expect(useAppStore.getState().members.find((m) => m.id === asTeam.id)!.listed).toBe(true)
  })

  it('一覧から外しても、名前と記録は残る', () => {
    const player = useAppStore.getState().memberNamed('山田', true)
    useAppStore.getState().unlistMember(player.id)
    const kept = useAppStore.getState().members.find((m) => m.id === player.id)!
    expect(kept).toMatchObject({ name: '山田', listed: false })
  })
})

