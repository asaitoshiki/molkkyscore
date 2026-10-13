import type { FirebaseApp, FirebaseOptions } from 'firebase/app'

/**
 * Firebase の接続設定。
 *
 * アプリに埋め込む前提の公開情報で、秘密ではない。
 * 誰が何を読み書きできるかは database.rules.json のルールで守る。
 */
const FIREBASE_CONFIG: FirebaseOptions = {
  apiKey: '',
  authDomain: '',
  databaseURL: '',
  projectId: '',
  appId: '',
}

/**
 * 必要になるまで読み込まない。観戦を使わない人に Firebase の重さを負わせないため。
 * 観戦する側はデータベースだけ、記録係は認証も使う。
 */
let appLoading: Promise<FirebaseApp> | null = null
const app = () =>
  (appLoading ??= import('firebase/app').then(({ initializeApp }) => initializeApp(FIREBASE_CONFIG)))

export const database = async () => {
  const [{ getDatabase }, firebaseApp] = await Promise.all([import('firebase/database'), app()])
  return getDatabase(firebaseApp)
}

/** 記録係を匿名で識別する。同じ端末なら次に起動しても同じ人として扱われる */
export const signedInUid = async (): Promise<string> => {
  const [{ getAuth, signInAnonymously }, firebaseApp] = await Promise.all([
    import('firebase/auth'),
    app(),
  ])
  const auth = getAuth(firebaseApp)
  await auth.authStateReady()
  return auth.currentUser?.uid ?? (await signInAnonymously(auth)).user.uid
}
