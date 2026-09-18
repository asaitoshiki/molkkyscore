import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Button, Numeral } from '../components/ui'
import { computeGameState } from '../domain/game'
import { PIN_NUMBERS, pointsOf } from '../domain/rules'
import type { Game } from '../domain/types'
import { useAppStore } from '../store/useAppStore'

export const GamePage = () => {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const game = useAppStore((state) => state.games.find((item) => item.id === gameId))!
  const members = useAppStore((state) => state.members)
  const recordThrow = useAppStore((state) => state.recordThrow)
  const undoThrow = useAppStore((state) => state.undoThrow)
  const [selectedPins, setSelectedPins] = useState<number[]>([])

  const state = computeGameState(game)
  const entryOf = (entryId: string) => game.entries.find((entry) => entry.id === entryId)!
  const memberName = (memberId: string) =>
    members.find((member) => member.id === memberId)?.name ?? '—'

  const submit = (pins: number[]) => {
    recordThrow(game.id, pins)
    setSelectedPins([])
  }

  const togglePin = (pin: number) =>
    setSelectedPins((current) =>
      current.includes(pin) ? current.filter((value) => value !== pin) : [...current, pin],
    )

  const points = pointsOf(selectedPins)
  const currentState = state.entries.find((entry) => entry.entryId === state.currentEntryId)
  const overshoot = currentState !== undefined && currentState.score + points > game.rules.targetScore

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-paper">
      <header className="safe-top flex items-center justify-between border-b border-rule px-5 py-3">
        <Link to="/" className="text-muted" aria-label="中断して戻る">
          <Icon name="arrowLeft" size={20} />
        </Link>
        <span className="eyebrow">ROUND {state.round}</span>
        <button
          className="text-muted disabled:opacity-25"
          disabled={game.throws.length === 0}
          aria-label="1 投取り消す"
          onClick={() => undoThrow(game.id)}
        >
          <Icon name="undo" size={20} />
        </button>
      </header>

      <section className="divide-y divide-rule border-b border-rule">
        {state.entries.map((entryState) => {
          const entry = entryOf(entryState.entryId)
          const active = entryState.entryId === state.currentEntryId
          return (
            <div
              key={entry.id}
              className={`px-5 py-4 ${active ? 'bg-accent-soft' : ''} ${entryState.eliminated ? 'opacity-45' : ''}`}
            >
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px]">
                    {entry.name}
                    {entryState.eliminated && (
                      <span className="ml-2 text-[11px] text-alert">失格</span>
                    )}
                  </p>
                  {entry.memberIds.length > 1 && (
                    <p className="truncate text-[12px] text-muted">
                      {entry.memberIds.map(memberName).join('・')}
                    </p>
                  )}
                </div>
                <div className="flex items-end gap-3">
                  <MissDots used={entryState.consecutiveMisses} total={game.rules.maxMisses} />
                  <Numeral className="text-4xl">{entryState.score}</Numeral>
                </div>
              </div>
              <div className="mt-3 h-px bg-rule">
                <div
                  className="h-px bg-accent"
                  style={{ width: `${(entryState.score / game.rules.targetScore) * 100}%` }}
                />
              </div>
            </div>
          )
        })}
      </section>

      <ThrowLog game={game} entryName={(entryId) => entryOf(entryId).name} />

      {state.finished ? (
        <ResultPanel
          winnerName={state.winnerEntryId === null ? null : entryOf(state.winnerEntryId).name}
          onHome={() => navigate('/')}
          onUndo={() => undoThrow(game.id)}
        />
      ) : (
        <section className="mt-auto border-t border-rule px-5 pt-4 pb-7">
          <div className="flex items-baseline justify-between">
            <p className="text-[15px]">
              <span className="eyebrow mr-2">NEXT</span>
              {entryOf(state.currentEntryId!).name}
              {entryOf(state.currentEntryId!).memberIds.length > 1 && (
                <span className="ml-2 text-muted">{memberName(state.currentMemberId!)}</span>
              )}
            </p>
            <p className="tabular text-[12px] text-muted">
              残り {game.rules.targetScore - currentState!.score}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-px border border-rule bg-rule">
            {PIN_NUMBERS.map((pin) => (
              <button
                key={pin}
                className={`tabular py-4 font-serif text-xl transition-colors ${
                  selectedPins.includes(pin) ? 'bg-accent text-paper' : 'bg-surface text-ink'
                }`}
                onClick={() => togglePin(pin)}
              >
                {pin}
              </button>
            ))}
          </div>

          <p className="mt-3 flex items-baseline justify-between text-[12px] text-muted">
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
        </section>
      )}
    </div>
  )
}

/** 連続ミスの残り回数。失格までの猶予がひと目で分かるようにする。 */
const MissDots = ({ used, total }: { used: number; total: number }) => (
  <span className="mb-1.5 flex gap-1" aria-label={`連続ミス ${used} / ${total}`}>
    {Array.from({ length: used === 0 ? 0 : total }, (_, index) => (
      <span
        key={index}
        className={`h-1.5 w-1.5 rounded-full ${index < used ? 'bg-alert' : 'bg-rule'}`}
      />
    ))}
  </span>
)

/** 直近の投球を新しい順に並べる。取り消し前の確認に使う。 */
const ThrowLog = ({
  game,
  entryName,
}: {
  game: Game
  entryName: (entryId: string) => string
}) => (
  <section className="flex-1 overflow-y-auto px-5">
    {game.throws.length === 0 && (
      <p className="pt-10 text-center text-[13px] text-faint">
        倒したスキットルを選んで、1 投ずつ記録していきます
      </p>
    )}
    <ul className="divide-y divide-rule">
      {[...game.throws]
        .reverse()
        .slice(0, 8)
        .map((record, index) => (
          <li
            key={game.throws.length - index}
            className="flex items-baseline gap-3 py-2 text-[13px]"
          >
            <span className="tabular w-6 text-[11px] text-faint">
              {game.throws.length - index}
            </span>
            <span className="flex-1 truncate">{entryName(record.entryId)}</span>
            <span className="tabular text-[12px] text-muted">
              {record.pins.length === 0 ? 'ミス' : record.pins.join('・')}
            </span>
            <Numeral className="w-10 text-right text-base">
              +{pointsOf(record.pins)}
            </Numeral>
          </li>
        ))}
    </ul>
  </section>
)

const ResultPanel = ({
  winnerName,
  onHome,
  onUndo,
}: {
  winnerName: string | null
  onHome: () => void
  onUndo: () => void
}) => (
  <section className="mt-auto border-t border-rule px-5 pt-6 pb-8">
    <p className="eyebrow">WINNER</p>
    <p className="mt-1 font-serif text-3xl">{winnerName ?? '勝者なし'}</p>
    <p className="mt-2 text-[13px] text-muted">記録は戦績に反映されました。</p>
    <div className="mt-5 grid grid-cols-2 gap-2">
      <Button variant="outline" onClick={onUndo}>
        取り消して続行
      </Button>
      <Button onClick={onHome}>試合を終える</Button>
    </div>
  </section>
)
