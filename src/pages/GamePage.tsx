import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { isNative } from '../ads/admob'
import { InterstitialAd } from '../ads/InterstitialAd'
import { EventSubmit } from '../components/EventSubmit'
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
import { formatLabel } from '../domain/formats'
import { computeGameState } from '../domain/game'
import { outcomeOf } from '../domain/outcome'
import type { ThrowOutcome } from '../domain/outcome'
import { pointsOf } from '../domain/rules'
import { gamesOfSeries, seriesResult } from '../domain/series'
import type { Entry, Game } from '../domain/types'
import { shareImage } from '../share/canvas'
import { renderResultCard } from '../share/resultCard'
import { renderScoreSheet } from '../share/scoreSheetImage'
import { publishLive } from '../sync/eventChannel'
import { publishWatch } from '../sync/watchChannel'
import { useSound } from '../sound/useSound'
import { useAppStore } from '../store/useAppStore'
import type { EventSeriesLink } from '../store/useAppStore'

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
  const setTimeUp = useAppStore((state) => state.setTimeUp)
  const setShootoutWinner = useAppStore((state) => state.setShootoutWinner)
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

  // 本部とつないだ大会の試合なら、本部の画面にもコートの様子を流す
  const eventLink = useAppStore((state) => state.eventSeries[game.seriesId])
  useEffect(() => {
    if (eventLink === undefined) return
    publishLive(eventLink.eventId, eventLink.matchKey, seriesGames, members).catch(() => undefined)
  }, [eventLink, seriesGames, members])

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
        eventLink={eventLink}
        onNext={() => navigate(`/games/${addGameToSeries(game.seriesId)}`, { replace: true })}
        // 大会の一戦は対戦表やコートの画面へ戻り、次の試合を始められるようにする
        onFinish={() => navigate(finishPath(game, eventLink))}
        onUndo={() => {
          sound('undo')
          rewindTo(game.id, game.throws.length - 1)
        }}
        onResume={() => {
          sound('undo')
          setTimeUp(game.id, null)
        }}
        onShootout={(entryId) => setShootoutWinner(game.id, entryId)}
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
        title={`${eventLink === undefined ? '' : `${eventLink.label}・`}${gameTitle(game)}`}
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

      {game.rules.timeLimitMinutes !== null && (
        <MatchClock
          startedAt={seriesGames[0].throws[0]?.at ?? null}
          limitMinutes={game.rules.timeLimitMinutes}
          onTimeUp={() => setTimeUp(game.id, Date.now())}
        />
      )}

      <section className="flex flex-1 flex-col px-5 pt-5 pb-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[15px]">
            <span className="eyebrow mr-2 text-muted">NEXT</span>
            {entryOf(state.currentEntryId!).name}
          </p>
          <p className="tabular text-[12px] text-muted">
            {game.rules.maxTurns !== null && `ターン ${state.round} / ${game.rules.maxTurns}　`}
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

/** 試合を終えたあとに戻る画面 */
const finishPath = (game: Game, eventLink: EventSeriesLink | undefined) => {
  if (eventLink !== undefined) return `/e/${eventLink.eventId}`
  if (game.tournamentId !== null) return `/tournaments/${game.tournamentId}`
  return '/'
}

/** 「第 1 ゲーム」。ゲーム数を決めた試合では全体の何ゲーム目かも添える */
const gameTitle = (game: Game) =>
  `第 ${game.gameNumber} ゲーム${game.rules.gameCount === null ? '' : ` / ${game.rules.gameCount}`}`

/** 1 秒ごとに今の時刻を返す。残り時間の表示に使う */
const useNow = () => {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}

