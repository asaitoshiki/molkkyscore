import { Link } from 'react-router-dom'
import { EmptyState } from './ui'

/** 消された記録の URL を開いたときの行き止まり。白画面のまま固まらせない。 */
export const MissingRecord = ({ label, to }: { label: string; to: string }) => (
  <div className="space-y-4 px-5 py-10">
    <EmptyState>{label}は見つかりませんでした。削除されたかもしれません。</EmptyState>
    <Link className="block text-center text-[13px] text-muted underline" to={to}>
      一覧に戻る
    </Link>
  </div>
)
