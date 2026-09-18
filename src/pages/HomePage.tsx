import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Button, EmptyState, SectionTitle } from '../components/ui'
import { summarizeGame } from '../domain/stats'
import { AdBanner } from '../ads/AdBanner'
import { useAppStore } from '../store/useAppStore'

export const HomePage = () => {
  const navigate = useNavigate()
  const games = useAppStore((state) => state.games)
  const ongoing = games.filter((game) => game.finishedAt === null)
  const recent = games
    .filter((game) => game.finishedAt !== null)
    .sort((a, b) => b.finishedAt! - a.finishedAt!)
    .slice(0, 4)

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow text-accent">MÖLKKY</p>
        <h1 className="mt-1 font-serif text-3xl leading-tight">モルックノート</h1>
        <p className="mt-2 text-[13px] text-muted">スコアと戦績を、その場で残す。</p>
      </header>

      <Button className="flex w-full items-center justify-center gap-2 py-4" onClick={() => navigate('/games/new')}>
        <Icon name="plus" size={18} />
        新しい試合
      </Button>

      {ongoing.length > 0 && (
        <section>
          <SectionTitle>進行中</SectionTitle>
          <ul className="divide-y divide-rule border-y border-rule">
            {ongoing.map((game) => (
              <li key={game.id}>
                <Link to={`/games/${game.id}`} className="flex items-center justify-between py-3.5">
                  <span>
                    <span className="block text-[15px]">
                      {game.entries.map((entry) => entry.name).join(' 対 ')}
                    </span>
                    <span className="tabular block text-[12px] text-muted">
                      {game.throws.length} 投まで記録
                    </span>
                  </span>
                  <span className="text-accent">
                    <Icon name="arrowRight" size={18} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between border-t border-rule pt-3">
          <h2 className="eyebrow text-muted">最近の試合</h2>
          <Link to="/history" className="eyebrow text-accent">
            すべて
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState>まだ記録がありません</EmptyState>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {recent.map((game) => {
              const summary = summarizeGame(game)
              return (
                <li key={game.id} className="flex items-center justify-between py-3.5">
                  <span>
                    <span className="block text-[15px]">{summary.winnerName ?? '勝者なし'}</span>
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

      <AdBanner />

      <footer className="border-t border-rule pt-4 text-center text-[11px] text-muted">
        <Link to="/privacy">プライバシーポリシー</Link>
      </footer>
    </div>
  )
}
