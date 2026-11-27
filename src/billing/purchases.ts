import { Capacitor } from '@capacitor/core'
import { AD_FREE_PRODUCT_ID } from '../domain/billing'
import { useAppStore } from '../store/useAppStore'

export const isStorePlatform = () => Capacitor.isNativePlatform()

const product = () => ({
  id: AD_FREE_PRODUCT_ID,
  platform: Capacitor.getPlatform() === 'ios'
    ? CdvPurchase.Platform.APPLE_APPSTORE
    : CdvPurchase.Platform.GOOGLE_PLAY,
})

const offer = () => CdvPurchase.store.get(AD_FREE_PRODUCT_ID, product().platform)?.getOffer()
const listeners = new Set<() => void>()
let snapshot: { ready: boolean; price?: string } = { ready: false }

export const getPurchaseOptions = () => snapshot
export const subscribePurchaseOptions = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

const updateOptions = (ready: boolean) => {
  snapshot = { ready, price: offer()?.pricingPhases[0]?.price }
  listeners.forEach((listener) => listener())
}

const syncOwned = () => {
  // 通信できない起動時も、端末に保存した購入済みの状態は維持する。
  if (CdvPurchase.store.owned(product())) useAppStore.getState().setAdFree(true)
}

export const initializePurchases = async () => {
  if (!isStorePlatform()) return
  // Capacitor の Cordova プラグインは deviceready のあとで利用できる。
  await new Promise<void>((resolve) =>
    document.addEventListener('deviceready', () => resolve(), { once: true }),
  )
  if (typeof CdvPurchase === 'undefined') return

  const { store, ProductType } = CdvPurchase
  store.register([{ ...product(), type: ProductType.NON_CONSUMABLE }])
  store.when()
    .productUpdated(() => updateOptions(snapshot.ready))
    .approved((transaction) => transaction.finish())
    .finished(syncOwned)
    .receiptsReady(syncOwned)

  await store.initialize([product().platform])
  updateOptions(store.checkSupport(product().platform, 'order'))
  syncOwned()
}

/** 購入の確定と広告の停止は、ストアから届く購入イベントで行う。 */
export const purchaseAdFree = async (): Promise<string | null> => {
  if (!snapshot.ready || !snapshot.price) return '価格を取得できませんでした。'
  const purchaseOffer = offer()
  if (!purchaseOffer) return '商品を読み込めませんでした。'

  const error = await CdvPurchase.store.order(purchaseOffer)
  if (!error || error.code === CdvPurchase.ErrorCode.PAYMENT_CANCELLED) return null
  return '購入できませんでした。時間をおいてお試しください。'
}

export const restoreAdFree = async (): Promise<string | null> => {
  if (!snapshot.ready) return 'ストアに接続できませんでした。'
  const error = await CdvPurchase.store.restorePurchases()
  if (error) return '購入を復元できませんでした。通信状況をご確認ください。'

  const owned = CdvPurchase.store.owned(product())
  if (owned || Capacitor.getPlatform() === 'android') useAppStore.getState().setAdFree(owned)
  return owned ? null : 'このストアアカウントの購入が見つかりませんでした。'
}
