import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { SkittleMark } from '../components/SkittleMark'
import { EmptyState, SectionTitle } from '../components/ui'
import { TAIKAI_APP_URL } from '../domain/sharing'
import { summarizeGame } from '../domain/stats'
import { hasUnreadNews } from '../domain/news'
import { useNews } from '../sync/news'
import { useAppStore } from '../store/useAppStore'

export const HomePage = () => {
  const navigate = useNavigate()
  const games = useAppStore((state) => state.games)
  const deleteGame = useAppStore((state) => state.deleteGame)
  const ongoing = games.filter((game) => game.finishedAt === null)
  const recent = games
    .filter((game) => game.finishedAt !== null)
    .sort((a, b) => b.finishedAt! - a.finishedAt!)
    .slice(0, 4)

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-accent">モルメモ</h1>
          <p className="text-[12px] text-muted">スコアと戦績を、その場で残す。</p>
        </div>
        <NewsBell />
      </header>

      {/* いちばん使う「試合を始める」を、画面の真ん中に大きく置く */}
      <section className="flex flex-col items-center py-6">
        <button
          className="press flex h-52 w-52 flex-col items-center justify-center gap-2 rounded-full border-4 border-white bg-accent text-white [--press:var(--color-accent-deep)]"
          onClick={() => navigate('/games/new')}
        >
          <SkittleMark size={72} />
          <span className="text-[20px] font-bold">試合を始める</span>
        </button>
        <p className="mt-4 text-[12px] text-muted">チームを決めたら、倒した番号を押すだけ</p>
      </section>

      {ongoing.length > 0 && (
        <section>
          <SectionTitle>進行中</SectionTitle>
          <ul className="list-card">
            {ongoing.map((game) => {
              const teams = game.entries.map((entry) => entry.name).join(' 対 ')
              return (
                <li key={game.id} className="flex items-center gap-2">
                  <Link
                    to={`/games/${game.id}`}
                    className="flex min-w-0 flex-1 items-center justify-between py-3.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[15px]">{teams}</span>
                      <span className="tabular block text-[12px] text-muted">
                        {game.throws.length} 投まで記録
                      </span>
                    </span>
                    <span className="text-accent">
                      <Icon name="arrowRight" size={18} />
                    </span>
                  </Link>
                  {/* 押し間違いで記録を失わないよう、消す前に一度確かめる */}
                  <button
                    aria-label={`${teams} の試合を削除する`}
                    className="shrink-0 p-2 text-faint"
                    onClick={() => {
                      if (window.confirm(`「${teams}」の試合を削除しますか？記録は元に戻せません。`)) {
                        deleteGame(game.id)
                      }
                    }}
                  >
                    <Icon name="close" size={16} />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 className="text-[13px] font-bold text-muted">最近の試合</h2>
          <Link to="/history" className="text-[13px] font-bold text-accent">
            すべて
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState>まだ記録がありません</EmptyState>
        ) : (
          <ul className="list-card">
            {recent.map((game) => {
              const summary = summarizeGame(game)
              return (
                <li key={game.id}>
                  <Link to={`/games/${game.id}`} className="flex items-center justify-between py-3.5">
                    <span>
                      <span className="block text-[15px]">{summary.winnerName === null ? '勝者なし' : `${summary.winnerName} の勝ち`}</span>
                      <span className="tabular block text-[12px] text-muted">
                        {summary.lines.map((line) => `${line.name} ${line.score}`).join('　')}
                      </span>
                    </span>
                    <time className="tabular text-[12px] text-faint">
                      {new Date(game.finishedAt!).toLocaleDateString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                      })}
                    </time>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        {[
          { to: '/practice', label: '的当て練習', note: '狙いの精度を測る', icon: 'target' },
          { to: '/rules', label: 'ルール', note: '投げ方から得点まで', icon: 'book' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded border border-rule bg-surface px-4 py-4 text-ink"
          >
            <span className="text-accent">
              <Icon name={item.icon as 'target'} size={20} />
            </span>
            <span className="mt-2 block text-[14px]">{item.label}</span>
            <span className="block text-[11px] text-muted">{item.note}</span>
          </Link>
        ))}
      </section>

      {/* 大会の運営は別アプリ。組み合わせ・本部・コートの記録はそちらで行う */}
      <a
        href={TAIKAI_APP_URL}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded border border-rule bg-surface px-4 py-4 text-ink"
      >
        <span className="text-accent">
          <Icon name="bracket" size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px]">大会を開く</span>
          <span className="block text-[11px] text-muted">組み合わせや本部の運営は「モルメモ 大会」で</span>
        </span>
        <span className="text-faint">
          <Icon name="arrowRight" size={18} />
        </span>
      </a>

      <footer className="flex justify-between text-[11px] text-muted">
        <Link to="/remove-ads">広告を表示しない</Link>
        <Link to="/privacy">プライバシーポリシー</Link>
      </footer>
    </div>
  )
}

/** お知らせへの入口。まだ見ていないお知らせがあれば赤い点を付ける */
const NewsBell = () => {
  const news = useNews()
  const seenNewsId = useAppStore((state) => state.seenNewsId)
  const unread = news.kind === 'ready' && hasUnreadNews(news.news, seenNewsId)

  return (
    <Link
      to="/news"
      aria-label={unread ? 'お知らせ（新しいお知らせがあります）' : 'お知らせ'}
      className="press relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-rule bg-surface text-ink [--press:var(--color-rule)]"
    >
      <Icon name="bell" size={20} />
      {unread && (
        <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-paper bg-alert" />
      )}
    </Link>
  )
}
