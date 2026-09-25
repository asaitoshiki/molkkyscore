import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { InterstitialAd } from '../ads/InterstitialAd'
import { AppBar } from '../components/AppBar'
import { Icon } from '../components/Icon'
import { PinPad } from '../components/PinPad'
import { ScoreTable } from '../components/ScoreTable'
import type { ScoreEffect } from '../components/ScoreTable'
import { Button, Numeral } from '../components/ui'
import { INTERSTITIAL_INTERVAL } from '../domain/billing'
import { computeGameState } from '../domain/game'
import { pointsOf } from '../domain/rules'
import { gamesOfSeries, seriesStandings } from '../domain/series'
import type { Game } from '../domain/types'
import { shareImage } from '../share/canvas'
import { renderResultCard } from '../share/resultCard'
import { renderScoreSheet } from '../share/scoreSheetImage'
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
  const [effect, setEffect] = useState<ScoreEffect | null>(null)

  // 合図は流し終えたら片付ける
  useEffect(() => {
    if (effect === null) return
    const timer = setTimeout(() => setEffect(null), 1100)
    return () => clearTimeout(timer)
  }, [effect])

  const state = computeGameState(game)
  const entryOf = (entryId: string) => game.entries.find((entry) => entry.id === entryId)!
  const memberName = (memberId: string) =>
    members.find((member) => member.id === memberId)?.name ?? '—'

  const submit = () => {
    const entryId = state.currentEntryId!
    const gained = pointsOf(selectedPins)
    const over = state.entries.find((item) => item.entryId === entryId)!.score + gained >
      game.rules.targetScore

    recordThrow(game.id, selectedPins, thrower ?? undefined)
    setEffect({
      entryId,
      name: entryOf(entryId).name,
      // 数字は札が示すので、合図の文字は短くして重ならないようにする
      label: gained === 0 ? 'ミス' : over ? '超過' : `+${gained}`,
      tone: gained === 0 || over ? 'alert' : 'accent',
      // 投球ごとに異なる値にして、同じ得点が続いても合図を出し直す
      token: game.throws.length + 1,
    })
    setSelectedPins([])
    setThrower(null)
  }

  const togglePin = (pin: number) =>
    setSelectedPins((current) =>
      current.includes(pin) ? current.filter((value) => value !== pin) : [...current, pin],
    )

  if (state.finished) {
    return (
      <ResultView
        game={game}
        seriesGames={seriesGames}
        onNext={() => navigate(`/games/${addGameToSeries(game.seriesId)}`, { replace: true })}
        onFinish={() => navigate('/')}
      />
    )
  }

  const points = pointsOf(selectedPins)
  const currentState = state.entries.find((entry) => entry.entryId === state.currentEntryId)!
  const overshoot = currentState.score + points > game.rules.targetScore
  const roster = entryOf(state.currentEntryId!).memberIds

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-paper">
      <AppBar
        title={`第 ${game.gameNumber} ゲーム`}
        left={
          <button onClick={() => navigate('/')} aria-label="中断してホームへ">
            <Icon name="home" size={20} />
          </button>
        }
        right={
          <>
            <button
              onClick={() => navigate(`/games/${game.id}/timeline`)}
              aria-label="投球の記録を開く"
            >
              <Icon name="list" size={20} />
            </button>
            <button
              className="disabled:opacity-35"
              disabled={game.throws.length === 0}
              aria-label="1 投取り消す"
              onClick={() => rewindTo(game.id, game.throws.length - 1)}
            >
              <Icon name="undo" size={20} />
            </button>
          </>
        }
      />

      <section className="flex-1 px-5 pt-5 pb-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[15px]">
            <span className="eyebrow mr-2 text-muted">NEXT</span>
            {entryOf(state.currentEntryId!).name}
          </p>
          <p className="tabular text-[12px] text-muted">
            残り {game.rules.targetScore - currentState.score}
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

        <p className="mt-4 text-center text-[13px]">
          <span className={overshoot ? 'text-alert' : 'text-ink'}>
            <Numeral className="text-xl">{points}</Numeral> 点
          </span>
          <span className="ml-2 text-[12px] text-muted">
            {selectedPins.length === 0 && 'このまま決定するとミス'}
            {overshoot && `超過 → ${game.rules.penaltyScore} 点に戻ります`}
          </span>
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            disabled={selectedPins.length === 0}
            onClick={() => setSelectedPins([])}
          >
            戻る
          </Button>
          <Button onClick={submit}>決定</Button>
        </div>

        <RecentThrows game={game} entryName={(entryId) => entryOf(entryId).name} />
      </section>

      <div className="safe-bottom relative mt-auto border-t border-rule">
        {effect && (
          <span
            key={effect.token}
            className="effect-rise pointer-events-none absolute bottom-full left-1/2 mb-2 rounded-full border border-rule bg-surface px-3.5 py-1.5 text-[13px] whitespace-nowrap"
          >
            <span className="text-muted">{effect.name}</span>
            <span
              className={`ml-2 font-semibold ${
                effect.tone === 'alert' ? 'text-alert' : 'text-accent'
              }`}
            >
              {effect.label}
            </span>
          </span>
        )}
        <ScoreTable seriesGames={seriesGames} currentGame={game} effect={effect} />
      </div>
    </div>
  )
}