const clock = (ms: number) => {
  const seconds = Math.ceil(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * 試合の残り時間。第 1 ゲームの最初の投球から数える。
 * 時間が来ても勝手には止めない。ラウンドの最後まで投げる大会もあるので、打ち切りは手で押す
 */
const MatchClock = ({
  startedAt,
  limitMinutes,
  onTimeUp,
}: {
  startedAt: number | null
  limitMinutes: number
  onTimeUp: () => void
}) => {
  const now = useNow()
  const limit = limitMinutes * 60_000
  // 時刻は 1 秒ごとにしか進めないので、投げた直後は制限時間を超えて見えないよう抑える
  const left = Math.min((startedAt ?? now) + limit - now, limit)
  const over = left <= 0

  return (
    <div className="flex items-center justify-between border-b border-rule px-5 py-2">
      <p className={`tabular text-[13px] ${over ? 'font-semibold text-alert' : 'text-muted'}`}>
        {over ? '時間切れ' : `残り ${clock(left)}`}
        {startedAt === null && <span className="ml-2 text-[11px]">第 1 投から計ります</span>}
      </p>
      <button
        className={`rounded-full border px-3 py-1 text-[12px] ${
          over ? 'border-alert bg-alert text-paper' : 'border-rule text-muted'
        }`}
        onClick={onTimeUp}
      >
        タイムアップ
      </button>
    </div>
  )
}

/** ゲーム結果。順位と各ゲームの得点を並べ、その場で共有できるようにする。 */
const ResultView = ({
  game,
  seriesGames,
  eventLink,
  onNext,
  onFinish,
  onUndo,
  onResume,
  onShootout,
  onTimeline,
  onRename,
}: {
  game: Game
  seriesGames: Game[]
  eventLink: EventSeriesLink | undefined
  onNext: () => void
  onFinish: () => void
  onUndo: () => void
  onResume: () => void
  onShootout: (entryId: string) => void
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
  const result = seriesResult(seriesGames)
  const latest = seriesGames.at(-1)!.id === game.id
  const timedOut = game.timeUpAt !== null
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
        <p className="eyebrow text-muted">
          {gameTitle(game)}
          {timedOut && '・時間切れ'}
        </p>
        {winnerName === null ? (
          <p className="mt-2 font-serif text-2xl">
            {timedOut || game.rules.maxTurns !== null ? '引き分け' : '勝者なしで終了'}
          </p>
        ) : (
          <p className="mt-2 font-serif text-3xl leading-snug">
            <span className="text-accent">{winnerName}</span> の勝利
          </p>
        )}
        {/* 誤タップで決着してしまったときの戻り道。続きのゲームを始めたあとは並びが崩れるので出さない */}
        {latest &&
          (timedOut ? (
            <UndoAction note="時間切れで打ち切りました" label="打ち切りを取り消す" onClick={onResume} />
          ) : (
            <UndoAction note={lastThrowNote(game)} label="1 つ戻る" onClick={onUndo} />
          ))}
      </section>

      {result.finished && (
        <MatchVerdict
          game={game}
          leaders={result.leaders}
          winnerEntryId={result.winnerEntryId}
          onShootout={onShootout}
        />
      )}

      {result.finished && eventLink !== undefined && (
        <EventSubmit link={eventLink} seriesGames={seriesGames} />
      )}

      <ol className="divide-y divide-rule border-b border-rule">
        {result.standings.map((standing, rank) => (
          <li key={standing.entry.id} className="flex items-center gap-3 px-5 py-3.5">
            <Numeral className="w-5 text-center text-lg text-muted">{rank + 1}</Numeral>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px]">{standing.entry.name}</span>
              <span className="tabular block text-[11px] text-muted">
                {standing.wins}勝{standing.draws > 0 && `${standing.draws}分`}
                {'　'}
                {standing.perGame
                  .map((score, index) => `第${seriesGames[index].gameNumber}ゲーム：${score ?? '−'}`)
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
        {/* 決めたゲーム数を終えた試合は、続きのゲームを作らせない */}
        {result.finished ? (
          <Button className="w-full" onClick={onFinish}>
            試合を終える
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onFinish}>
              ゲーム終了
            </Button>
            <Button onClick={goNext}>次のゲームへ</Button>
          </div>
        )}
      </div>
    </div>
  )
}

const lastThrowNote = (game: Game) => {
  const lastThrow = game.throws.at(-1)!
  const name = game.entries.find((entry) => entry.id === lastThrow.entryId)!.name
  const points = lastThrow.pins.length === 0 ? 'ミス' : `+${pointsOf(lastThrow.pins)}`
  return `最後の投球　${name}　${points}`
}

const UndoAction = ({
  note,
  label,
  onClick,
}: {
  note: string
  label: string
  onClick: () => void
}) => (
  <div className="mt-5">
    <p className="tabular text-[12px] text-muted">{note}</p>
    <Button
      variant="outline"
      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-[14px]"
      onClick={onClick}
    >
      <Icon name="undo" size={16} />
      {label}
    </Button>
  </div>
)

/**
 * 試合全体の勝敗。首位が並んだときは、その場でモルックアウトをして勝った組を選んでもらう。
 * 大会では対戦表に勝者を書き込むので、選ぶまでは決着しない
 */
const MatchVerdict = ({
  game,
  leaders,
  winnerEntryId,
  onShootout,
}: {
  game: Game
  leaders: Entry[]
  winnerEntryId: string | null
  onShootout: (entryId: string) => void
}) => {
  const winner = game.entries.find((entry) => entry.id === winnerEntryId)

  return (
    <section className="border-b border-rule bg-accent-soft/50 px-5 py-5 text-center">
      <p className="eyebrow text-accent">試合結果・{formatLabel(game.rules)}</p>
      {leaders.length === 1 ? (
        <p className="mt-1.5 font-serif text-2xl">
          <span className="text-accent">{winner!.name}</span> の勝ち
        </p>
      ) : (
        <>
          <p className="mt-1.5 text-[14px]">首位が並びました</p>
          <p className="mt-1 text-[12px] text-muted">
            モルックアウトで決めて、勝った組を選んでください
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {leaders.map((entry) => (
              <button
                key={entry.id}
                className={`rounded-full border px-4 py-1.5 text-[14px] ${
                  entry.id === winnerEntryId
                    ? 'border-accent bg-accent text-paper'
                    : 'border-rule bg-surface'
                }`}
                onClick={() => onShootout(entry.id)}
              >
                {entry.name}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
