import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar } from '../components/AppBar'
import { Icon } from '../components/Icon'
import { Button } from '../components/ui'
import { AD_FREE_PRICE } from '../domain/billing'
import { isStoreAvailable, purchaseAdFree, restoreAdFree } from '../billing/purchases'
import { useAppStore } from '../store/useAppStore'

const BENEFITS = [
  'ゲームの区切りに出る広告が表示されなくなります',
  '一度の買い切りで、追加の支払いはありません',
  '機種を変えても、購入を復元すれば引き継げます',
]

/** 広告除去の購入画面。決済そのものはストアの課金に任せる。 */
export const RemoveAdsPage = () => {
  const navigate = useNavigate()
  const adFree = useAppStore((state) => state.adFree)
  const setAdFree = useAppStore((state) => state.setAdFree)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const onStore = isStoreAvailable()

  const run = async (action: () => Promise<string | null>, failure: string) => {
    setBusy(true)
    setNotice(null)
    const error = await action()
    setNotice(error === null ? null : `${failure}：${error}`)
    setBusy(false)
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
            <p className="font-serif text-2xl">購入済みです</p>
            <p className="mt-2 text-[13px] text-muted">
              広告は表示されません。ありがとうございます。
            </p>
          </>
        ) : (
          <>
            <p className="font-serif text-2xl">広告なしで使う</p>
            <p className="mt-1 text-[13px] text-muted">買い切り　{AD_FREE_PRICE}</p>

            <ul className="mt-6 divide-y divide-rule border-y border-rule">
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
              disabled={busy || !onStore}
              onClick={() => run(purchaseAdFree, '購入できませんでした')}
            >
              {busy ? '処理中…' : `${AD_FREE_PRICE} で購入する`}
            </Button>
            <Button
              variant="quiet"
              className="mt-2 w-full py-2 text-[12px]"
              disabled={busy || !onStore}
              onClick={() => run(restoreAdFree, '復元できませんでした')}
            >
              購入を復元する
            </Button>

            {!onStore && (
              <p className="mt-4 text-center text-[12px] text-muted">
                購入は App Store / Google Play 版でご利用いただけます。
              </p>
            )}
          </>
        )}

        {notice && <p className="mt-4 text-center text-[12px] text-alert">{notice}</p>}

        {/* 端末のストアが使えないときだけ、表示の確認用に出す */}
        {!onStore && (
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
