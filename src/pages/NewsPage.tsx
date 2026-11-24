import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar } from '../components/AppBar'
import { Icon } from '../components/Icon'
import { EmptyState } from '../components/ui'
import type { NewsItem } from '../domain/news'
import { useNews } from '../sync/news'
import { useAppStore } from '../store/useAppStore'

/**
 * お知らせの一覧。通知を許可していない人も、ここで新しい情報を見られる。
 * 開いたら先頭のお知らせを既読にし、ホームのベルの印を消す
 */
export const NewsPage = () => {
  const navigate = useNavigate()
  const news = useNews()
  const markNewsSeen = useAppStore((state) => state.markNewsSeen)

  useEffect(() => {
    if (news.kind === 'ready' && news.news.length > 0) markNewsSeen(news.news[0].id)
  }, [news, markNewsSeen])

  return (
    <div className="mx-auto min-h-full max-w-md bg-paper">
      <AppBar
        title="お知らせ"
        left={
          <button onClick={() => navigate(-1)} aria-label="戻る">
            <Icon name="chevronLeft" size={22} />
          </button>
        }
      />
      <div className="px-5 py-6">
        {news.kind === 'loading' && <EmptyState>読み込んでいます…</EmptyState>}
        {news.kind === 'offline' && (
          <EmptyState>インターネットにつながると、お知らせが見られます</EmptyState>
        )}
        {news.kind === 'ready' &&
          (news.news.length === 0 ? (
            <EmptyState>いまはお知らせがありません</EmptyState>
          ) : (
            <ul className="space-y-3">
              {news.news.map((item) => (
                <NewsCard key={item.id} item={item} onOpen={(path) => navigate(path)} />
              ))}
            </ul>
          ))}
      </div>
    </div>
  )
}

const NewsCard = ({ item, onOpen }: { item: NewsItem; onOpen: (path: string) => void }) => (
  <li className="rounded border-2 border-rule bg-surface px-4 py-4">
    <time className="tabular text-[12px] font-bold text-muted">{item.date.replaceAll('-', '.')}</time>
    <h2 className="mt-1 text-[16px] font-bold">{item.title}</h2>
    <p className="mt-1.5 text-[14px] leading-relaxed whitespace-pre-line text-ink">{item.body}</p>
    {item.path !== undefined && (
      <button
        className="mt-2 flex items-center gap-1 text-[13px] font-bold text-accent"
        onClick={() => onOpen(item.path!)}
      >
        開く
        <Icon name="arrowRight" size={16} />
      </button>
    )}
  </li>
)