/** このゲームの投球。新しい順に並べ、多くなったらこの枠の中だけで送る。 */
const RecentThrows = ({
  game,
  entryName,
}: {
  game: Game
  entryName: (entryId: string) => string
}) => (
  <ul className="mt-6 max-h-56 divide-y divide-rule overflow-y-auto overscroll-contain border-y border-rule">
    {[...game.throws].reverse().map((record, index) => (
      <li
        key={game.throws.length - index}
        className={`flex items-baseline gap-3 py-2 text-[12px] ${index === 0 ? 'effect-row-in' : ''}`}
      >
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

/** ゲーム結果。順位と各ゲームの得点を並べ、その場で共有できるようにする。 */
const ResultView = ({
  game,
  seriesGames,
  onNext,
  onFinish,
}: {
  game: Game
  seriesGames: Game[]
  onNext: () => void
  onFinish: () => void
}) => {
  const adFree = useAppStore((state) => state.adFree)
  const gamesSinceInterstitial = useAppStore((state) => state.gamesSinceInterstitial)
  const winnerEntryId = computeGameState(game).winnerEntryId
  const winnerName = game.entries.find((entry) => entry.id === winnerEntryId)?.name ?? null
  const countFinishedGame = useAppStore((state) => state.countFinishedGame)
  const resetInterstitialCount = useAppStore((state) => state.resetInterstitialCount)
  const [showingAd, setShowingAd] = useState(false)
  const [busy, setBusy] = useState(false)

  // 広告はゲームの区切りだけに出す。入力中に割り込ませない
  const goNext = () => {
    countFinishedGame()
    const due = !adFree && gamesSinceInterstitial + 1 >= INTERSTITIAL_INTERVAL
    if (due) {
      resetInterstitialCount()
      setShowingAd(true)
      return
    }
    onNext()
  }
  const standings = [...seriesStandings(seriesGames)].sort((a, b) => b.total - a.total)
  const date = new Date(game.createdAt).toISOString().slice(0, 10)

  const share = async (
    render: (game: Game, seriesGames: Game[]) => Promise<HTMLCanvasElement>,
    suffix: string,
  ) => {
    setBusy(true)
    const canvas = await render(game, seriesGames)
    await shareImage(canvas, `molkky-${suffix}-${date}.png`)
    setBusy(false)
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-paper">
      <AppBar
        title="ゲーム結果"
        right={
          <button
            aria-label="結果を共有する"
            disabled={busy}
            onClick={() => share(renderResultCard, 'result')}
          >
            <Icon name="share" size={20} />
          </button>
        }
      />

      <section className="border-b border-rule px-5 py-8 text-center">
        <p className="eyebrow text-muted">第 {game.gameNumber} ゲーム</p>
        {winnerName === null ? (
          <p className="mt-2 font-serif text-2xl">勝者なしで終了</p>
        ) : (
          <p className="mt-2 font-serif text-3xl leading-snug">
            <span className="text-accent">{winnerName}</span> の勝利
          </p>
        )}
      </section>

      <ol className="divide-y divide-rule border-b border-rule">
        {standings.map((standing, rank) => (
          <li key={standing.entry.id} className="flex items-center gap-3 px-5 py-3.5">
            <Numeral className="w-5 text-center text-lg text-muted">{rank + 1}</Numeral>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px]">{standing.entry.name}</span>
              <span className="tabular block text-[11px] text-muted">
                {standing.perGame
                  .map((score, index) => `第${seriesGames[index].gameNumber}ゲーム：${score}`)
                  .join('　')}
              </span>
            </span>
            <span className="tabular inline-flex min-w-12 justify-center rounded bg-ink px-2 py-1.5 text-paper">
              {standing.total}
            </span>
          </li>
        ))}
      </ol>

      {showingAd && <InterstitialAd onClose={onNext} />}

      <div className="space-y-3 px-5 pt-6 pb-8">
        <Button
          variant="quiet"
          className="w-full py-2 text-[12px]"
          disabled={busy}
          onClick={() => share(renderScoreSheet, 'sheet')}
        >
          {busy ? '作成中…' : 'スコアシートを画像で保存'}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onFinish}>
            ゲーム終了
          </Button>
          <Button onClick={goNext}>次のゲームへ</Button>
        </div>
      </div>
    </div>
  )
}
