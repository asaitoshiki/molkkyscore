import { DEFAULT_POINT_RULES } from './points'
import type { PointRules } from './points'
import { DEFAULT_RULES } from './rules'
import type { GameRules } from './types'

/**
 * 本部で運営する大会の進め方（大会プラン）。
 *
 * 大会はいくつかのステージ（予選リーグ → 決勝トーナメント 1 回戦 → 準決勝 → 決勝 など）で進み、
 * ステージごとにルールを変えられる（決勝だけ 100 点ゲーム、予選だけ 15 ターン制限など）。
 * ステージは「グループ」に分かれる。リーグならブロック（5 チームで総当たりなど）、
 * トーナメントなら 1 試合（3 チーム対戦なら 3 チーム）がひとつのグループになる。
 * 順位はステージごとに決めた基準（ポイント・勝ったゲーム数・合計点）の順に比べ、
 * それでも並んだら 7m 投などの結果を本部が入れる。
 *
 * プランは本部だけが書き換え、各コートは読むだけ。試合の結果は提出されたスコアシートから
 * 毎回計算し、プランには持たない。
 */

export type Player = { id: string; name: string }

export type StageFormat = 'league' | 'knockout'

/** 順位を比べる数字。ポイント（ポイント制）、勝ったゲーム数、合計点 */
export type RankKey = 'rankPoints' | 'sets' | 'score'

export const RANK_KEY_LABEL: Record<RankKey, string> = {
  rankPoints: 'ポイント',
  sets: '勝ったゲーム数',
  score: '合計点',
}

export type Group = {
  id: string
  /** コートに貼る名前。A1 や 第 1 試合 など */
  label: string
  playerIds: string[]
}

export type Stage = {
  id: string
  name: string
  format: StageFormat
  rules: GameRules
  /** 1 グループのチーム数。リーグはブロックのチーム数、トーナメントは 1 試合のチーム数 */
  groupSize: number
  /**
   * リーグの試合の組み方。null は 1 対 1 の総当たり。
   * 数を入れると、ブロックの中で matchSize チームずつの試合をその回数だけ行う（相手は毎回入れ替える）
   */
  rounds: number | null
  /** リーグで rounds を決めたときの、1 試合のチーム数 */
  matchSize: number
  /** 各グループから次のステージへ進むチーム数 */
  advancePerGroup: number
  /** 各グループで次点だったチームから、成績順に拾う数（敗者復活）。0 なら拾わない */
  wildcards: number
  /** 順位を比べる順。前の数字が並んだら次の数字で比べ、全部並んだら 7m 投などで決める */
  ranking: RankKey[]
  /** ポイント制のとき、ゲームの順位ごとに配るポイント */
  points: PointRules
  /** 同点を 7m 投などで決めた結果の並び。キーはグループ ID、敗者復活は WILDCARD_KEY */
  tiebreaks: Record<string, string[]>
  groups: Group[]
  /** コートに公開したか。公開前は本部だけが組み合わせを直せる */
  started: boolean
}

export type EventPlan = { players: Player[]; stages: Stage[] }

export const WILDCARD_KEY = 'wildcard'

export const FORMAT_LABEL: Record<StageFormat, string> = {
  league: 'リーグ',
  knockout: 'トーナメント',
}

/** 順位の決め方を一文で。ポイント → 合計点 → 7m 投など */
export const rankingLabel = (stage: Stage): string =>
  [...stage.ranking.map((key) => RANK_KEY_LABEL[key]), '7m 投など'].join(' → ')

/** ポイントの配り方を一文で。上がり 10P・15 ターン 8P・2 位 6P・3 位 2P */
export const pointsLabel = (stage: Stage): string =>
  [
    `上がり ${stage.points.targetWin}P`,
    `${stage.rules.maxTurns === null ? '時間切れ' : `${stage.rules.maxTurns} ターン`} ${stage.points.cutoffWin}P`,
    ...stage.points.places.map((value, index) => `${index + 2} 位 ${value}P`),
  ].join('・')

