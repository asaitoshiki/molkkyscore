import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Icon } from './Icon'
import { Button } from './ui'
import { watchUrl } from '../domain/sharing'

/**
 * 観戦してもらうための案内。
 * 周りの人はアプリを入れずに、読み取ってブラウザで開くだけで見られる。
 */
export const WatchInvite = ({ seriesId, onClose }: { seriesId: string; onClose: () => void }) => {
  const url = watchUrl(seriesId)
  const [image, setImage] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void QRCode.toDataURL(url, {
      width: 560,
      margin: 1,
      color: { dark: '#15191a', light: '#fbfbfa' },
    }).then(setImage)
  }, [url])

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'モルックのスコア', url }).catch(() => undefined)
      return
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/80 px-6 py-10">
      <div className="m-auto w-full max-w-sm rounded border border-rule bg-paper px-6 py-7 text-center">
        <p className="eyebrow text-muted">WATCH TOGETHER</p>
        <p className="mt-1 font-serif text-2xl">観戦してもらう</p>
        <p className="mt-2 text-[13px] text-muted">
          読み取るとブラウザで開きます。アプリを入れる必要はありません。
        </p>

        {image !== '' && (
          <img src={image} alt="観戦用の QR コード" className="mx-auto mt-5 w-52 rounded" />
        )}

        <p className="mt-4 break-all text-[11px] text-faint">{url}</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
          <Button className="flex items-center justify-center gap-1.5 whitespace-nowrap text-[14px]" onClick={share}>
            <Icon name="share" size={16} />
            {copied ? 'コピーしました' : 'リンクを送る'}
          </Button>
        </div>
      </div>
    </div>
  )
}
