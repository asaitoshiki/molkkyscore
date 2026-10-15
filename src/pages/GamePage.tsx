import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { isNative } from '../ads/admob'
import { InterstitialAd } from '../ads/InterstitialAd'
import { WatchInvite } from '../components/WatchInvite'
import { AppBar } from '../components/AppBar'
import { Icon } from '../components/Icon'
import { MissingRecord } from '../components/MissingRecord'
import { PinPad } from '../components/PinPad'
import { PromoBlock } from '../components/PromoBlock'
import { ScoreTable } from '../components/ScoreTable'
import type { ScoreEffect } from '../components/ScoreTable'
import { Button, Numeral } from '../components/ui'
import { INTERSTITIAL_INTERVAL } from '../domain/billing'
import { computeGameState } from '../domain/game'
import { outcomeOf } from '../domain/outcome'
import type { ThrowOutcome } from '../domain/outcome'
import { pointsOf } from '../domain/rules'
import { gamesOfSeries, seriesStandings } from '../domain/series'
import type { Game } from '../domain/types'
import { shareImage } from '../share/canvas'
import { renderResultCard } from '../share/resultCard'
import { renderScoreSheet } from '../share/scoreSheetImage'
import { publishWatch } from '../sync/watchChannel'
import { useSound } from '../sound/useSound'
import { useAppStore } from '../store/useAppStore'

/** 記録が残っているかだけ先に見る。消えた試合の URL でも画面が落ちないようにする。 */
export const GamePage = () => {
  const gameId = useParams().gameId!
  const exists = useAppStore((state) => state.games.some((item) => item.id === gameId))
  if (!exists) return <MissingRecord label="この試合" to="/history" />
  return <GameView gameId={gameId} />
}

/** 点数のほかに伝えるべき結果。これ以外は「+点数」で示す */
const EFFECT_LABEL: Partial<Record<ThrowOutcome, string>> = {
  miss: 'ミス',
  eliminated: '失格',
  overshoot: '超過',
}