/** 予定されている 1 試合。key は提出の置き場所を兼ねる */
export type PlanMatch = {
  key: string
  stageId: string
  groupId: string
  /** 何巡目の試合か。リーグで 2 コートを同時に回す順番の目安 */
  round: number
  playerIds: string[]
}

/** 試合のスコアシートから取り出した、順位の計算に要る数字 */
export type MatchResult = {
  /** 勝ったゲーム数 */
  sets: Record<string, number>
  /** 合計点 */
  score: Record<string, number>
  /** ポイント制のポイント */
  rankPoints: Record<string, number>
  winnerId: string | null
  approved: boolean
}

const matchKey = (stageId: string, groupId: string, index: number) =>
  `${stageId}-${groupId}-${index}`

/**
 * 総当たりの組み合わせ。サークル法で、同じ巡に同じ人が 2 度出ないようにする。
 * 5 人なら 5 巡 × 2 試合で、毎巡 1 人が休みになる
 */
const roundRobin = (ids: string[]): { round: number; pair: string[] }[] => {
  const slots: (string | null)[] = ids.length % 2 === 0 ? [...ids] : [...ids, null]
  const size = slots.length
  const pairs: { round: number; pair: string[] }[] = []
  for (let round = 1; round <= size - 1; round += 1) {
    for (let index = 0; index < size / 2; index += 1) {
      const pair = [slots[index], slots[size - 1 - index]]
      if (pair.every((id) => id !== null)) pairs.push({ round, pair: pair as string[] })
    }
    // 先頭を固定して残りを 1 つずつ回す
    slots.splice(1, 0, slots.pop()!)
  }
  return pairs
}

const pairKey = (a: string, b: string) => [a, b].sort().join('/')

/**
 * 何チームかずつの試合を rounds 回。同じ相手と何度も当たらないよう、
 * それまでに当たった回数がいちばん少ない相手から順に組む。
 * チーム数が割り切れなければ、少ないチームの試合ができる。
 * 投げる順は登録順を巡ごとに 1 つずつずらして、どのチームにも先に投げる回が来るようにする
 */
const rotation = (ids: string[], size: number, rounds: number): { round: number; pair: string[] }[] => {
  const met = new Map<string, number>()
  const meetings = (a: string, b: string) => met.get(pairKey(a, b)) ?? 0
  const count = Math.max(1, Math.ceil(ids.length / size))
  const sizes = Array.from(
    { length: count },
    (_, index) => Math.floor(ids.length / count) + Number(index < ids.length % count),
  )
  return Array.from({ length: rounds }, (_, index) => index + 1).flatMap((round) => {
    const pool = [...ids.slice(round - 1), ...ids.slice(0, round - 1)]
    const groups = sizes.map((groupSize) => {
      const group = [pool.shift()!]
      while (group.length < groupSize) {
        const cost = (id: string) => group.reduce((sum, member) => sum + meetings(id, member), 0)
        const best = pool.reduce((picked, id) => (cost(id) < cost(picked) ? id : picked))
        group.push(best)
        pool.splice(pool.indexOf(best), 1)
      }
      return group
    })
    groups.forEach((group) =>
      group.forEach((a, position) =>
        group.slice(position + 1).forEach((b) => met.set(pairKey(a, b), meetings(a, b) + 1)),
      ),
    )
    return groups.map((group) => {
      const ordered = ids.filter((id) => group.includes(id))
      const shift = (round - 1) % ordered.length
      return { round, pair: [...ordered.slice(shift), ...ordered.slice(0, shift)] }
    })
  })
}

/** リーグの組み合わせ。回数を決めていなければ 1 対 1 の総当たり */
const leagueSchedule = (stage: Stage, ids: string[]) =>
  stage.rounds === null ? roundRobin(ids) : rotation(ids, stage.matchSize, stage.rounds)

