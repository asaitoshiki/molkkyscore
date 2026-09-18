import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { PinPad } from '../components/PinPad'
import { SeriesTable } from '../components/SeriesTable'
import { ShareActions } from '../components/ShareActions'
import { Button, Numeral } from '../components/ui'
import { computeGameState } from '../domain/game'
import { pointsOf } from '../domain/rules'
import { gamesOfSeries } from '../domain/series'
import type { Game } from '../domain/types'
import { useAppStore } from '../store/useAppStore'

export const GamePage = () => {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const game = useAppStore((state) => state.games.find((item) => item.id === gameId))!
  // セレクタから配列を作って返すと毎回参照が変わるため、ここで絞り込む
  const games = useAppStore((state) => state.games)
  const seriesGames = useMemo(() => gamesOfSeries(games, game.seriesId), [games, game.seriesId])
  const members = useAppStore((state) => state.members)
  const recordThrow = useAppStore((state) => state.recordThrow)
  const rewindTo = useAppStore((state) => state.rewindTo)
  const addGameToSeries = useAppStore((state) => state.addGameToSeries)

  const [selectedPins, setSelectedPins] = useState<number[]>([])
  const [thrower, setThrower] = useState<string | null>(null)

  const state = computeGameState(game)
  const entryOf = (entryId: string) => game.entries.find((entry) => entry.id === entryId)!
  const memberName = (memberId: string) =>
    members.find((member) => member.id === memberId)?.name ?? '—'

  const submit = (pins: number[]) => {
    recordThrow(game.id, pins, thrower ?? undefined)
    setSelectedPins([])
    setThrower(null)
  }

  const togglePin = (pin: number) =>
    setSelectedPins((current) =>
      current.includes(pin) ? current.filter((value) => value !== pin) : [...current, pin],
    )

  const points = pointsOf(selectedPins)
  const currentState = state.entries.find((entry) => entry.entryId === state.currentEntryId)
  const overshoot = currentState !== undefined && currentState.score + points > game.rules.targetScore
  const roster = state.finished ? [] : entryOf(state.currentEntryId!).memberIds

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-paper">
      <header className="safe-top flex items-center justify-between border-b border-rule px-5 py-3">
        <Link to="/" className="text-muted" aria-label="中断して戻る">
          <Icon name="arrowLeft" size={20} />
        </Link>
        <span className="eyebrow">
          GAME {game.gameNumber}　ROUND {state.round}
        </span>
        <div className="flex items-center gap-4">
          <Link
            to={`/games/${game.id}/timeline`}
            className="text-muted"
            aria-label="投球の記録を開く"
          >
            <Icon name="list" size={20} />
          </Link>
          <button
            className="text-muted disabled:opacity-25"
            disabled={game.throws.length === 0}
            aria-label="1 投取り消す"
            onClick={() => rewindTo(game.id, game.throws.length - 1)}
          >
            <Icon name="undo" size={20} />
          </button>
        </div>
      </header>

      {state.finished ? (
        <ResultPanel
          game={game}
          winnerName={state.winnerEntryId === null ? null : entryOf(state.winnerEntryId).name}
          onNext={() => navigate(`/games/${addGameToSeries(game.seriesId)}`, { replace: true })}
          onFinish={() => navigate('/')}
        />
      ) : (
        <section className="flex-1 px-5 pt-5 pb-4">
          <div className="flex items-baseline justify-between">
            <p className="text-[15px]">
              <span className="eyebrow mr-2">NEXT</span>
              {entryOf(state.currentEntryId!).name}
            </p>
            <p className="tabular text-[12px] text-muted">
              残り {game.rules.targetScore - currentState!.score}
            </p>
          </div>

          {roster.length > 1 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {roster.map((memberId) => {
                const picked = (thrower ?? state.currentMemberId) === memberId
                return (
                  <button
                    key={memberId}
                    onClick={() => setThrower(memberId)}
                    className={`rounded-full border px-3 py-1 text-[12px] ${
                      picked ? 'border-accent bg-accent text-paper' : 'border-rule text-muted'
                    }`}
                  >
                    {memberName(memberId)}
                  </button>
                )
              })}
            </div>
          )}

          <div className="mt-5">
            <PinPad selected={selectedPins} onToggle={togglePin} />
          </div>

          <p className="mt-4 flex items-baseline justify-between text-[12px] text-muted">
            <span>倒したスキットルをすべて選ぶ</span>
            <span className={overshoot ? 'text-alert' : 'text-ink'}>
              {overshoot && <span className="mr-2">超過 → {game.rules.penaltyScore} 点</span>}
              <Numeral className="text-lg">{points}</Numeral> 点
            </span>
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => submit([])}>
              ミス
            </Button>
            <Button disabled={selectedPins.length === 0} onClick={() => submit(selectedPins)}>
              記録する
            </Button>
          </div>

          <RecentThrows game={game} entryName={(entryId) => entryOf(entryId).name} />
        </section>
      )}

      <div className="safe-bottom mt-auto">
        <SeriesTable seriesGames={seriesGames} currentGame={game} />
      </div>
    </div>
  )
}

/** 直近の投球。入力の取り違えにその場で気づけるようにする。 */
const RecentThrows = ({
  game,
  entryName,
}: {
  game: Game
  entryName: (entryId: string) => string
}) => (
  <ul className="mt-6 divide-y divide-rule border-t border-rule">
    {[...game.throws]
      .reverse()
      .slice(0, 3)
      .map((record, index) => (
        <li key={game.throws.length - index} className="flex items-baseline gap-3 py-2 text-[12px]">
          <span className="tabular w-5 text-faint">{game.throws.length - index}</span>
          <span className="flex-1 truncate text-muted">{entryName(record.entryId)}</span>
          <span className="tabular text-faint">
            {record.pins.length === 0 ? 'ミス' : record.pins.join('・')}
          </span>
          <Numeral className="w-8 text-right text-[13px]">+{pointsOf(record.pins)}</Numeral>
        </li>
      ))}
  </ul>
)

const ResultPanel = ({
  game,
  winnerName,
  onNext,
  onFinish,
}: {
  game: Parameters<typeof ShareActions>[0]['game']
  winnerName: string | null
  onNext: () => void
  onFinish: () => void
}) => (
  <section className="flex-1 space-y-5 px-5 pt-8 pb-6">
    <div>
      <p className="eyebrow">GAME {game.gameNumber} WINNER</p>
      <p className="mt-1 font-serif text-3xl">{winnerName ?? '勝者なし'}</p>
    </div>
    <ShareActions game={game} />
    <div className="grid grid-cols-2 gap-2">
      <Button variant="outline" onClick={onFinish}>
        セットを終える
      </Button>
      <Button onClick={onNext}>次のゲームへ</Button>
    </div>
  </section>
)
