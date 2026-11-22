import { buildWatchRecord, buildWatchThrow, toWatchState } from '../domain/watchSnapshot'
import type { WatchRecord, WatchState, WatchThrow } from '../domain/watchSnapshot'
import type { Game, Member } from '../domain/types'
import { database, signedInUid } from './firebase'

const pathOf = (shareId: string) => `watch/${shareId}`

/** 観戦する人が送る投球の置き場。記録は丸ごと上書きするので、別の場所に分ける */
const inputPathOf = (shareId: string) => `watchInput/${shareId}`

/** 記録係の端末から、いまのセットの記録を送る。毎投ごとに丸ごと上書きする */
export const publishWatch = async (
  shareId: string,
  games: Game[],
  members: Member[],
  openInput: boolean,
) => {
  const [{ ref, set }, db, uid] = await Promise.all([
    import('firebase/database'),
    database(),
    signedInUid(),
  ])
  await set(ref(db, pathOf(shareId)), buildWatchRecord(uid, games, members, Date.now(), openInput))
}

/** 共有をやめる。観戦している人の画面は「見つからない」に変わる */
export const removeWatch = async (shareId: string) => {
  const [{ ref, remove }, db] = await Promise.all([import('firebase/database'), database()])
  await signedInUid()
  await Promise.all([remove(ref(db, inputPathOf(shareId))), remove(ref(db, pathOf(shareId)))])
}

/** 観戦する人の端末から、いまの局面に対する 1 投を送る */
export const sendWatchThrow = async (shareId: string, game: Game, pins: number[]) => {
  const [{ ref, push }, db, uid] = await Promise.all([
    import('firebase/database'),
    database(),
    signedInUid(),
  ])
  await push(ref(db, inputPathOf(shareId)), buildWatchThrow(uid, game, pins, Date.now()))
}

/** 読む許可がまだ無いとき（共有の記録を送り終える前など）に、つなぎ直すまでの間 */
const RETRY_MS = 3_000

/**
 * 記録係の端末で、観戦する人から届いた投球を順に受け取る。
 * 受け取ったものは記録したかどうかに関わらず消し、同じ入力を二度扱わない。
 * 読めるのは共有の記録を送った本人だけなので、最初の送信より先に始まって断られたら、少し待ってつなぎ直す
 */
export const subscribeWatchThrows = (shareId: string, onThrow: (input: WatchThrow) => void) => {
  let stop = () => {}
  let cancelled = false
  let retry: ReturnType<typeof setTimeout> | undefined

  const listen = () =>
    void Promise.all([import('firebase/database'), database(), signedInUid()]).then(
      ([{ ref, onChildAdded, remove }, db]) => {
        if (cancelled) return
        stop = onChildAdded(
          ref(db, inputPathOf(shareId)),
          (snapshot) => {
            onThrow(snapshot.val() as WatchThrow)
            void remove(snapshot.ref)
          },
          () => {
            retry = setTimeout(listen, RETRY_MS)
          },
        )
      },
    )
  listen()

  return () => {
    cancelled = true
    clearTimeout(retry)
    stop()
  }
}

/**
 * 観戦する人の端末で、記録が変わるたびに受け取る。
 * 読み込みが終わる前に画面を離れても、あとから購読が始まらないようにしてある。
 */
export const subscribeWatch = (shareId: string, onChange: (state: WatchState) => void) => {
  let stop = () => {}
  let cancelled = false

  void Promise.all([import('firebase/database'), database()]).then(([{ ref, onValue }, db]) => {
    if (cancelled) return
    stop = onValue(ref(db, pathOf(shareId)), (snapshot) =>
      onChange(toWatchState(snapshot.val() as WatchRecord | null, Date.now())),
    )
  })

  return () => {
    cancelled = true
    stop()
  }
}
