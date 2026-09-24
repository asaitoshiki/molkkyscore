import { Capacitor } from '@capacitor/core'
import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob'

/**
 * AdMob は端末の上でしか動かない。Web では何もしないでおく。
 */
export const isNative = () => Capacitor.isNativePlatform()

/**
 * 広告ユニット ID。いまは Google が公開しているテスト用の ID。
 * ストアに出す前に、AdMob で発行した自分のユニット ID に差し替えること。
 */
const INTERSTITIAL_UNIT = {
  android: 'ca-app-pub-3940256099942544/1033173712',
  ios: 'ca-app-pub-3940256099942544/4411468910',
} as const

/**
 * 起動時に一度だけ呼ぶ。
 * EU 圏では同意の取得が必須のため、必要なら同意フォームを出してから初期化する。
 */
export const initializeAds = async () => {
  if (!isNative()) return

  await AdMob.initialize({ initializeForTesting: true })

  const consent = await AdMob.requestConsentInfo()
  if (consent.status === AdmobConsentStatus.REQUIRED) {
    await AdMob.showConsentForm()
  }

  // iOS は広告識別子の利用許可を利用者に尋ねる必要がある
  if (Capacitor.getPlatform() === 'ios') {
    await AdMob.requestTrackingAuthorization()
  }
}

/** ゲームの区切りで全画面広告を出す。閉じられるまで待つ。 */
export const showInterstitial = async () => {
  const adId = Capacitor.getPlatform() === 'ios' ? INTERSTITIAL_UNIT.ios : INTERSTITIAL_UNIT.android
  await AdMob.prepareInterstitial({ adId })
  await AdMob.showInterstitial()
}