const GameView = ({ gameId }: { gameId: string }) => {
  const navigate = useNavigate()
  const game = useAppStore((state) => state.games.find((item) => item.id === gameId))!
  // セレクタから配列を作って返すと毎回参照が変わるため、ここで絞り込む
  const games = useAppStore((state) => state.games)
  const seriesGames = useMemo(() => gamesOfSeries(games, game.seriesId), [games, game.seriesId])
  const members = useAppStore((state) => state.members)
  const recordThrow = useAppStore((state) => state.recordThrow)
  const rewindTo = useAppStore((state) => state.rewindTo)
  const addGameToSeries = useAppStore((state) => state.addGameToSeries)
  const soundOn = useAppStore((state) => state.soundOn)
  const setSoundOn = useAppStore((state) => state.setSoundOn)
  const sound = useSound()

  const [selectedPins, setSelectedPins] = useState<number[]>([])
  const [thrower, setThrower] = useState<string | null>(null)
  const [effect, setEffect] = useState<ScoreEffect | null>(null)
  const [inviting, setInviting] = useState(false)

  // 観戦に共有しているあいだは、記録が変わるたびに送る。
  // 電波が途切れても試合は止めない（届かなかった分は次の送信で上書きされる）
  const shareId = useAppStore((state) => state.shares[game.seriesId])
  useEffect(() => {
    if (shareId === undefined) return
    publishWatch(shareId, seriesGames, members).catch(() => undefined)
  }, [shareId, seriesGames, members])

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
    // 記録する前に結果を見て、合図の文字と効果音を同じ判定から選ぶ
    const outcome = outcomeOf(game, selectedPins)

    recordThrow(game.id, selectedPins, thrower ?? undefined)
    sound(outcome)
    setEffect({
      entryId,
      name: entryOf(entryId).name,
      // 数字は札が示すので、合図の文字は短くして重ならないようにする
      label: EFFECT_LABEL[outcome] ?? `+${gained}`,
      tone: outcome in EFFECT_LABEL ? 'alert' : 'accent',
      // 投球ごとに異なる値にして、同じ得点が続いても合図を出し直す
      token: game.throws.length + 1,
    })
    setSelectedPins([])
    setThrower(null)
  }

  const togglePin = (pin: number) => {
    sound('tap')
    setSelectedPins((current) =>
      current.includes(pin) ? current.filter((value) => value !== pin) : [...current, pin],
    )
  }

  if (state.finished) {
    return (
      <ResultView
        game={game}
        seriesGames={seriesGames}
        onNext={() => navigate(`/games/${addGameToSeries(game.seriesId)}`, { replace: true })}
        onFinish={() => navigate('/')}
        onUndo={() => {
          sound('undo')
          rewindTo(game.id, game.throws.length - 1)
        }}
        onTimeline={() => navigate(`/games/${game.id}/timeline`)}
        onRename={() => navigate(`/games/${game.id}/teams`)}
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
          <>
            <button onClick={() => navigate('/')} aria-label="中断してホームへ">
              <Icon name="home" size={20} />
            </button>
            <button
              onClick={() => setSoundOn(!soundOn)}
              aria-label={soundOn ? '効果音を消す' : '効果音を鳴らす'}
            >
              <Icon name={soundOn ? 'sound' : 'mute'} size={20} />
            </button>
          </>
        }
        right={
          <>
            {/* 観戦してもらえるのはアプリ版だけ。記録係の道具という位置づけ */}
            {isNative() && (
              <button onClick={() => setInviting(true)} aria-label="観戦してもらう">
                <Icon name="qr" size={20} />
              </button>
            )}
            <button onClick={() => navigate(`/games/${game.id}/teams`)} aria-label="チーム名を変更する">
              <Icon name="edit" size={20} />
            </button>
            <button
              onClick={() => navigate(`/games/${game.id}/timeline`)}
              aria-label="投球の履歴を開く"
            >
              <Icon name="list" size={20} />
            </button>
          </>
        }
      />

      {inviting && (
        <WatchInvite
          seriesId={game.seriesId}
          seriesGames={seriesGames}
          members={members}
          onClose={() => setInviting(false)}
        />
      )}

      <section className="flex flex-1 flex-col px-5 pt-5 pb-5">
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

        <div className="flex flex-1 items-center justify-center py-5">
          <PinPad selected={selectedPins} onToggle={togglePin} />
        </div>

        <p className="text-center text-[13px]">
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
            disabled={game.throws.length === 0}
            onClick={() => {
              sound('undo')
              rewindTo(game.id, game.throws.length - 1)
              setSelectedPins([])
            }}
          >
            1 つ戻る
          </Button>
          <Button onClick={submit}>決定</Button>
        </div>

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

/** ゲーム結果。順位と各ゲームの得点を並べ、その場で共有できるようにする。 */
const ResultView = ({
  game,
  seriesGames,
  onNext,
  onFinish,
  onUndo,
  onTimeline,
  onRename,
}: {
  game: Game
  seriesGames: Game[]
  onNext: () => void
  onFinish: () => void
  onUndo: () => void
  onTimeline: () => void
  onRename: () => void
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
  const latest = seriesGames.at(-1)!.id === game.id
  const lastThrow = game.throws.at(-1)!
  const lastEntryName = game.entries.find((entry) => entry.id === lastThrow.entryId)!.name
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
          <>
            <button
              aria-label="結果を共有する"
              disabled={busy}
              onClick={() => share(renderResultCard, 'result')}
            >
              <Icon name="share" size={20} />
            </button>
            <button onClick={onRename} aria-label="チーム名を変更する">
              <Icon name="edit" size={20} />
            </button>
            <button onClick={onTimeline} aria-label="投球の履歴を開く">
              <Icon name="list" size={20} />
            </button>
          </>
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
        {/* 誤タップで決着してしまったときの戻り道。続きのゲームを始めたあとは並びが崩れるので出さない */}
        {latest && (
          <div className="mt-5">
            <p className="tabular text-[12px] text-muted">
              最後の投球　{lastEntryName}
              {'　'}
              {lastThrow.pins.length === 0 ? 'ミス' : `+${pointsOf(lastThrow.pins)}`}
            </p>
            <Button
              variant="outline"
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-[14px]"
              onClick={onUndo}
            >
              <Icon name="undo" size={16} />1 つ戻る
            </Button>
          </div>
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

      {/* 操作ボタンより上に置く。押し間違いで試合の進行を妨げないため。広告除去を買った人には出さない */}
      {!adFree && (
        <div className="px-5">
          <PromoBlock slot="result" />
        </div>
      )}

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
