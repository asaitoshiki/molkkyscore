import { useEffect, useRef, useState } from 'react'
import { isNative, showInterstitial } from './admob'

/**
 * ゲームの区切りで挟む全画面広告。アプリ版だけで出す。
 *
 * Web には AdMob を配信できない（Web 向けの SDK が無い）。以前は代わりに
 * 5 秒の足止め画面を出していたが、収益にならない面で摩擦だけ増やしていたため
 * やめた。Web の広告は各ページの PromoBlock で出す。
 */
export const InterstitialAd = ({ onClose }: { onClose: () => void }) => {
  const [native] = useState(isNative)
  const close = useRef(onClose)

  // 描画のたびに最新の呼び出し先を控えておく
  useEffect(() => {
    close.current = onClose
  })

  useEffect(() => {
    // 広告の読み込みに失敗しても、試合の進行は止めない
    if (!native) {
      close.current()
      return
    }
    showInterstitial().catch(() => undefined).finally(() => close.current())
  }, [native])

  return null
}
