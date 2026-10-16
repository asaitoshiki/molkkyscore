import { buildEventMeta } from '../domain/event'
import type { CourtLive, EventMeta, Submission, SubmissionStatus } from '../domain/event'
import type { Game, GameRules, Member } from '../domain/types'
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
export const createEvent = async (
  name: string,
  rules: GameRules,
  teams: string[],
  courtCount: number,
): Promise<string> => {
  const eventId = newShareId()
  const uid = await signedInUid()
  await write(pathOf(eventId, 'meta'), buildEventMeta(uid, name, rules, teams, courtCount, Date.now()))
  return eventId
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
export const publishLive = async (eventId: string, court: number, games: Game[], members: Member[]) => {
  const uid = await signedInUid()
  const live: CourtLive = { court, updatedAt: Date.now(), payload: encodeSeries(games, members) }
  await write(pathOf(eventId, 'live', uid), live)
}

/**
 * 試合の記録を本部へ提出する。差し戻されたものは同じ場所に出し直す。
 * 電波がなくても Firebase が覚えておき、つながった時点で送る（画面を開いている間）
 */
export const submitSeries = async (
  eventId: string,
  submissionId: string,
  court: number,
  games: Game[],
  members: Member[],
) => {
  const uid = await signedInUid()
  const submission: Submission = {
    courtUid: uid,
    court,
    submittedAt: Date.now(),
    payload: encodeSeries(games, members),
    status: 'submitted',
    note: '',
  }
  await write(pathOf(eventId, 'submissions', submissionId), submission)
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