/** グループの試合。リーグはブロック内の試合、トーナメントは 1 グループ 1 試合 */
const GROUP_MATCHES: Record<StageFormat, (stage: Stage, group: Group) => PlanMatch[]> = {
  league: (stage, group) =>
    leagueSchedule(stage, group.playerIds).map(({ round, pair }, index) => ({
      key: matchKey(stage.id, group.id, index + 1),
      stageId: stage.id,
      groupId: group.id,
      round,
      playerIds: pair,
    })),
  // 1 人だけのグループ（不戦勝）は試合をしない
  knockout: (stage, group) =>
    group.playerIds.length < 2
      ? []
      : [
          {
            key: matchKey(stage.id, group.id, 1),
            stageId: stage.id,
            groupId: group.id,
            round: 1,
            playerIds: group.playerIds,
          },
        ],
}

export const matchesOf = (stage: Stage): PlanMatch[] =>
  stage.groups.flatMap((group) => GROUP_MATCHES[stage.format](stage, group))

/** 順位の計算に使う、チームごとの成績 */
type Totals = { playerId: string; sets: number; score: number; rankPoints: number }

export type GroupStanding = Totals & {
  played: number
  /** 並び順。勝ち抜けはこの順で決まる */
  rank: number
  /** 画面に出す順位。成績がまったく同じチームは同じ順位にする */
  place: number
  /** 並びが決まらない同点。7m 投などで決める必要がある */
  tied: boolean
}

/** ステージで決めた基準の順に、成績を比べる。大きいほうが上 */
const compareTotals = (stage: Stage, a: Totals, b: Totals) =>
  stage.ranking.reduce((result, key) => result || b[key] - a[key], 0)

/**
 * 成績で並べる。数字が同じなら 7m 投などの結果（tiebreak の並び）に従い、
 * それも無ければ同点のまま印を付ける。印を付けるのは、同点の人たちが
 * 勝ち抜け・次点などの境目（boundaries の順位）をまたぐときだけ
 */
const rankLines = <T extends Totals>(
  stage: Stage,
  lines: T[],
  tiebreak: string[],
  boundaries: number[],
): (T & { rank: number; place: number; tied: boolean })[] => {
  const order = (id: string) => {
    const index = tiebreak.indexOf(id)
    return index === -1 ? Infinity : index
  }
  const sorted = [...lines].sort(
    (a, b) => compareTotals(stage, a, b) || order(a.playerId) - order(b.playerId),
  )
  // 7m 投の並びに入ったチームは、入っていないチームより上。どちらも入っていなければ決まっていない
  const unresolved = (a: T, b: T) =>
    compareTotals(stage, a, b) === 0 && order(a.playerId) === Infinity && order(b.playerId) === Infinity
  const crosses = (a: number, b: number) =>
    boundaries.some((boundary) => Math.min(a, b) < boundary && Math.max(a, b) >= boundary)

  const before = (a: T, b: T) =>
    compareTotals(stage, a, b) < 0 ||
    (compareTotals(stage, a, b) === 0 && order(a.playerId) < order(b.playerId))

  return sorted.map((line, index) => ({
    ...line,
    rank: index + 1,
    place: 1 + sorted.filter((other) => before(other, line)).length,
    tied: sorted.some(
      (other, position) => position !== index && unresolved(line, other) && crosses(index, position),
    ),
  }))
}

/** グループの順位。トーナメントの 1 試合は、勝った人を先頭にする */
export const groupStandings = (
  stage: Stage,
  group: Group,
  results: Record<string, MatchResult>,
): GroupStanding[] => {
  const played = matchesOf(stage).filter(
    (match) => match.groupId === group.id && results[match.key] !== undefined,
  )
  const lines = group.playerIds.map((playerId) => {
    const mine = played.filter((match) => match.playerIds.includes(playerId))
    return {
      playerId,
      played: mine.length,
      sets: mine.reduce((sum, match) => sum + results[match.key].sets[playerId], 0),
      score: mine.reduce((sum, match) => sum + results[match.key].score[playerId], 0),
      rankPoints: mine.reduce((sum, match) => sum + results[match.key].rankPoints[playerId], 0),
      // トーナメントでは試合の勝者を何より先に置く
      won: mine.filter((match) => results[match.key].winnerId === playerId).length,
    }
  })
  // 勝ち抜けの境目と、敗者復活があるなら次点の境目。
  // 試合が残っているうちは順位が動くので、同点の印はすべての結果がそろってから付ける
  const complete = matchesOf(stage)
    .filter((match) => match.groupId === group.id)
    .every((match) => results[match.key] !== undefined)
  const boundaries = complete
    ? [stage.advancePerGroup, stage.advancePerGroup + Math.min(stage.wildcards, 1)]
    : []
  const tiebreak =
    stage.format === 'knockout'
      ? // 試合の勝者は、モルックアウトまで含めてスコアシートで決まっている
        lines.filter((line) => line.won > 0).map((line) => line.playerId)
      : (stage.tiebreaks[group.id] ?? [])
  return rankLines(stage, lines, tiebreak, boundaries).map(({ won: _won, ...line }) => line)
}

