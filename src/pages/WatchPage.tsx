import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AppBar } from '../components/AppBar'
import { PinPad } from '../components/PinPad'
import { ScoreTable } from '../components/ScoreTable'
import { Button, EmptyState, Numeral } from '../components/ui'
import { computeGameState } from '../domain/game'
import { pointsOf } from '../domain/rules'
import type { Game } from '../domain/types'
import type { WatchState } from '../domain/watchSnapshot'
import { sendWatchThrow, subscribeWatch } from '../sync/watchChannel'

/**
 * 観戦する人の画面。
 * 記録係の端末から届く投球記録を受け取り、記録している側と同じ見え方で出す。
 * 記録係が許したときだけ、ここからも点数を入れられる
 */
export const WatchPage = () => {
  const shareId = useParams().shareId!
  const [watch, setWatch] = useState<WatchState>({ kind: 'loading' })

  useEffect(() => subscribeWatch(shareId, setWatch), [shareId])

  if (watch.kind === 'loading') return <Notice title="観戦">つないでいます…</Notice>
  if (watch.kind === 'missing')
    return (
      <Notice title="観戦" hint="記録している人にリンクをもう一度もらってください">
        この観戦は終わったか、見つかりませんでした
      </Notice>
    )
  if (watch.kind === 'ended') return <Notice title="観戦">この観戦は終了しました</Notice>

  return (
    <LiveView
      shareId={shareId}
      seriesGames={watch.games}
      memberNames={watch.memberNames}
      openInput={watch.openInput}
    />
  )
}

const Notice = ({ title, hint, children }: { title: string; hint?: string; children: string }) => (
  <div className="mx-auto min-h-full max-w-md bg-paper">
    <AppBar title={title} />
    <div className="px-5 py-10">
      <EmptyState>{children}</EmptyState>
      {hint && <p className="mt-2 text-center text-[12px] text-faint">{hint}</p>}
    </div>
  </div>
)

const LiveView = ({
  shareId,
  seriesGames,
  memberNames,
  openInput,
}: {
  shareId: string
  seriesGames: Game[]
  memberNames: Record<string, string>
  openInput: boolean
}) => {
  const currentGame = seriesGames.at(-1)!
  const state = computeGameState(currentGame)
  const entryOf = (entryId: string) => currentGame.entries.find((entry) => entry.id === entryId)!
  const thrower = state.currentEntryId === null ? null : entryOf(state.currentEntryId)

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-paper">
      <AppBar title={`第 ${currentGame.gameNumber} ゲーム`} />

      <section className="px-5 py-6 text-center">
        {state.finished ? (
          <>
            <p className="text-2xl font-bold">
              {state.winnerEntryId === null
                ? '勝者なしで終了'
                : `${entryOf(state.winnerEntryId).name} の勝利`}
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow text-muted">いま投げている</p>
            <p className="text-2xl font-bold">
              {thrower!.name}
              {thrower!.memberIds.length > 1 && (
                <span className="ml-2 text-[15px] text-muted">
                  {memberNames[state.currentMemberId!] ?? '—'}
                </span>
              )}
            </p>
            <p className="tabular mt-1 text-[12px] text-muted">
              あと{' '}
              {currentGame.rules.targetScore -
                state.entries.find((entry) => entry.entryId === state.currentEntryId)!.score}{' '}
              点
            </p>
          </>
        )}
      </section>

      {openInput && !state.finished && <ThrowInput shareId={shareId} game={currentGame} />}

      <ThrowFeed game={currentGame} entryName={(entryId) => entryOf(entryId).name} />

      <div className="safe-bottom mt-auto border-t border-rule">
        <ScoreTable seriesGames={seriesGames} currentGame={currentGame} effect={null} />
      </div>
    </div>
  )
}

/** 投球の流れ。見ている人が「いま何が起きたか」を追えるようにする。 */
const ThrowFeed = ({ game, entryName }: { game: Game; entryName: (entryId: string) => string }) => (
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

/** 記録係の端末から返事が来なければ、届かなかったと見なすまでの時間 */
const SEND_TIMEOUT_MS = 10_000

/**
 * 観戦する人の点数入力。送った 1 投は記録係の端末に届いてから記録に残る。
 * 返事（投球数が進む）を待つあいだは送れないようにし、二重に入れないようにする
 */
const ThrowInput = ({ shareId, game }: { shareId: string; game: Game }) => {
  const [pins, setPins] = useState<number[]>([])
  // 送ったときの局面。記録が進めば返事が来たと分かる
  const [sentAt, setSentAt] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const position = `${game.id}:${game.throws.length}`
  const waiting = sentAt === position

  useEffect(() => {
    if (!waiting) return
    const timer = setTimeout(() => {
      setSentAt(null)
      setNotice('届きませんでした。記録係の端末が電波の届くところにあるか確かめてください')
    }, SEND_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [waiting])

  const send = () => {
    setNotice('')
    setSentAt(position)
    sendWatchThrow(shareId, game, pins)
      .then(() => setPins([]))
      .catch(() => {
        setSentAt(null)
        setNotice('送れませんでした。電波のよい場所でもう一度押してください')
      })
  }

  return (
    <section className="mx-5 mb-5 rounded border-2 border-rule bg-surface px-4 pt-4 pb-4">
      <p className="mb-3 text-center text-[12px] font-bold text-muted">倒れたスキットルを押して送る</p>
      <PinPad
        selected={pins}
        onToggle={(pin) =>
          setPins((current) =>
            current.includes(pin) ? current.filter((value) => value !== pin) : [...current, pin],
          )
        }
      />
      <p className="mt-3 text-center text-[13px]">
        <Numeral className="text-xl">{pointsOf(pins)}</Numeral> 点
        <span className="ml-2 text-[12px] text-muted">{pins.length === 0 && 'このまま送るとミス'}</span>
      </p>
      <Button className="mt-3 w-full" disabled={waiting} onClick={send}>
        {waiting ? '記録係の端末に届くのを待っています…' : '送る'}
      </Button>
      {notice !== '' && <p className="mt-2 text-center text-[12px] text-alert">{notice}</p>}
    </section>
  )
}
