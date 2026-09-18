import { useEffect, useState } from 'react'
import { Button } from '../components/ui'

const COUNTDOWN = 5

/**
 * ゲームの区切りで挟む全画面広告。
 * 規定の秒数が経つまで閉じられない点まで、実際の配信に合わせてある。
 * ネイティブ化のときに、この画面を AdMob のインタースティシャルへ差し替える。
 */
export const InterstitialAd = ({ onClose }: { onClose: () => void }) => {
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
