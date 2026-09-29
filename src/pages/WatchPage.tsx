import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { AppBar } from '../components/AppBar'
import { ScoreTable } from '../components/ScoreTable'
import { EmptyState, Numeral } from '../components/ui'
import { computeGameState } from '../domain/game'
import { pointsOf } from '../domain/rules'
import { gamesOfSeries } from '../domain/series'
import { useAppStore } from '../store/useAppStore'

/**
 * 観戦する人の画面。入力は一切できない。
 * 記録している端末と同じ見え方になるよう、得点表はそのまま使い回す。
 */
export const WatchPage = () => {
  const { seriesId } = useParams()
  const games = useAppStore((state) => state.games)
  const members = useAppStore((state) => state.members)
  const seriesGames = useMemo(() => gamesOfSeries(games, seriesId!), [games, seriesId])

  const currentGame = seriesGames.at(-1)

  if (currentGame === undefined) {
    return (
      <div className="mx-auto min-h-full max-w-md bg-paper">
        <AppBar title="観戦" />
        <div className="px-5 py-10">
          <EmptyState>この試合は見つかりませんでした</EmptyState>
          <p className="mt-2 text-center text-[12px] text-faint">
            記録している人にリンクをもう一度もらってください
          </p>
        </div>
      </div>
    )
  }

  const state = computeGameState(currentGame)
  const entryOf = (entryId: string) => currentGame.entries.find((entry) => entry.id === entryId)!
  const memberName = (memberId: string) =>
    members.find((member) => member.id === memberId)?.name ?? '—'
  const thrower = state.currentEntryId === null ? null : entryOf(state.currentEntryId)

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-paper">
      <AppBar title={`第 ${currentGame.gameNumber} ゲーム`} />

      <section className="px-5 py-6 text-center">
        {state.finished ? (
          <>
            <p className="eyebrow text-muted">GAME OVER</p>
            <p className="mt-1 font-serif text-2xl">
              {state.winnerEntryId === null
                ? '勝者なしで終了'
                : `${entryOf(state.winnerEntryId).name} の勝利`}
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow text-muted">いま投げている</p>
            <p className="mt-1 font-serif text-2xl">
              {thrower!.name}
              {thrower!.memberIds.length > 1 && (
                <span className="ml-2 text-[15px] text-muted">
                  {memberName(state.currentMemberId!)}
                </span>
              )}
            </p>
            <p className="tabular mt-1 text-[12px] text-muted">
              あと {currentGame.rules.targetScore -
                state.entries.find((entry) => entry.entryId === state.currentEntryId)!.score}{' '}
              点
            </p>
          </>
        )}
      </section>

      <ThrowFeed game={currentGame} entryName={(entryId) => entryOf(entryId).name} />

      <div className="safe-bottom mt-auto border-t border-rule">
        <ScoreTable seriesGames={seriesGames} currentGame={currentGame} effect={null} />
      </div>
    </div>
  )
}

/** 投球の流れ。見ている人が「いま何が起きたか」を追えるようにする。 */
const ThrowFeed = ({
  game,
  entryName,
}: {
  game: Parameters<typeof computeGameState>[0]
  entryName: (entryId: string) => string
}) => (
  <section className="flex-1 px-5">
    {game.throws.length === 0 ? (
      <EmptyState>まだ投げていません</EmptyState>
    ) : (
      <ul className="divide-y divide-rule border-t border-rule">
        {[...game.throws]
          .reverse()
          .slice(0, 12)
          .map((record, index) => (
            <li
              key={game.throws.length - index}
              className={`flex items-baseline gap-3 py-2.5 text-[13px] ${
                index === 0 ? 'effect-row-in' : ''
              }`}
            >
              <span className="tabular w-6 text-[11px] text-faint">
                {game.throws.length - index}
              </span>
              <span className="flex-1 truncate">{entryName(record.entryId)}</span>
              <span className="tabular text-[12px] text-muted">
                {record.pins.length === 0 ? 'ミス' : record.pins.join('・')}
              </span>
              <Numeral className="w-10 text-right text-base">+{pointsOf(record.pins)}</Numeral>
            </li>
          ))}
      </ul>
    )}
  </section>
)
