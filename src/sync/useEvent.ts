import { useEffect, useState } from 'react'
import { toEventInfo } from '../domain/event'
import type { CourtLive, EventInfo, Submission } from '../domain/event'
import {
  currentUid,
  subscribeLive,
  subscribeMeta,
  subscribeSubmission,
  subscribeSubmissions,
} from './eventChannel'

export type EventState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'ended' }
  | { kind: 'ready'; info: EventInfo }

/** 大会の設定を受け取る。期限を過ぎた大会は終わったものとして扱う */
export const useEventInfo = (eventId: string): EventState => {
  const [state, setState] = useState<EventState>({ kind: 'loading' })
  useEffect(
    () =>
      subscribeMeta(eventId, (meta) => {
        // 大会プランを持たない古い形の大会は、今の画面では開けない
        if (meta === null || meta.plan === undefined) return setState({ kind: 'missing' })
        if (meta.expiresAt < Date.now()) return setState({ kind: 'ended' })
        setState({ kind: 'ready', info: toEventInfo(meta) })
      }),
    [eventId],
  )
  return state
}

export const useCourtLive = (eventId: string) => {
  const [live, setLive] = useState<Record<string, CourtLive>>({})
  useEffect(() => subscribeLive(eventId, setLive), [eventId])
  return live
}

export const useSubmissions = (eventId: string) => {
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({})
  useEffect(() => subscribeSubmissions(eventId, setSubmissions), [eventId])
  return submissions
}

/** undefined は読み込み中、null はまだ提出していない */
export const useSubmission = (eventId: string, submissionId: string) => {
  const [submission, setSubmission] = useState<Submission | null | undefined>(undefined)
  useEffect(
    () => subscribeSubmission(eventId, submissionId, setSubmission),
    [eventId, submissionId],
  )
  return submission
}

/** この端末の大会用の匿名 ID。本部かどうかの判定に使う */
export const useEventUid = () => {
  const [uid, setUid] = useState<string | null>(null)
  useEffect(() => {
    void currentUid().then(setUid)
  }, [])
  return uid
}