/** グループの試合がすべて提出され、承認されたか */
export const groupDone = (stage: Stage, group: Group, results: Record<string, MatchResult>) =>
  matchesOf(stage)
    .filter((match) => match.groupId === group.id)
    .every((match) => results[match.key]?.approved === true)

export type Qualification = {
  /** 次のステージへ進む人。組み合わせの種（シード）の順に並ぶ */
  playerIds: string[]
  /** 敗者復活の候補（各グループの次点）の順位 */
  wildcardPool: (GroupStanding & { groupId: string })[]
  /** まだ進めない理由。空なら次のステージを組める */
  blockers: string[]
}

/**
 * ステージを勝ち抜けたチーム。各グループの上位と、次点からの敗者復活。
 * 並びは次のステージの組み合わせ（シード）に使う。グループ順位 → ステージの順位の基準
 */
export const qualify = (stage: Stage, results: Record<string, MatchResult>): Qualification => {
  const standings = stage.groups.map((group) => ({
    group,
    lines: groupStandings(stage, group, results),
  }))
  const blockers = [
    ...standings
      .filter(({ group }) => !groupDone(stage, group, results))
      .map(({ group }) => `${group.label}：まだ承認していない試合があります`),
    ...standings
      .filter(({ lines }) => lines.some((line) => line.tied))
      .map(({ group }) => `${group.label}：同点の順位を決めてください`),
  ]

  const winners = standings
    .flatMap(({ lines }) => lines.filter((line) => line.rank <= stage.advancePerGroup))
    .sort((a, b) => a.rank - b.rank || compareTotals(stage, a, b))

  const pool = standings.flatMap(({ group, lines }) =>
    lines
      .filter((line) => line.rank === stage.advancePerGroup + 1)
      .map((line) => ({ ...line, groupId: group.id })),
  )
  const allDone = standings.every(({ group }) => groupDone(stage, group, results))
  const wildcardPool = rankLines(
    stage,
    pool,
    stage.tiebreaks[WILDCARD_KEY] ?? [],
    allDone ? [stage.wildcards] : [],
  )
  const wildcardBlockers = wildcardPool.some((line) => line.tied)
    ? ['敗者復活：同点の順位を決めてください']
    : []

  return {
    playerIds: [
      ...winners.map((line) => line.playerId),
      ...wildcardPool.slice(0, stage.wildcards).map((line) => line.playerId),
    ],
    wildcardPool,
    blockers: [...blockers, ...wildcardBlockers],
  }
}

/** グループの名前。リーグはブロック名（A1, A2…）、トーナメントは試合番号 */
const GROUP_LABEL: Record<StageFormat, (index: number) => string> = {
  league: (index) => `A${index + 1}`,
  knockout: (index) => `第 ${index + 1} 試合`,
}

/**
 * 人をグループに分ける。上位どうしが早く当たらないよう、シード順に蛇行して配る
 * （4 グループなら 1→2→3→4→4→3→2→1→1…）。人数が割り切れなければ、少ないグループができる
 */
export const drawGroups = (stage: Stage, seededIds: string[]): Group[] => {
  const count = Math.max(1, Math.ceil(seededIds.length / stage.groupSize))
  const groups: Group[] = Array.from({ length: count }, (_, index) => ({
    id: `g${index + 1}`,
    label: GROUP_LABEL[stage.format](index),
    playerIds: [],
  }))
  seededIds.forEach((playerId, index) => {
    const lap = Math.floor(index / count)
    const position = index % count
    groups[lap % 2 === 0 ? position : count - 1 - position].playerIds.push(playerId)
  })
  return groups
}

