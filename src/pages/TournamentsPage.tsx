import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Button, EmptyState } from '../components/ui'
import { championOf } from '../domain/tournament'
import { useAppStore } from '../store/useAppStore'

const FORMAT_LABEL = { roundRobin: '総当たり', knockout: 'トーナメント' } as const

export const TournamentsPage = () => {
  const navigate = useNavigate()
  const tournaments = useAppStore((state) => state.tournaments)
  const games = useAppStore((state) => state.games)

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-muted">TOURNAMENTS</p>
        <h1 className="mt-1 font-serif text-2xl">大会</h1>
      </header>

      <Button
        variant="outline"
        className="flex w-full items-center justify-center gap-2"
        onClick={() => navigate('/tournaments/new')}
      >
        <Icon name="plus" size={18} />
        大会をつくる
      </Button>

      {tournaments.length === 0 ? (
        <EmptyState>総当たり戦やトーナメントの組み合わせを自動で作れます</EmptyState>
      ) : (
        <ul className="divide-y divide-rule border-y border-rule">
          {[...tournaments]
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((tournament) => {
              const champion = championOf(tournament, games)
              const done = tournament.matches.filter((match) => match.winnerEntryId !== null).length
              return (
                <li key={tournament.id}>
                  <Link
                    to={`/tournaments/${tournament.id}`}
                    className="flex items-center justify-between gap-3 py-3.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[15px]">{tournament.name}</span>
                      <span className="tabular block text-[12px] text-muted">
                        {FORMAT_LABEL[tournament.format]}　{tournament.entries.length} 組　
                        {done} / {tournament.matches.length} 試合
                      </span>
                    </span>
                    <span className="shrink-0 text-[12px] text-accent">
                      {champion === null ? (
                        <Icon name="arrowRight" size={18} />
                      ) : (
                        <span className="flex items-center gap-1">
                          <Icon name="flag" size={14} />
                          {champion.name}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              )
            })}
        </ul>
      )}
    </div>
  )
}
