import type { FirebaseApp, FirebaseOptions } from 'firebase/app'
import type { Auth } from 'firebase/auth'
import type { Database } from 'firebase/database'

/**
 * Firebase の接続設定。
 *
 * アプリに埋め込む前提の公開情報で、秘密ではない。
 * 誰が何を読み書きできるかは database.rules.json のルールで守る。
 */
const FIREBASE_CONFIG: FirebaseOptions = {
  apiKey: 'AIzaSyCCchq0sogL38VoQ_PbFCrwpB4DnxvOxHQ',
  authDomain: 'molkkyscore-223e5.firebaseapp.com',
  databaseURL: 'https://molkkyscore-223e5-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'molkkyscore-223e5',
  storageBucket: 'molkkyscore-223e5.firebasestorage.app',
  messagingSenderId: '785626497777',
  appId: '1:785626497777:web:6ee5bcf6f254bcb959df50',
}

/**
 * 大会（本部とコート）の接続設定。
 * 普段の観戦と同時接続の上限を取り合わないよう、大会専用のプロジェクトに分けられるようにしてある。
 * 専用のプロジェクトを作るまでは観戦と同じプロジェクトを使う
 */
const EVENT_FIREBASE_CONFIG: FirebaseOptions = FIREBASE_CONFIG

/**
 * 開発中に手元の Firebase エミュレーターへつなぐときだけ設定する（例：127.0.0.1）。
 * 公開する版では空のままにして、本物のデータベースを使う
 */
const EMULATOR_HOST: string = import.meta.env.VITE_FIREBASE_EMULATOR ?? ''

export type FirebaseClient = {
  database: () => Promise<Database>
  /** 匿名で識別する。同じ端末なら次に起動しても同じ人として扱われる */
  signedInUid: () => Promise<string>
}

/**
 * 必要になるまで読み込まない。使わない人に Firebase の重さを負わせないため。
 * 名前を分けて初期化すると、同じ画面から観戦用と大会用の両方につなげる
 */
const createClient = (config: FirebaseOptions, name: string): FirebaseClient => {
  let appLoading: Promise<FirebaseApp> | null = null
  const app = () =>
    (appLoading ??= import('firebase/app').then(({ initializeApp }) => initializeApp(config, name)))

  let databaseLoading: Promise<Database> | null = null
  const database = () =>
    (databaseLoading ??= Promise.all([import('firebase/database'), app()]).then(
      ([{ getDatabase, connectDatabaseEmulator }, firebaseApp]) => {
        const db = getDatabase(firebaseApp)
        if (EMULATOR_HOST) connectDatabaseEmulator(db, EMULATOR_HOST, 9000)
        return db
      },
    ))

  let authLoading: Promise<Auth> | null = null
  const auth = () =>
    (authLoading ??= Promise.all([import('firebase/auth'), app()]).then(
      ([{ getAuth, connectAuthEmulator }, firebaseApp]) => {
        const instance = getAuth(firebaseApp)
        if (EMULATOR_HOST) connectAuthEmulator(instance, `http://${EMULATOR_HOST}:9099`)
        return instance
      },
    ))

  return {
    database,
    signedInUid: async () => {
      const [{ signInAnonymously }, instance] = await Promise.all([import('firebase/auth'), auth()])
      await instance.authStateReady()
      return instance.currentUser?.uid ?? (await signInAnonymously(instance)).user.uid
    },
  }
}

/** 普段の観戦用。名前は Firebase の既定のものにして、これまでのログイン状態を引き継ぐ */
const watchClient = createClient(FIREBASE_CONFIG, '[DEFAULT]')
export const { database, signedInUid } = watchClient

/** 大会用 */
export const eventClient = createClient(EVENT_FIREBASE_CONFIG, 'event')