/** 2 つのグループの間で 2 人を入れ替える。本部が組み合わせを手で直すのに使う */
export const swapPlayers = (groups: Group[], a: string, b: string): Group[] =>
  groups.map((group) => ({
    ...group,
    playerIds: group.playerIds.map((id) => (id === a ? b : id === b ? a : id)),
  }))

/** コートで記録できるステージ。公開した中で最後のもの。まだ何も公開していなければ null */
export const activeStage = (plan: EventPlan): Stage | null =>
  plan.stages.filter((stage) => stage.started).at(-1) ?? null

/** 試合の呼び名。A3・4 試合目、準決勝・第 2 試合 など */
export const matchLabel = (stage: Stage, match: PlanMatch): string => {
  const group = stage.groups.find((item) => item.id === match.groupId)!
  const number = match.key.split('-').at(-1)
  return stage.format === 'league' ? `${group.label}・${number} 試合目` : `${stage.name}・${group.label}`
}

/** 参加者の名前を引く */
export const nameOf = (plan: EventPlan, playerId: string): string =>
  plan.players.find((player) => player.id === playerId)!.name

/** 予定の試合を探す。どのステージの試合かも一緒に返す */
export const findMatch = (plan: EventPlan, key: string): { stage: Stage; match: PlanMatch } => {
  const stage = plan.stages.find((item) => key.startsWith(`${item.id}-`))!
  return { stage, match: matchesOf(stage).find((item) => item.key === key)! }
}

/** ステージの中身を差し替えた大会プラン。本部の操作はすべてこれで書き換える */
export const replaceStage = (plan: EventPlan, stageId: string, patch: Partial<Stage>): EventPlan => ({
  ...plan,
  stages: plan.stages.map((stage) => (stage.id === stageId ? { ...stage, ...patch } : stage)),
})

/** 新しいステージ。はじめは 1 対 1 のトーナメント */
export const newStage = (index: number, patch: Partial<Stage>): Stage => ({
  id: `s${index + 1}`,
  name: '',
  format: 'knockout',
  rules: { ...DEFAULT_RULES, gameCount: 1 },
  groupSize: 2,
  advancePerGroup: 1,
  wildcards: 0,
  rounds: null,
  matchSize: 2,
  ranking: ['sets'],
  points: DEFAULT_POINT_RULES,
  tiebreaks: {},
  groups: [],
  started: false,
  ...patch,
})

/** 3 チーム対戦の 2 ゲーム先取。あと 1 ゲームで勝ちのチームが 2 つそろったら、その 2 チームで行う */
const THREE_WAY_RULES: GameRules = {
  ...DEFAULT_RULES,
  gameCount: 2,
  decideBy: 'race',
  finalAmongWinners: true,
  timeLimitMinutes: 40,
}

export type PlanTemplate = {
  label: string
  note: string
  build: (players: Player[]) => Stage[]
}

/** トーナメントのラウンド名。決勝から数える */
const roundName = (fromFinal: number, round: number) =>
  ['決勝', '準決勝', '準々決勝'][fromFinal] ?? `${round} 回戦`

/**
 * よく使う大会の形。選んだあとステージごとに直せる。
 * 1 つ目は第 1 回兵庫県モルックシングルス大会のレギュレーションと同じ形
 */
