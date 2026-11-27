import { useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar } from '../components/AppBar'
import { Icon } from '../components/Icon'
import { Button } from '../components/ui'
import {
  getPurchaseOptions,
  isStorePlatform,
  purchaseAdFree,
  restoreAdFree,
  subscribePurchaseOptions,
} from '../billing/purchases'
import { useAppStore } from '../store/useAppStore'

const BENEFITS = [
  'ゲームの区切りの広告と、商品の紹介リンクを非表示にします',
  '一度の買い切りで、追加の支払いはありません',
  '同じストアアカウントで購入を復元できます',
]

/** 広告除去の購入画面。決済そのものはストアの課金に任せる。 */
export const RemoveAdsPage = () => {
  const navigate = useNavigate()
  const adFree = useAppStore((state) => state.adFree)
  const setAdFree = useAppStore((state) => state.setAdFree)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const onStore = isStorePlatform()
  const { ready, price } = useSyncExternalStore(subscribePurchaseOptions, getPurchaseOptions)

  const run = async (action: () => Promise<string | null>) => {
    setBusy(true)
    setNotice(null)
    try {
      setNotice(await action())
    } catch {
      setNotice('ストアに接続できませんでした。時間をおいてお試しください。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-paper">
      <AppBar
        title="広告を表示しない"
        left={
          <button onClick={() => navigate(-1)} aria-label="戻る">
            <Icon name="chevronLeft" size={22} />
          </button>
        }
      />

      <section className="flex-1 px-5 py-8">
        {adFree ? (
          <>
            <p className="text-2xl font-bold">購入済みです</p>
            <p className="mt-2 text-[13px] text-muted">
              広告は表示されません。ありがとうございます。
            </p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold">広告なしで使う</p>
            <p className="mt-1 text-[13px] text-muted">買い切り{price && `　${price}`}</p>

            <ul className="mt-6 list-card">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 py-3 text-[14px]">
                  <span className="mt-1 text-accent">
                    <Icon name="check" size={16} />
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <Button
              className="mt-8 w-full py-3.5"
              disabled={busy || !ready || !price}
              onClick={() => run(purchaseAdFree)}
            >
              {busy ? '処理中…' : '購入する'}
            </Button>
            <p className="mt-4 text-center text-[12px] text-muted">
              {!onStore && '購入はストアからインストールしたアプリでご利用いただけます。'}
              {onStore && !price && 'ストアから価格を取得できると購入できます。'}
            </p>
          </>
        )}

        {onStore && (
          <Button
            variant="quiet"
            className="mt-2 w-full py-2 text-[12px]"
            disabled={busy || !ready}
            onClick={() => run(restoreAdFree)}
          >
            購入を復元する
          </Button>
        )}

        {notice && <p className="mt-4 text-center text-[12px] text-alert">{notice}</p>}

        {/* 開発中だけ、表示の確認用に出す。公開版に出すと無料で広告を消せてしまう */}
        {import.meta.env.DEV && !onStore && (
          <div className="mt-12 border-t border-rule pt-4">
            <p className="eyebrow text-faint">プレビュー</p>
            <Button
              variant="outline"
              className="mt-2 w-full py-2 text-[12px]"
              onClick={() => setAdFree(!adFree)}
            >
              {adFree ? '広告ありの表示に戻す' : '広告なしの表示を確認する'}
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
