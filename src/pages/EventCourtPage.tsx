import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppBar } from '../components/AppBar'
import { EventGate } from '../components/EventGate'
import { Icon } from '../components/Icon'
import { SubmissionBadge } from '../components/SubmissionBadge'
import { Button } from '../components/ui'
import type { EventInfo } from '../domain/event'
import { formatLabel } from '../domain/formats'
import { newId } from '../domain/id'
import { gamesOfSeries } from '../domain/series'
import type { Entry } from '../domain/types'
import { useSubmission } from '../sync/useEvent'
import { useAppStore } from '../store/useAppStore'

/** 公式のスコアシートが 4 チーム分までなので、それに合わせる */
const MAX_TEAMS = 4

/**
 * コートの記録係の画面。本部の QR を読み取るとここが開く。
 * 受け持つコートを選び、対戦するチームを入れて試合を始める。終わった試合の提出状況もここで見られる
 */
export const EventCourtPage = () => {
  const eventId = useParams().eventId!
  return <EventGate eventId={eventId}>{(info) => <CourtView eventId={eventId} info={info} />}</EventGate>
}

const CourtView = ({ eventId, info }: { eventId: string; info: EventInfo }) => {
  const court = useAppStore((state) => state.courts[eventId])
  const setCourt = useAppStore((state) => state.setCourt)
  const [choosing, setChoosing] = useState(false)

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-paper">
      <AppBar
        title={info.name}
        left={
          <Link to="/" aria-label="ホームへ">
            <Icon name="home" size={20} />
          </Link>
        }
      />
      {court === undefined || choosing ? (
        <CourtPicker
          count={info.courtCount}
          current={court}
          onPick={(picked) => {
            setCourt(eventId, picked)
            setChoosing(false)
          }}
        />
      ) : (
        <CourtHome eventId={eventId} info={info} court={court} onChangeCourt={() => setChoosing(true)} />
      )}
    </div>
  )
}

const CourtPicker = ({
  count,
  current,
  onPick,
}: {
  count: number
  current: number | undefined
  onPick: (court: number) => void
}) => (
  <section className="px-5 pt-6 pb-8">
    <h1 className="font-serif text-2xl">どのコートで記録しますか</h1>
    <p className="mt-1 text-[12px] text-muted">本部に、このコートの試合として届きます。</p>
    <div className="mt-5 grid grid-cols-4 gap-2">
      {Array.from({ length: count }, (_, index) => index + 1).map((number) => (
        <button
          key={number}
          className={`tabular rounded border py-3 text-[17px] ${
            number === current ? 'border-accent bg-accent text-paper' : 'border-rule bg-surface'
          }`}
          onClick={() => onPick(number)}
        >
          {number}
        </button>
      ))}
    </div>
  </section>
)

const CourtHome = ({
  eventId,
  info,
  court,
  onChangeCourt,
}: {
  eventId: string
  info: EventInfo
  court: number
  onChangeCourt: () => void
}) => {
  const navigate = useNavigate()
  const members = useAppStore((state) => state.members)
  const addMember = useAppStore((state) => state.addMember)
  const createGame = useAppStore((state) => state.createGame)
  const linkEventSeries = useAppStore((state) => state.linkEventSeries)
  const eventSeries = useAppStore((state) => state.eventSeries)
  const games = useAppStore((state) => state.games)
  const [names, setNames] = useState(['', ''])

  // この大会で記録した試合。新しいものを上に出す
  const played = useMemo(
    () =>
      Object.entries(eventSeries)
        .filter(([, link]) => link.eventId === eventId)
        .map(([seriesId]) => gamesOfSeries(games, seriesId))
        .filter((series) => series.length > 0)
        .sort((a, b) => b[0].createdAt - a[0].createdAt),
    [eventSeries, games, eventId],
  )

  const start = () => {
    // 同じ名前のメンバーがいれば使い回し、いなければ登録する
    const entries: Entry[] = names.map((raw) => {
      const name = raw.trim()
      const member = members.find((item) => item.name === name) ?? addMember(name)
      return { id: newId(), name, memberIds: [member.id], handicap: 0 }
    })
    const gameId = createGame(entries, info.rules, null)
    const seriesId = useAppStore.getState().games.find((game) => game.id === gameId)!.seriesId
    linkEventSeries(seriesId, { eventId, court })
    navigate(`/games/${gameId}`)
  }

  const trimmed = names.map((name) => name.trim())
  const ready = trimmed.every((name) => name !== '') && new Set(trimmed).size === trimmed.length

  return (
    <section className="flex flex-1 flex-col px-5 pt-6 pb-8">
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-2xl">コート {court}</h1>
        <button className="text-[12px] text-accent" onClick={onChangeCourt}>
          コートを変える
        </button>
      </div>
      <p className="mt-1 text-[12px] text-muted">ルール：{formatLabel(info.rules)}</p>

      <h2 className="eyebrow mt-6 mb-2 text-muted">対戦するチーム（投げる順）</h2>
      <datalist id="event-teams">
        {info.teams.map((team) => (
          <option key={team} value={team} />
        ))}
      </datalist>
      <div className="space-y-2">
        {names.map((name, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="tabular w-5 text-center text-muted">{index + 1}</span>
            <input
              list="event-teams"
              aria-label={`${index + 1} 番目に投げるチーム`}
              className="min-w-0 flex-1 rounded border border-rule bg-surface px-3 py-2.5 text-[15px] outline-none placeholder:text-faint focus:border-accent"
              placeholder={info.teams.length > 0 ? '一覧から選ぶか入力' : 'チーム名'}
              value={name}
              onChange={(event) =>
                setNames(names.map((item, position) => (position === index ? event.target.value : item)))
              }
            />
            {names.length > 2 && (
              <button
                aria-label="このチームを外す"
                className="p-1 text-faint"
                onClick={() => setNames(names.filter((_, position) => position !== index))}
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        className="mt-3 flex items-center gap-2 self-start py-1 text-[14px] text-accent disabled:opacity-35"
        disabled={names.length >= MAX_TEAMS}
        onClick={() => setNames([...names, ''])}
      >
        <Icon name="plus" size={16} />
        チームを追加
      </button>

      <Button className="mt-5 w-full py-3.5" disabled={!ready} onClick={start}>
        試合を始める
      </Button>

      {played.length > 0 && (
        <>
          <h2 className="eyebrow mt-8 mb-2 text-muted">このコートの試合</h2>
          <ul className="divide-y divide-rule border-y border-rule">
            {played.map((series) => (
              <PlayedMatch key={series[0].seriesId} eventId={eventId} seriesId={series[0].seriesId} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/** 記録した試合 1 つ。本部での扱い（確認待ち・承認・差し戻し）をその場で映す */
const PlayedMatch = ({ eventId, seriesId }: { eventId: string; seriesId: string }) => {
  const games = useAppStore((state) => state.games)
  const series = gamesOfSeries(games, seriesId)
  const submission = useSubmission(eventId, seriesId)
  const last = series.at(-1)!

  return (
    <li>
      <Link to={`/games/${last.id}`} className="flex items-center justify-between gap-3 py-3">
        <span className="min-w-0 truncate text-[14px]">
          {series[0].entries.map((entry) => entry.name).join(' 対 ')}
        </span>
        <SubmissionBadge status={submission?.status ?? 'none'} />
      </Link>
    </li>
  )
}
