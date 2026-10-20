import { describe, expect, it } from 'vitest'
import {
  PLAN_TEMPLATES,
  WILDCARD_KEY,
  drawGroups,
  groupStandings,
  matchesOf,
  playersFromNames,
  resizeNames,
  qualify,
  startPlan,
  swapPlayers,
  withPlanDefaults,
} from './eventPlan'
import type { MatchResult, PlanMatch, Stage } from './eventPlan'

const players = (count: number) =>
  playersFromNames(Array.from({ length: count }, (_, index) => `選手${index + 1}`))

const [hyogo] = PLAN_TEMPLATES

/** 2 チームの試合の結果。勝ったゲーム数を渡すと、合計点とポイントもそれに合わせて作る */
const duel = (match: PlanMatch, sets: [number, number], approved = true): MatchResult => {
  const [first, second] = match.playerIds
  return {
    sets: { [first]: sets[0], [second]: sets[1] },
    score: { [first]: sets[0] * 50, [second]: sets[1] * 50 },
    rankPoints: { [first]: sets[0] * 10, [second]: sets[1] * 10 },
    winnerId: sets[0] > sets[1] ? first : sets[1] > sets[0] ? second : null,
    approved,
  }
}

/** ブロック 1 つのリーグ。同じ人を何度も使うので、人数ぶんだけ作る */
const leagueOf = (count: number, patch: Partial<Stage> = {}): Stage => {
  const stage = { ...hyogo.build(players(count))[0], ...patch }
  return { ...stage, groups: drawGroups(stage, players(count).map((player) => player.id)) }
}

