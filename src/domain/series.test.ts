import { describe, expect, it } from 'vitest'
import { gamesOfSeries, nextEntries, seriesResult, seriesStandings } from './series'
import { DEFAULT_RULES } from './rules'
import type { Game, GameRules } from './types'

const entries = [
  { id: 'a', name: 'A', memberIds: ['m1'], handicap: 0 },
  { id: 'b', name: 'B', memberIds: ['m2'], handicap: 0 },
]

const game = (gameNumber: number, throwsSpec: [string, number[]][]): Game => ({
  id: `g${gameNumber}`,
  createdAt: gameNumber,
  finishedAt: null,
  rules: DEFAULT_RULES,
  entries,
  throws: throwsSpec.map(([entryId, pins], index) => ({
    entryId,
    memberId: entryId === 'a' ? 'm1' : 'm2',
    pins,
    at: index,
  })),
  seriesId: 's1',
  gameNumber,
  timeUpAt: null,
  shootoutWinnerId: null,
  tournamentId: null,
  matchId: null,
})

describe('seriesStandings', () => {
  it('ゲームごとの得点を並べ、合計を出す', () => {
    const standings = seriesStandings([
      game(1, [['a', [10]], ['b', [4]]]),
      game(2, [['a', [3]], ['b', [7]]]),
    ])
    expect(standings[0].perGame).toEqual([10, 3])
    expect(standings[0].total).toBe(13)
    expect(standings[1].perGame).toEqual([4, 7])
    expect(standings[1].total).toBe(11)
  })

  it('勝ったゲーム数を数える', () => {
    const won = game(1, [
      ['a', [12]], ['b', [1]], ['a', [12]], ['b', [1]],
      ['a', [12]], ['b', [1]], ['a', [12]], ['b', [1]], ['a', [2]],
    ])
    expect(seriesStandings([won])[0].wins).toBe(1)
    expect(seriesStandings([won])[1].wins).toBe(0)
  })
})

describe('gamesOfSeries', () => {
  it('同じセットのゲームだけをゲーム番号順に返す', () => {
    const other = { ...game(1, []), id: 'x', seriesId: 's2' }
    const list = gamesOfSeries([game(2, []), other, game(1, [])], 's1')
    expect(list.map((item) => item.gameNumber)).toEqual([1, 2])
  })
})

/** a が 50 点で勝つゲーム。b は 1 点ずつで 4 点 */
const aWins: [string, number[]][] = [
  ['a', [12]], ['b', [1]], ['a', [12]], ['b', [1]],
  ['a', [12]], ['b', [1]], ['a', [12]], ['b', [1]], ['a', [2]],
]
/** b が 50 点で勝つゲーム。a は 10 点ずつで 40 点 */
const bWins: [string, number[]][] = [
  ['a', [10]], ['b', [12]], ['a', [10]], ['b', [12]],
  ['a', [10]], ['b', [12]], ['a', [10]], ['b', [12]], ['a', [1, 2]], ['b', [2]],
]

const withRules = (item: Game, rules: Partial<GameRules>): Game => ({
  ...item,
  rules: { ...item.rules, ...rules },
})

describe('seriesResult', () => {
  it('ゲーム数を決めていない試合は終わらない', () => {
    expect(seriesResult([game(1, aWins)]).finished).toBe(false)
  })

  it('2 ゲームの試合は勝ち数が並ぶと合計点で決める', () => {
    const rules = { gameCount: 2 }
    const result = seriesResult([withRules(game(1, aWins), rules), withRules(game(2, bWins), rules)])
    expect(result.finished).toBe(true)
    // a は 50 + 42、b は 4 + 50
    expect(result.winnerEntryId).toBe('a')
  })

  it('100 点ゲームは勝ち数より合計点を先に比べる', () => {
    const rules = { gameCount: 2, decideBy: 'total' as const }
    const lose = withRules(game(1, bWins), rules)
    const big = withRules(game(2, bWins), rules)
    expect(seriesResult([lose, big]).winnerEntryId).toBe('b')
  })

  it('2 ゲーム先取は 2 勝した時点で終わる', () => {
    const rules = { gameCount: 3 }
    const result = seriesResult([withRules(game(1, aWins), rules), withRules(game(2, aWins), rules)])
    expect(result.finished).toBe(true)
    expect(result.winnerEntryId).toBe('a')
  })

  it('1 勝 1 敗では 3 ゲーム目まで続く', () => {
    const rules = { gameCount: 3 }
    const result = seriesResult([withRules(game(1, aWins), rules), withRules(game(2, bWins), rules)])
    expect(result.finished).toBe(false)
  })

  it('時間切れで点が並んだら引き分け。首位が並んだ試合はモルックアウトの勝者で決まる', () => {
    const rules = { gameCount: 1 }
    const drawn = { ...withRules(game(1, [['a', [5]], ['b', [5]]]), rules), timeUpAt: 1 }
    const result = seriesResult([drawn])
    expect(result.finished).toBe(true)
    expect(result.standings.map((line) => line.draws)).toEqual([1, 1])
    expect(result.leaders.map((entry) => entry.id)).toEqual(['a', 'b'])
    expect(result.winnerEntryId).toBeNull()
    expect(seriesResult([{ ...drawn, shootoutWinnerId: 'b' }]).winnerEntryId).toBe('b')
  })

  it('時間切れで打ち切ると、残りのゲームがあってもその時点で試合を終える', () => {
    const rules = { gameCount: 2 }
    const cut = { ...withRules(game(1, [['a', [7]], ['b', [5]]]), rules), timeUpAt: 1 }
    const result = seriesResult([cut])
    expect(result.finished).toBe(true)
    expect(result.winnerEntryId).toBe('a')
  })
})

