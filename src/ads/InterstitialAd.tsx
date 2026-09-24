import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/ui'
import { isNative, showInterstitial } from './admob'

const COUNTDOWN = 5

/**
 * ゲームの区切りで挟む全画面広告。
 * 端末の上では AdMob の広告を出し、Web では同じ間合いの代替画面を出す。
 */
export const InterstitialAd = ({ onClose }: { onClose: () => void }) => {
  const [native] = useState(isNative)
  const close = useRef(onClose)

  // 描画のたびに最新の呼び出し先を控えておく
  useEffect(() => {
    close.current = onClose
  })

  useEffect(() => {
    if (!native) return
    // 広告の読み込みに失敗しても、試合の進行は止めない
    showInterstitial().catch(() => undefined).finally(() => close.current())
  }, [native])

  if (native) return null
  return <WebFallback onClose={onClose} />
}

/** Web には配信できないため、間合いだけ同じ画面を出す。 */
const WebFallback = ({ onClose }: { onClose: () => void }) => {
  const [remaining, setRemaining] = useState(COUNTDOWN)

  useEffect(() => {
    const timer = setInterval(() => setRemaining((value) => Math.max(value - 1, 0)), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/95 px-6 py-10 text-paper">
      <p className="eyebrow text-paper/60">広告</p>
      <div className="flex flex-1 items-center justify-center">
        <p className="text-center text-[13px] text-paper/60">
          アプリ版では、ここに広告が表示されます
        </p>
      </div>
      <Button variant="outline" className="w-full" disabled={remaining > 0} onClick={onClose}>
        {remaining > 0 ? `${remaining} 秒後に閉じられます` : '閉じる'}
      </Button>
    </div>
  )
}
