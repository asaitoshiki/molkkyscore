import { buildEventMeta } from '../domain/event'
import type { CourtLive, EventMeta, Submission, SubmissionStatus } from '../domain/event'
import type { EventPlan } from '../domain/eventPlan'
import type { Game, Member } from '../domain/types'
import { encodeSeries, newShareId } from '../domain/watchSnapshot'
import { eventClient } from './firebase'

const { database, signedInUid } = eventClient

const pathOf = (eventId: string, ...rest: string[]) => ['events', eventId, ...rest].join('/')

/**
 * 値が変わるたびに受け取る。
 * 読み込みが終わる前に画面を離れても、あとから購読が始まらないようにしてある
 */
const subscribe = <T,>(path: string, onChange: (value: T | null) => void) => {
  let stop = () => {}
  let cancelled = false

  void Promise.all([import('firebase/database'), database()]).then(([{ ref, onValue }, db]) => {
    if (cancelled) return
    stop = onValue(ref(db, path), (snapshot) => onChange(snapshot.val() as T | null))
  })

  return () => {
    cancelled = true
    stop()
  }
}

const write = async (path: string, value: unknown) => {
  const [{ ref, set }, db] = await Promise.all([import('firebase/database'), database()])
  await set(ref(db, path), value)
}

/** 本部が大会を開く。大会 ID は QR で配る鍵を兼ねるので、推測されない長さにする */
export const createEvent = async (name: string, plan: EventPlan): Promise<string> => {
  const eventId = newShareId()
  const uid = await signedInUid()
  await write(pathOf(eventId, 'meta'), buildEventMeta(uid, name, plan, Date.now()))
  return eventId
}

/** 本部が大会プランを書き換える（組み合わせの公開、7m 投の結果、次のステージなど） */
export const updatePlan = async (eventId: string, plan: EventPlan) => {
  const [{ ref, update }, db] = await Promise.all([import('firebase/database'), database()])
  await signedInUid()
  await update(ref(db, pathOf(eventId, 'meta')), { plan: JSON.stringify(plan) })
}

export const subscribeMeta = (eventId: string, onChange: (meta: EventMeta | null) => void) =>
  subscribe<EventMeta>(pathOf(eventId, 'meta'), onChange)

/** 本部の画面で、全コートの様子と提出をまとめて受け取る */
export const subscribeLive = (
  eventId: string,
  onChange: (live: Record<string, CourtLive>) => void,
) => subscribe<Record<string, CourtLive>>(pathOf(eventId, 'live'), (value) => onChange(value ?? {}))

export const subscribeSubmissions = (
  eventId: string,
  onChange: (submissions: Record<string, Submission>) => void,
) =>
  subscribe<Record<string, Submission>>(pathOf(eventId, 'submissions'), (value) =>
    onChange(value ?? {}),
  )

export const subscribeSubmission = (
  eventId: string,
  submissionId: string,
  onChange: (submission: Submission | null) => void,
) => subscribe<Submission>(pathOf(eventId, 'submissions', submissionId), onChange)

/** この端末が本部か。大会を開いた端末だけが承認や差し戻しをできる */
export const currentUid = () => signedInUid()

/** コートの今の試合を本部へ流す。毎投ごとに丸ごと上書きする */
export const publishLive = async (
  eventId: string,
  matchKey: string,
  games: Game[],
  members: Member[],
) => {
  const uid = await signedInUid()
  const live: CourtLive = { matchKey, updatedAt: Date.now(), payload: encodeSeries(games, members) }
  await write(pathOf(eventId, 'live', uid), live)
}

/**
 * 試合の記録を本部へ提出する。置き場所は予定の試合ごとに決まっていて、差し戻されたら出し直す。
 * 電池が切れたときなどは別の端末からでも出し直せる。
 * 電波がなくても Firebase が覚えておき、つながった時点で送る（画面を開いている間）
 */
export const submitSeries = async (
  eventId: string,
  matchKey: string,
  games: Game[],
  members: Member[],
) => {
  const uid = await signedInUid()
  const submission: Submission = {
    courtUid: uid,
    submittedAt: Date.now(),
    payload: encodeSeries(games, members),
    status: 'submitted',
    note: '',
  }
  await write(pathOf(eventId, 'submissions', matchKey), submission)
}

/** 本部が提出を承認する、または理由を添えて差し戻す */
export const reviewSubmission = async (
  eventId: string,
  submissionId: string,
  status: SubmissionStatus,
  note: string,
) => {
  const [{ ref, update }, db] = await Promise.all([import('firebase/database'), database()])
  await signedInUid()
  await update(ref(db, pathOf(eventId, 'submissions', submissionId)), { status, note })
}
