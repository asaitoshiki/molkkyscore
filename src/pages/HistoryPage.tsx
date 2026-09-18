import { Button, EmptyState, Numeral } from '../components/ui'
import { ShareActions } from '../components/ShareActions'
import { summarizeGame } from '../domain/stats'
import { useAppStore } from '../store/useAppStore'

export const HistoryPage = () => {
  const games = useAppStore((state) => state.games)
  const deleteGame = useAppStore((state) => state.deleteGame)
  const sorted = [...games].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">HISTORY</p>
        <h1 className="mt-1 font-serif text-2xl">試合履歴</h1>
      </header>

      {sorted.length === 0 ? (
        <EmptyState>まだ記録がありません</EmptyState>
      ) : (
        <ul className="divide-y divide-rule border-y border-rule">
          {sorted.map((game) => {
            const summary = summarizeGame(game)
            return (
              <li key={game.id} className="py-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-[15px]">
                    {game.finishedAt === null ? (
                      <span className="text-muted">進行中</span>
                    ) : (
                      summary.winnerName ?? '勝者なし'
                    )}
                  </p>
                  <time className="tabular text-[12px] text-faint">
                    {new Date(game.createdAt).toLocaleString('ja-JP', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
                <ul className="mt-2">
                  {summary.lines.map((line) => (
                    <li key={line.name} className="flex items-baseline justify-between py-0.5">
                      <span className={`text-[13px] ${line.eliminated ? 'text-alert' : 'text-muted'}`}>
                        {line.name}
                        {line.eliminated && '（失格）'}
                      </span>
                      <Numeral className="text-base">{line.score}</Numeral>
                    </li>
                  ))}
                </ul>
                {game.finishedAt !== null && (
                  <div className="mt-3">
                    <ShareActions game={game} size="small" />
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="tabular text-[11px] text-faint">{game.throws.length} 投</span>
                  <Button
                    variant="danger"
                    className="px-2 py-0.5 text-[11px]"
                    onClick={() => deleteGame(game.id)}
                  >
                    削除
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
