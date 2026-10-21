import { findMatch, matchesOf, withPlanDefaults } from './eventPlan'
import type { EventPlan, MatchResult, Stage } from './eventPlan'
import { seriesPoints } from './points'
import { seriesResult } from './series'
import { decodeSeries } from './watchSnapshot'
import type { SeriesPayload } from './watchSnapshot'

/**
 * 本部とコートで動かす大会（このアプリの中の「大会」とは別もの）。
 *
 * 本部が大会を作って QR を配り、各コートの記録係（選手どうしのセルフジャッジ）が
 * 自分の端末で記録する。試合中の様子は本部に流れ続け、終わったら両チームで確かめて提出する。
 * 本部は提出されたスコアシートを見て、承認するか差し戻す。
 *
 * データベースの置き場所:
 *   events/{大会ID}/meta              本部だけが書ける大会の設定
 *   events/{大会ID}/live/{記録係}     コートの今の試合。投げるたびに上書き
 *   events/{大会ID}/submissions/{試合} 提出されたスコアシートと本部の判定
 */

/** 本部が作る大会の設定。配列や null を消さないよう、大会プランは JSON 文字列で持つ */
export type EventMeta = {
  ownerUid: string
  name: string
  plan: string
  createdAt: number
  expiresAt: number
}

/** コートの今の試合 */
export type CourtLive = {
  matchKey: string
  updatedAt: number
  payload: string
}

export type SubmissionStatus = 'submitted' | 'approved' | 'returned'

/** 提出されたスコアシート。置き場所は試合ごとに決まり、差し戻されたら同じ場所に出し直す */
export type Submission = {
  courtUid: string
  submittedAt: number
  payload: string
  status: SubmissionStatus
  /** 差し戻しの理由 */
  note: string
}

/** 大会を開いておける期間。片付けを忘れても、これを過ぎたらコートからは入れない */
export const EVENT_TTL_MS = 7 * 24 * 60 * 60 * 1000

export const SUBMISSION_LABEL: Record<SubmissionStatus, string> = {
  submitted: '確認待ち',
  approved: '承認済み',
  returned: '差し戻し',
}

/** 大会の設定を、画面で使える形に戻したもの */
export type EventInfo = {
  name: string
  plan: EventPlan
  ownerUid: string
  expiresAt: number
}

export const toEventInfo = (meta: EventMeta): EventInfo => ({
  name: meta.name,
  // 古い版で作った大会でも開けるよう、足りない項目を補う
  plan: withPlanDefaults(JSON.parse(meta.plan) as Parameters<typeof withPlanDefaults>[0]),
  ownerUid: meta.ownerUid,
  expiresAt: meta.expiresAt,
})

export const buildEventMeta = (
  ownerUid: string,
  name: string,
  plan: EventPlan,
  now: number,
): EventMeta => ({
  ownerUid,
  name: name.trim(),
  plan: JSON.stringify(plan),
  createdAt: now,
  expiresAt: now + EVENT_TTL_MS,
})

/** 提出されたスコアシートから、順位の計算に要る数字を取り出す。ポイントはステージの決まりで数える */
const toMatchResult = (stage: Stage, submission: Submission): MatchResult => {
  const { games } = decodeSeries(submission.payload)
  const result = seriesResult(games)
  return {
    sets: Object.fromEntries(result.standings.map((line) => [line.entry.id, line.wins])),
    score: Object.fromEntries(result.standings.map((line) => [line.entry.id, line.total])),
    rankPoints: seriesPoints(games, stage.points),
    winnerId: result.winnerEntryId,
    approved: submission.status === 'approved',
  }
}

/** 試合ごとの結果。差し戻した試合は数えない（直して出し直すまで結果が無いのと同じ） */
export const resultsOf = (
  plan: EventPlan,
  submissions: Record<string, Submission>,
): Record<string, MatchResult> =>
  Object.fromEntries(
    Object.entries(submissions)
      .filter(([, submission]) => submission.status !== 'returned')
      .map(([key, submission]) => [key, toMatchResult(findMatch(plan, key).stage, submission)]),
  )

/** 本部の一覧に出す 1 試合のまとめ */
export type MatchSummary = {
  teams: { name: string; perGame: (number | null)[]; total: number; wins: number }[]
  winnerName: string | null
  finished: boolean
  /** 今投げているゲーム（試合中の表示用） */
  gameNumber: number
}

export const summarize = (series: SeriesPayload): MatchSummary => {
  const result = seriesResult(series.games)
  // 投げた順ではなく、最初のゲームの並び（チーム 1 / チーム 2）のまま見せる
  const base = series.games[0].entries.map(
    (entry) => result.standings.find((standing) => standing.entry.id === entry.id)!,
  )
  return {
    teams: base.map((standing) => ({
      name: standing.entry.name,
      perGame: standing.perGame,
      total: standing.total,
      wins: standing.wins,
    })),
    winnerName: base.find((standing) => standing.entry.id === result.winnerEntryId)?.entry.name ?? null,
    finished: result.finished,
    gameNumber: series.games.at(-1)!.gameNumber,
  }
}

const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`

/**
 * 提出された試合を表計算ソフトで開ける形にする。1 行が 1 チーム。
 * 本部が記録の保管や表彰の確認に使う
 */
export const submissionsCsv = (plan: EventPlan, submissions: Record<string, Submission>): string => {
  // 先取は何ゲームまで続くか決まっていないので、実際にいちばん長かった試合に列を合わせる
  const gameCount = Math.max(
    1,
    ...Object.values(submissions).map((submission) => decodeSeries(submission.payload).games.length),
  )
  const games = Array.from({ length: gameCount }, (_, index) => index)
  const rows = plan.stages.flatMap((stage) =>
    matchesOf(stage)
      .filter((match) => submissions[match.key] !== undefined)
      .flatMap((match) => {
        const submission = submissions[match.key]
        const group = stage.groups.find((item) => item.id === match.groupId)!
        const series = decodeSeries(submission.payload)
        const summary = summarize(series)
        const points = seriesPoints(series.games, stage.points)
        return summary.teams.map((team, index) => [
          stage.name,
          group.label,
          match.key,
          team.name,
          // 先取で早く決まった試合や、出なかったゲームは空欄にして列をそろえる
          ...games.map((index) => team.perGame[index] ?? ''),
          team.total,
          team.wins,
          points[series.games[0].entries[index].id],
          team.name === summary.winnerName ? '勝ち' : '',
          SUBMISSION_LABEL[submission.status],
        ])
      }),
  )
  const header = [
    'ステージ',
    'グループ',
    '試合',
    '名前',
    ...games.map((index) => `第${index + 1}ゲーム`),
    '合計',
    '勝ったゲーム',
    'ポイント',
    '勝敗',
    '状態',
  ]
  // Excel で文字化けしないよう、先頭に BOM を付ける
  return '\ufeff' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}