describe('大会プラン', () => {
  it('チーム数を増やすと空いている番号を名前にして足し、減らすと後ろから外す', () => {
    expect(resizeNames(['1', 'ひまわり'], 4)).toEqual(['1', 'ひまわり', '2', '3'])
    expect(resizeNames(['1', '2', '3'], 1)).toEqual(['1'])
    // 途中の名前を変えても、番号は一番大きいものの続きになる
    expect(resizeNames(['1', 'ひまわり', '3'], 4)).toEqual(['1', 'ひまわり', '3', '4'])
    expect(playersFromNames([' A ', 'B'])).toEqual([
      { id: 'p1', name: 'A' },
      { id: 'p2', name: 'B' },
    ])
  })

  it('5 人ブロックの総当たりは 10 試合で、各人 4 試合・5 巡で毎巡 2 試合', () => {
    const matches = matchesOf(leagueOf(5))
    expect(matches).toHaveLength(10)
    for (const player of ['p1', 'p2', 'p3', 'p4', 'p5']) {
      expect(matches.filter((match) => match.playerIds.includes(player))).toHaveLength(4)
    }
    for (const round of [1, 2, 3, 4, 5]) {
      expect(matches.filter((match) => match.round === round)).toHaveLength(2)
    }
    expect(new Set(matches.map((match) => match.key)).size).toBe(10)
  })

  it('グループ分けはシード順に蛇行して配り、入れ替えもできる', () => {
    const stage = hyogo.build([])[1]
    const groups = drawGroups(stage, ['1', '2', '3', '4', '5', '6'])
    expect(groups.map((group) => group.playerIds)).toEqual([
      ['1', '4', '5'],
      ['2', '3', '6'],
    ])
    const swapped = swapPlayers(groups, '5', '6')
    expect(swapped.map((group) => group.playerIds)).toEqual([
      ['1', '4', '6'],
      ['2', '3', '5'],
    ])
  })

  it('兵庫の形：115 人は 23 ブロック、1 位 23 人と敗者復活 4 人の 27 人が 9 試合に進む', () => {
    const plan = startPlan(players(115), hyogo.build(players(115)))
    const [league, firstRound, semi, final] = plan.stages
    expect(league.groups).toHaveLength(23)
    expect(league.groups.every((group) => group.playerIds.length === 5)).toBe(true)
    expect(matchesOf(league)).toHaveLength(230)

    // 各ブロック、上から順に強いことにする（1 番目が 4 戦全勝 = 8 ゲーム、2 番目は 6 ゲーム…）。
    // A5 以降は 2 番目と 3 番目の試合の 1 ゲームが引き分けで、2 番目は 5 ゲームにとどまる。
    // 敗者復活は A1〜A4 の 2 番目（6 ゲーム）の 4 人になる
    const results = Object.fromEntries(
      matchesOf(league).map((match) => {
        const group = league.groups.find((item) => item.id === match.groupId)!
        const [a, b] = match.playerIds.map((id) => group.playerIds.indexOf(id))
        const drawn = Number(group.id.slice(1)) > 4 && Math.min(a, b) === 1 && Math.max(a, b) === 2
        const won: [number, number] = a < b ? [2, 0] : [0, 2]
        const score: [number, number] = drawn ? (a < b ? [1, 0] : [0, 1]) : won
        return [match.key, duel(match, score)]
      }),
    )
    const result = qualify(league, results)
    expect(result.blockers).toEqual([])
    expect(result.playerIds).toHaveLength(27)
    expect(result.playerIds.slice(23)).toEqual(
      ['g1', 'g2', 'g3', 'g4'].map((id) => league.groups.find((group) => group.id === id)!.playerIds[1]),
    )

    expect(drawGroups(firstRound, result.playerIds)).toHaveLength(9)
    expect(drawGroups(semi, Array.from({ length: 9 }, (_, index) => `${index}`))).toHaveLength(3)
    expect(drawGroups(final, ['x', 'y', 'z'])).toHaveLength(1)
    expect(final.rules.timeLimitMinutes).toBeNull()
    expect(firstRound.rules.finalAmongWinners).toBe(true)
  })

  it('1 位が並んだら 7m 投の結果で決めるまで進めない', () => {
    const stage = leagueOf(3, { wildcards: 0 })
    // p1 は p2 に、p2 は p3 に、p3 は p1 に勝つ。3 人とも 1 勝 1 敗で、勝ったゲーム数も 2 ずつ並ぶ
    const beats: Record<string, string> = { p1: 'p2', p2: 'p3', p3: 'p1' }
    const results = Object.fromEntries(
      matchesOf(stage).map((match) => {
        const [a, b] = match.playerIds
        return [match.key, duel(match, beats[a] === b ? [2, 0] : [0, 2])]
      }),
    )
    const group = stage.groups[0]
    expect(groupStandings(stage, group, results).some((line) => line.tied)).toBe(true)
    expect(qualify(stage, results).blockers).toEqual(['A1：同点の順位を決めてください'])

    const decided = { ...stage, tiebreaks: { [group.id]: ['p3', 'p1', 'p2'] } }
    const lines = groupStandings(decided, group, results)
    expect(lines.map((line) => line.playerId)).toEqual(['p3', 'p1', 'p2'])
    expect(qualify(decided, results)).toMatchObject({ playerIds: ['p3'], blockers: [] })
  })

  it('試合が残っているうちは、数字が並んでいても同点の印を付けない', () => {
    const stage = leagueOf(3, { wildcards: 0 })
    expect(groupStandings(stage, stage.groups[0], {}).some((line) => line.tied)).toBe(false)
  })

  it('承認していない試合が残っていると進めない', () => {
    const stage = leagueOf(2, { wildcards: 0 })
    const [match] = matchesOf(stage)
    expect(qualify(stage, { [match.key]: duel(match, [2, 0], false) }).blockers).toEqual([
      'A1：まだ承認していない試合があります',
    ])
  })

  it('敗者復活は各ブロックの次点から勝ったゲーム数の順に拾い、境目の同点は決めるまで待つ', () => {
    const stage = { ...leagueOf(4, { wildcards: 1, groupSize: 2 }) }
    // 2 人ずつ 2 ブロック。どちらも 2 番手が 1 ゲームずつ取って並ぶ
    const results = Object.fromEntries(matchesOf(stage).map((match) => [match.key, duel(match, [1, 0])]))
    const pending = qualify(stage, results)
    expect(pending.wildcardPool.map((line) => line.sets)).toEqual([0, 0])
    expect(pending.blockers).toEqual(['敗者復活：同点の順位を決めてください'])

    const second = pending.wildcardPool[1].playerId
    const decided = { ...stage, tiebreaks: { [WILDCARD_KEY]: [second] } }
    expect(qualify(decided, results).playerIds.at(-1)).toBe(second)
  })

  it('3 人対戦の 1 試合は勝った人が勝ち抜け、ゲーム数が並んでもモルックアウトの勝者が上に来る', () => {
    const stage = hyogo.build([])[1]
    const withGroups = { ...stage, groups: drawGroups(stage, ['a', 'b', 'c']) }
    const [match] = matchesOf(withGroups)
    const results = {
      [match.key]: {
        sets: { a: 1, b: 1, c: 0 },
        score: { a: 60, b: 90, c: 20 },
        rankPoints: { a: 16, b: 16, c: 4 },
        winnerId: 'a',
        approved: true,
      },
    }
    expect(qualify(withGroups, results)).toMatchObject({ playerIds: ['a'], blockers: [] })
  })

  it('1 対 1 のトーナメントで人数が半端なら、1 人だけの組は試合なしで勝ち抜け', () => {
    const [first] = PLAN_TEMPLATES[3].build(players(3))
    const stage = { ...first, groups: drawGroups(first, ['a', 'b', 'c']) }
    expect(stage.groups.map((group) => group.playerIds)).toEqual([['a'], ['b', 'c']])
    const [match] = matchesOf(stage)
    expect(qualify(stage, { [match.key]: duel(match, [0, 1]) }).playerIds).toEqual(['c', 'a'])
  })

  it('何チームかずつの試合は、決めた回数だけ相手を入れ替えて組む', () => {
    const [points] = PLAN_TEMPLATES[2].build([])
    const stage = { ...points, groupSize: 6, matchSize: 3, rounds: 4 }
    const withGroups = { ...stage, groups: drawGroups(stage, players(6).map((player) => player.id)) }
    const matches = matchesOf(withGroups)
    // 6 チームを 3 チームずつ 2 試合 × 4 回
    expect(matches).toHaveLength(8)
    expect(matches.every((match) => match.playerIds.length === 3)).toBe(true)
    for (const id of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']) {
      expect(matches.filter((match) => match.playerIds.includes(id))).toHaveLength(4)
    }
    // 同じ巡に 2 度出るチームはいない
    for (const round of [1, 2, 3, 4]) {
      const ids = matches.filter((match) => match.round === round).flatMap((match) => match.playerIds)
      expect(new Set(ids).size).toBe(6)
    }
    // 1 回目の相手とは 2 回目に当たらない
    const [first] = matches
    const second = matches.filter((match) => match.round === 2)
    expect(second.some((match) => first.playerIds.every((id) => match.playerIds.includes(id)))).toBe(false)
  })

  it('ブロック全員で何試合かするときは、どのチームにも先に投げる回が来る', () => {
    const [points] = PLAN_TEMPLATES[2].build([])
    const withGroups = { ...points, groups: drawGroups(points, ['a', 'b', 'c', 'd']) }
    expect(matchesOf(withGroups).map((match) => match.playerIds[0])).toEqual(['a', 'b', 'c', 'd'])
  })

  it('ポイント制はポイントの合計で並べ、並んだら合計点で決める', () => {
    const [points] = PLAN_TEMPLATES[2].build([])
    const stage = { ...points, groupSize: 3, matchSize: 3, rounds: 1, advancePerGroup: 1 }
    const withGroups = { ...stage, groups: drawGroups(stage, ['a', 'b', 'c']) }
    const [match] = matchesOf(withGroups)
    const results = {
      [match.key]: {
        sets: { a: 0, b: 0, c: 1 },
        score: { a: 40, b: 45, c: 30 },
        rankPoints: { a: 8, b: 8, c: 2 },
        winnerId: null,
        approved: true,
      },
    }
    const lines = groupStandings(withGroups, withGroups.groups[0], results)
    // 勝ったゲーム数は c が多いが、ポイントでは a と b が上。並んだ a と b は合計点で b が上
    expect(lines.map((line) => line.playerId)).toEqual(['b', 'a', 'c'])
    expect(lines.some((line) => line.tied)).toBe(false)
  })

  it('成績がまったく同じチームは、画面では同じ順位で出す', () => {
    const [points] = PLAN_TEMPLATES[2].build([])
    const stage = { ...points, groupSize: 4, matchSize: 4, rounds: 1 }
    const withGroups = { ...stage, groups: drawGroups(stage, ['a', 'b', 'c', 'd']) }
    const [match] = matchesOf(withGroups)
    const results = {
      [match.key]: {
        sets: { a: 1, b: 0, c: 0, d: 0 },
        score: { a: 50, b: 4, c: 4, d: 4 },
        rankPoints: { a: 10, b: 6, c: 6, d: 6 },
        winnerId: 'a',
        approved: true,
      },
    }
    const lines = groupStandings(withGroups, withGroups.groups[0], results)
    expect(lines.map((line) => line.place)).toEqual([1, 2, 2, 2])
  })

  it('古い形のステージには、あとから増えた項目を補う', () => {
    const { rounds, matchSize, ranking, points, ...old } = PLAN_TEMPLATES[0].build([])[0]
    expect([rounds, matchSize, ranking, points]).toBeDefined()
    const [stage] = withPlanDefaults({ players: [], stages: [{ ...old, pointsBreakTies: true }] }).stages
    expect(stage).toMatchObject({ rounds: null, matchSize: 2, ranking: ['sets', 'score'] })
    expect('pointsBreakTies' in stage).toBe(false)
  })
})
