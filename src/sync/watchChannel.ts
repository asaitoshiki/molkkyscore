import { buildWatchRecord, toWatchState } from '../domain/watchSnapshot'
import type { WatchRecord, WatchState } from '../domain/watchSnapshot'
import type { Game, Member } from '../domain/types'
import { database, signedInUid } from './firebase'

const pathOf = (shareId: string) => `watch/${shareId}`

/** 記録係の端末から、いまのセットの記録を送る。毎投ごとに丸ごと上書きする */
export const publishWatch = async (shareId: string, games: Game[], members: Member[]) => {
  const [{ ref, set }, db, uid] = await Promise.all([
    import('firebase/database'),
    database(),
    signedInUid(),
  ])
  await set(ref(db, pathOf(shareId)), buildWatchRecord(uid, games, members, Date.now()))
}

/** 共有をやめる。観戦している人の画面は「見つからない」に変わる */
export const removeWatch = async (shareId: string) => {
  const [{ ref, remove }, db] = await Promise.all([import('firebase/database'), database()])
  await signedInUid()
  await remove(ref(db, pathOf(shareId)))
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
