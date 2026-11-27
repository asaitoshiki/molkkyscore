import { Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import {
  AdMob,
  AdmobConsentStatus,
  InterstitialAdPluginEvents,
} from '@capacitor-community/admob'
import { useAppStore } from '../store/useAppStore'

export const isNative = () => Capacitor.isNativePlatform()

// Google のテスト用 ID。公開前に AdMob で発行した広告ユニット ID を設定する。
const INTERSTITIAL_UNIT = {
  android: 'ca-app-pub-3940256099942544/1033173712',
  ios: 'ca-app-pub-3940256099942544/4411468910',
} as const

let consentForAds: Promise<boolean> | undefined
const initializeAds = async () => {
  const info = await AdMob.requestConsentInfo()
  const consent = info.status === AdmobConsentStatus.REQUIRED ? await AdMob.showConsentForm() : info
  if (!consent.canRequestAds || useAppStore.getState().adFree) return false

  await AdMob.initialize()
  if (Capacitor.getPlatform() === 'ios') await AdMob.requestTrackingAuthorization()
  return true
}

/** 広告を閉じるか表示に失敗するまで待つ。 */
export const showInterstitial = async (signal: AbortSignal) => {
  if (!isNative() || useAppStore.getState().adFree) return
  consentForAds ??= initializeAds()
  const canRequestAds = await consentForAds.catch(() => false)
  if (!canRequestAds) consentForAds = undefined
  if (!canRequestAds || signal.aborted || useAppStore.getState().adFree) return

  const adId = Capacitor.getPlatform() === 'ios' ? INTERSTITIAL_UNIT.ios : INTERSTITIAL_UNIT.android
  await AdMob.prepareInterstitial({ adId })

  const listeners: PluginListenerHandle[] = []
  let close!: () => void
  const closed = new Promise<void>((resolve) => { close = resolve })
  signal.addEventListener('abort', close, { once: true })
  try {
    listeners.push(await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, close))
    listeners.push(await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, close))
    if (signal.aborted || useAppStore.getState().adFree) return

    await AdMob.showInterstitial({ adId })
    await closed
  } finally {
    signal.removeEventListener('abort', close)
    await Promise.allSettled(listeners.map((listener) => listener.remove()))
  }
}
