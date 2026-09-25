import { Capacitor } from '@capacitor/core'
import { AD_FREE_PRODUCT_ID } from '../domain/billing'

/** ストアの課金は端末の上でしか動かない。Web では購入画面を案内だけにする。 */
export const isStoreAvailable = () =>
  Capacitor.isNativePlatform() && typeof CdvPurchase !== 'undefined'

const storePlatform = () =>
  Capacitor.getPlatform() === 'ios'
    ? CdvPurchase.Platform.APPLE_APPSTORE
    : CdvPurchase.Platform.GOOGLE_PLAY

/** Cordova のプラグインは deviceready のあとでないと使えない。 */
const whenDeviceReady = () =>
  new Promise<void>((resolve) => document.addEventListener('deviceready', () => resolve(), { once: true }))

/**
 * 起動時に一度だけ呼ぶ。購入済みだと分かったときに onOwned が呼ばれる。
 *
 * 購入していない状態は通知しない。通信できないときに「未購入」と判定して
 * 広告を出してしまうと、支払った人の体験を壊すため。
 * 取り消しや返金の反映は「購入を復元する」に任せる。
 */
export const initializePurchases = async (onOwned: () => void) => {
  if (!isStoreAvailable()) return
  await whenDeviceReady()

  const { store, ProductType } = CdvPurchase
  const notifyWhenOwned = () => store.owned(AD_FREE_PRODUCT_ID) && onOwned()

  store.register([
    { id: AD_FREE_PRODUCT_ID, type: ProductType.NON_CONSUMABLE, platform: storePlatform() },
  ])
  store
    .when()
    .approved((transaction) => transaction.finish())
    .finished(notifyWhenOwned)
    .receiptsReady(notifyWhenOwned)

  await store.initialize([storePlatform()])
  notifyWhenOwned()
}

/** 購入する。成功なら null、失敗なら利用者に見せる文言を返す。 */
export const purchaseAdFree = async (): Promise<string | null> => {
  const offer = CdvPurchase.store.get(AD_FREE_PRODUCT_ID)?.getOffer()
  if (!offer) return '商品を読み込めませんでした。通信状況を確認してからお試しください。'

  const error = await CdvPurchase.store.order(offer)
  return error === undefined ? null : error.message
}

/** 機種変更などのあとに購入を引き継ぐ。ストア審査で必須の導線。 */
export const restoreAdFree = async (): Promise<string | null> => {
  const error = await CdvPurchase.store.restorePurchases()
  return error === undefined ? null : error.message
}
