import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Icon } from './Icon'
import { Button } from './ui'
import { watchUrl } from '../domain/sharing'
import { newShareId } from '../domain/watchSnapshot'
import type { Game, Member } from '../domain/types'
import { publishWatch, removeWatch } from '../sync/watchChannel'
import { useAppStore } from '../store/useAppStore'

/** 電波が無いと書き込みが返ってこないため、待つのはここまでにする */
const CONNECT_TIMEOUT_MS = 10_000

type Status = 'preparing' | 'ready' | 'failed'

/**
 * 観戦してもらうための案内。
 * 周りの人はアプリを入れずに、読み取ってブラウザで開くだけで見られる。
 *
 * 開いた時点で一度記録を送り、届いたことを確かめてから QR を出す。
 * 共有中として覚えたあとの送信は、試合画面が毎投ごとに受け持つ。
 */
export const WatchInvite = ({
  seriesId,
  seriesGames,
  members,
  onClose,
}: {
  seriesId: string
  seriesGames: Game[]
  members: Member[]
  onClose: () => void
}) => {
  const sharedId = useAppStore((state) => state.shares[seriesId])
  const startShare = useAppStore((state) => state.startShare)
  const endShare = useAppStore((state) => state.endShare)
  // 共有中ならその鍵を使い続ける。配ったリンクが変わらないように
  const [shareId] = useState(() => sharedId ?? newShareId())
  const [status, setStatus] = useState<Status>('preparing')
  const [image, setImage] = useState('')
  const [copied, setCopied] = useState(false)
  const url = watchUrl(shareId)
  // 開いたときの記録を一度だけ送る。以降の送信は試合画面に任せる
  const opening = useRef({ seriesGames, members })

  useEffect(() => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), CONNECT_TIMEOUT_MS),
    )
    const { seriesGames: games, members: people } = opening.current
    Promise.race([publishWatch(shareId, games, people), timeout])
      .then(() => {
        startShare(seriesId, shareId)
        setStatus('ready')
      })
      .catch(() => setStatus('failed'))
  }, [shareId, seriesId, startShare])

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

  const stopSharing = async () => {
    endShare(seriesId)
    onClose()
    await removeWatch(shareId)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/80 px-6 py-10">
      <div className="m-auto w-full max-w-sm rounded border border-rule bg-paper px-6 py-7 text-center">
        <p className="eyebrow text-muted">WATCH TOGETHER</p>
        <p className="mt-1 font-serif text-2xl">観戦してもらう</p>
        <p className="mt-2 text-[13px] text-muted">
          読み取るとブラウザで開きます。アプリを入れる必要はありません。
        </p>

        {status === 'preparing' && <p className="mt-8 mb-6 text-[13px] text-muted">つないでいます…</p>}

        {status === 'failed' && (
          <p className="mt-8 mb-6 text-[13px] text-alert">
            インターネットにつながらないため、観戦用のリンクを作れませんでした。電波のよい場所でもう一度開いてください。
          </p>
        )}

        {status === 'ready' && image !== '' && (
          <>
            <img src={image} alt="観戦用の QR コード" className="mx-auto mt-5 w-52 rounded" />
            <p className="mt-4 break-all text-[11px] text-faint">{url}</p>
          </>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
          <Button
            className="flex items-center justify-center gap-1.5 whitespace-nowrap text-[14px]"
            disabled={status !== 'ready'}
            onClick={share}
          >
            <Icon name="share" size={16} />
            {copied ? 'コピーしました' : 'リンクを送る'}
          </Button>
        </div>

        {status === 'ready' && (
          <button className="mt-4 text-[12px] text-muted underline" onClick={stopSharing}>
            観戦をやめる
          </button>
        )}
      </div>
    </div>
  )
}
