import { Link } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

/**
 * バナー広告の枠。購入済みなら何も描かない。
 * スコア入力画面には置かない（屋外で誤タップすると試合の記録が壊れるため）。
 * ネイティブ化のときに、この中身を AdMob のバナーへ差し替える。
 */
export const AdBanner = () => {
  const adFree = useAppStore((state) => state.adFree)
  if (adFree) return null

  return (
    <aside className="mt-8">
      <div className="flex h-14 items-center justify-center rounded border border-dashed border-rule bg-surface">
        <span className="eyebrow text-faint">広告</span>
      </div>
      <Link to="/remove-ads" className="mt-1.5 block text-right text-[11px] text-muted">
        広告を非表示にする
      </Link>
    </aside>
  )
}
