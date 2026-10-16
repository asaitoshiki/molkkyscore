import { seriesResult } from './series'
import type { GameRules } from './types'
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

/** 本部が作る大会の設定。配列や null を消さないよう、ルールとチーム名は JSON 文字列で持つ */
export type EventMeta = {
  ownerUid: string
  name: string
  rules: string
  teams: string
  courtCount: number
  createdAt: number
  expiresAt: number
}

/** コートの今の試合 */
export type CourtLive = {
  court: number
  updatedAt: number
  payload: string
}

export type SubmissionStatus = 'submitted' | 'approved' | 'returned'

/** 提出されたスコアシート。差し戻されたら同じ場所に出し直す */
export type Submission = {
  courtUid: string
  court: number
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
  rules: GameRules
  teams: string[]
  courtCount: number
  ownerUid: string
  expiresAt: number
}

export const toEventInfo = (meta: EventMeta): EventInfo => ({
  name: meta.name,
  rules: JSON.parse(meta.rules) as GameRules,
  teams: JSON.parse(meta.teams) as string[],
  courtCount: meta.courtCount,
  ownerUid: meta.ownerUid,
  expiresAt: meta.expiresAt,
})

export const buildEventMeta = (
  ownerUid: string,
  name: string,
  rules: GameRules,
  teams: string[],
  courtCount: number,
  now: number,
): EventMeta => ({
  ownerUid,
  name: name.trim(),
  rules: JSON.stringify(rules),
  teams: JSON.stringify(teams),
  courtCount,
  createdAt: now,
  expiresAt: now + EVENT_TTL_MS,
})

/** 本部の一覧に出す 1 試合のまとめ */
export type MatchSummary = {
  teams: { name: string; perGame: number[]; total: number; wins: number }[]
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
 * 本部が順位表や記録の保管に使う
 */
export const submissionsCsv = (submissions: Submission[], gameCount: number): string => {
  const games = Array.from({ length: gameCount }, (_, index) => index)
  const rows = [...submissions]
    .sort((a, b) => a.submittedAt - b.submittedAt)
    .flatMap((submission) => {
      const summary = summarize(decodeSeries(submission.payload))
      const time = new Date(submission.submittedAt).toLocaleString('ja-JP')
      return summary.teams.map((team) => [
        time,
        submission.court,
        team.name,
        // 先取で早く決まった試合は、やらなかったゲームを空欄にして列をそろえる
        ...games.map((index) => team.perGame[index] ?? ''),
        team.total,
        team.wins,
        team.name === summary.winnerName ? '勝ち' : '',
        SUBMISSION_LABEL[submission.status],
      ])
    })
  const header = [
    '提出時刻',
    'コート',
    'チーム',
    ...games.map((index) => `第${index + 1}ゲーム`),
    '合計',
    '勝ち数',
    '勝敗',
    '状態',
  ]
  // Excel で文字化けしないよう、先頭に BOM を付ける
  return '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}
