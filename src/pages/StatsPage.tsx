import { useState } from 'react'
import { EmptyState, Numeral } from '../components/ui'
import { PinHitChart } from '../components/PinHitChart'
import { computeMemberStats } from '../domain/stats'
import { AdBanner } from '../ads/AdBanner'
import { useAppStore } from '../store/useAppStore'

const percent = (value: number) => `${(value * 100).toFixed(0)}%`

export const StatsPage = () => {
  const members = useAppStore((state) => state.members)
  const games = useAppStore((state) => state.games)
  const [openId, setOpenId] = useState<string | null>(null)

  const stats = computeMemberStats(games, members)
    .filter((stat) => stat.games > 0)
    .sort((a, b) => b.winRate - a.winRate || b.games - a.games)

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-muted">RECORDS</p>
        <h1 className="mt-1 font-serif text-2xl">戦績</h1>
      </header>

      {stats.length === 0 ? (
        <EmptyState>試合を 1 つ終えると集計されます</EmptyState>
      ) : (
        <ul className="divide-y divide-rule border-y border-rule">
          {stats.map((stat, rank) => {
            const open = openId === stat.member.id
            return (
              <li key={stat.member.id} className="py-3.5">
                <button
                  className="flex w-full items-baseline justify-between gap-3 text-left"
                  onClick={() => setOpenId(open ? null : stat.member.id)}
                >
                  <span className="flex min-w-0 items-baseline gap-3">
                    <Numeral className="w-5 shrink-0 text-[13px] text-faint">{rank + 1}</Numeral>
                    <span className="truncate text-[15px]">{stat.member.name}</span>
                  </span>
                  <span className="shrink-0 text-[12px] text-muted">
                    <span className="tabular">
                      {stat.wins} 勝 / {stat.games} 試合
                    </span>
                    <Numeral className="ml-3 text-xl text-ink">{percent(stat.winRate)}</Numeral>
                  </span>
                </button>

                {open && (
                  <div className="mt-4 space-y-6">
                    <dl className="grid grid-cols-3 gap-x-4 gap-y-4">
                      {(
                        [
                          ['総投数', `${stat.throws}`, '投'],
                          ['平均得点', stat.averagePoints.toFixed(1), '点/投'],
                          ['ミス率', percent(stat.missRate), ''],
                          ['1 本倒し', `${stat.singleHits}`, '回'],
                          ['複数本', `${stat.multiHits}`, '回'],
                          ['50 点超過', `${stat.overshoots}`, '回'],
                        ] as const
                      ).map(([label, value, unit]) => (
                        <div key={label}>
                          <dt className="text-[11px] text-muted">{label}</dt>
                          <dd>
                            <Numeral className="text-xl">{value}</Numeral>
                            <span className="ml-1 text-[11px] text-muted">{unit}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <PinHitChart hits={stat.pinHits} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <AdBanner />
    </div>
  )
}