describe('nextEntries', () => {
  it('続きのゲームの投げる順番をルールどおりに決める', () => {
    const played = game(1, [['a', [7]], ['b', [5]]])
    expect(nextEntries([played]).map((entry) => entry.id)).toEqual(['b', 'a'])
    expect(nextEntries([withRules(played, { nextOrder: 'same' })]).map((entry) => entry.id)).toEqual(['a', 'b'])
    expect(nextEntries([withRules(played, { nextOrder: 'loserFirst' })]).map((entry) => entry.id)).toEqual(['b', 'a'])
  })
})

describe('ターン制限と最終ゲーム', () => {
  it('決めたターン数を全員が投げ終えたら、点の多い組の勝ち', () => {
    const rules = { maxTurns: 2 }
    const played = withRules(game(1, [['a', [7]], ['b', [5]], ['a', [3]], ['b', [9]]]), rules)
    const result = seriesResult([withRules(played, { gameCount: 1 })])
    expect(result.finished).toBe(true)
    expect(result.winnerEntryId).toBe('b')
  })

  it('最終ゲームはゲームを取った組だけで行い、出ない組の点は空ける', () => {
    const three = [...entries, { id: 'c', name: 'C', memberIds: ['m3'], handicap: 0 }]
    const rules = { gameCount: 3, maxTurns: 1, finalAmongWinners: true, nextOrder: 'same' as const }
    const first = { ...withRules(game(1, [['a', [9]], ['b', [5]], ['c', [1]]]), rules), entries: three }
    const second = {
      ...withRules(game(2, [['a', [1]], ['b', [8]], ['c', [2]]]), rules),
      id: 'g2',
      entries: three,
    }
    // 1 ゲーム目は a、2 ゲーム目は b が取ったので、3 ゲーム目は a と b だけ
    expect(nextEntries([first, second]).map((entry) => entry.id)).toEqual(['a', 'b'])

    const third = { ...withRules(game(3, [['a', [12]], ['b', [3]]]), rules), id: 'g3' }
    const result = seriesResult([first, second, third])
    expect(result.winnerEntryId).toBe('a')
    expect(result.standings.find((line) => line.entry.id === 'c')!.perGame).toEqual([1, 2, null])
  })
})

describe('時間切れ', () => {
  it('時間切れのあとはラウンドの終わりまで投げ、その時点の点数で決める', () => {
    const rules = { gameCount: 1 }
    // a が投げたところで時間切れ。b が投げるまでは続く
    const midway = { ...withRules(game(1, [['a', [7]]]), rules), timeUpAt: 1 }
    expect(seriesResult([midway]).finished).toBe(false)

    const done = { ...withRules(game(1, [['a', [7]], ['b', [9]]]), rules), timeUpAt: 1 }
    expect(seriesResult([done]).winnerEntryId).toBe('b')
  })

  it('時間切れのあとのラウンドで 50 点に届けば、ふつうに上がりで勝つ', () => {
    const rules = { gameCount: 1 }
    const throws: [string, number[]][] = [
      ['a', [12]], ['b', [1]], ['a', [12]], ['b', [1]], ['a', [12]], ['b', [1]], ['a', [12]], ['b', [1]],
      ['a', [2]],
    ]
    const reached = { ...withRules(game(1, throws), rules), timeUpAt: 1 }
    expect(seriesResult([reached]).winnerEntryId).toBe('a')
  })
})