export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    label: '予選リーグ＋決勝トーナメント',
    note: 'ブロックごとの総当たりで予選を行い、各ブロックの上位と敗者復活のチームが決勝トーナメントに進みます',
    build: () => [
      newStage(0, {
        name: '予選',
        format: 'league',
        rules: { ...DEFAULT_RULES, gameCount: 2, decideBy: 'wins', maxTurns: 15 },
        groupSize: 5,
        advancePerGroup: 1,
        wildcards: 4,
      }),
      newStage(1, { name: '決勝トーナメント 1 回戦', rules: THREE_WAY_RULES, groupSize: 3 }),
      newStage(2, { name: '準決勝', rules: THREE_WAY_RULES, groupSize: 3 }),
      newStage(3, {
        name: '決勝',
        rules: { ...THREE_WAY_RULES, timeLimitMinutes: null },
        groupSize: 3,
        advancePerGroup: 1,
      }),
    ],
  },
  {
    label: '総当たりリーグのみ',
    note: 'ブロックに分けて総当たりを行い、各ブロックの順位を決めます',
    build: () => [
      newStage(0, {
        name: 'リーグ',
        format: 'league',
        rules: { ...DEFAULT_RULES, gameCount: 2, decideBy: 'wins' },
        groupSize: 5,
      }),
    ],
  },
  {
    label: 'ポイント制リーグ',
    note: 'ブロックのチームで何試合か行い、各ゲームの順位に応じたポイントの合計で順位を決めます',
    build: () => [
      newStage(0, {
        name: '予選',
        format: 'league',
        rules: { ...DEFAULT_RULES, gameCount: 1, maxTurns: 15 },
        groupSize: 4,
        rounds: 4,
        matchSize: 4,
        ranking: ['rankPoints', 'score'],
      }),
    ],
  },
  {
    label: 'トーナメント（1 対 1）',
    note: '1 対 1 で対戦して勝ち上がります。ラウンドの数は参加チームの数に合わせて作ります',
    build: (players) => {
      const rounds = Math.max(1, Math.ceil(Math.log2(Math.max(players.length, 2))))
      return Array.from({ length: rounds }, (_, index) =>
        newStage(index, {
          name: roundName(rounds - 1 - index, index + 1),
          rules: { ...DEFAULT_RULES, gameCount: 1 },
          groupSize: 2,
        }),
      )
    },
  },
]

type AddedFields = 'rounds' | 'matchSize' | 'ranking' | 'points'

/** 古い版で作ったステージ。あとから足した項目が欠け、合計点で並びを決めるかを旗で持っていた */
export type LegacyStage = Omit<Stage, AddedFields> &
  Partial<Pick<Stage, AddedFields>> & { pointsBreakTies?: boolean }

/** 古い版で作った大会プランに、あとから増えた項目（試合の組み方・順位の基準・ポイント）を補う */
export const withPlanDefaults = (plan: { players: Player[]; stages: LegacyStage[] }): EventPlan => ({
  ...plan,
  stages: plan.stages.map(({ pointsBreakTies, ...stage }) => ({
    ...stage,
    rounds: stage.rounds ?? null,
    matchSize: stage.matchSize ?? 2,
    ranking: stage.ranking ?? (pointsBreakTies ? ['sets', 'score'] : ['sets']),
    points: stage.points ?? DEFAULT_POINT_RULES,
  })),
})

/** 参加チームの名前の並びから参加者を作る。ID は並び順で振る */
export const playersFromNames = (names: string[]): Player[] =>
  names.map((name, index) => ({ id: `p${index + 1}`, name: name.trim() }))

/**
 * 足すチームの名前の初期値。番号の名前のうち一番大きいものの次（ゼッケン番号のように使える）。
 * 途中の名前を変えていても、末尾に足した番号が前に戻らないようにする
 */
export const nextNumberName = (names: string[]): string =>
  String(Math.max(0, ...names.filter((name) => /^\d+$/.test(name)).map(Number)) + 1)

/** チーム数を合わせる。増やすときは番号の名前を後ろに足し、減らすときは後ろから外す */
export const resizeNames = (names: string[], count: number): string[] =>
  count <= names.length ? names.slice(0, count) : resizeNames([...names, nextNumberName(names)], count)

/** 最初のステージの組み合わせ。参加者を入れた順（またはシャッフルした順）に配る */
export const startPlan = (players: Player[], stages: Stage[]): EventPlan => ({
  players,
  stages: stages.map((stage, index) =>
    index === 0
      ? { ...stage, groups: drawGroups(stage, players.map((player) => player.id)) }
      : stage,
  ),
})

/** 参加者の並びをばらばらにする。ブロック分けを抽選にしたいとき用 */
export const shuffled = <T,>(items: T[], random: () => number = Math.random): T[] => {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[copy[index], copy[target]] = [copy[target], copy[index]]
  }
  return copy
}
