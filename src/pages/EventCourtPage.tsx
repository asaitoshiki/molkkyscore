import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppBar } from '../components/AppBar'
import { EventGate } from '../components/EventGate'
import { Icon } from '../components/Icon'
import { OrderList } from '../components/OrderList'
import { SubmissionBadge } from '../components/SubmissionBadge'
import { Button, EmptyState } from '../components/ui'
import type { EventInfo } from '../domain/event'
import { activeStage, matchLabel, matchesOf, nameOf } from '../domain/eventPlan'
import type { EventPlan, Group, PlanMatch, Stage } from '../domain/eventPlan'
import { formatLabel } from '../domain/formats'
import { moveItem } from '../domain/order'
import { gamesOfSeries } from '../domain/series'
import type { Entry } from '../domain/types'
import { useSubmission } from '../sync/useEvent'
import { useAppStore } from '../store/useAppStore'

/**
 * コートの記録係の画面。本部の QR を読み取るとここが開く。
 * 受け持つブロック（トーナメントなら試合）を選ぶと、その予定の試合が並ぶ。
 * 選んだ試合はステージのルールと決まった顔ぶれで始まるので、名前やルールを入れる必要はない
 */
export const EventCourtPage = () => {
  const eventId = useParams().eventId!
  return <EventGate eventId={eventId}>{(info) => <CourtView eventId={eventId} info={info} />}</EventGate>
}

const CourtView = ({ eventId, info }: { eventId: string; info: EventInfo }) => {
  const stage = activeStage(info.plan)
  const chosen = useAppStore((state) => state.eventGroups[eventId])
  const setEventGroup = useAppStore((state) => state.setEventGroup)
  // 選んだのは前のステージのグループかもしれない。今のステージのものだけを使う
  const group = stage?.groups.find((item) => `${stage.id}/${item.id}` === chosen)

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
      {stage === null ? (
        <div className="px-5 py-10">
          <EmptyState>本部が組み合わせを発表するまでお待ちください</EmptyState>
        </div>
      ) : group === undefined ? (
        <GroupPicker stage={stage} onPick={(picked) => setEventGroup(eventId, `${stage.id}/${picked.id}`)} />
      ) : (
        <GroupHome
          eventId={eventId}
          plan={info.plan}
          stage={stage}
          group={group}
          onChangeGroup={() => setEventGroup(eventId, null)}
        />
      )}
    </div>
  )
}

const GroupPicker = ({ stage, onPick }: { stage: Stage; onPick: (group: Group) => void }) => (
  <section className="px-5 pt-6 pb-8">
    <p className="eyebrow text-muted">{stage.name}</p>
    <h1 className="mt-1 font-serif text-2xl">
      {stage.format === 'league' ? 'どのブロックを記録しますか' : 'どの試合を記録しますか'}
    </h1>
    <p className="mt-1 text-[12px] text-muted">本部に、ここで選んだ試合として届きます。</p>
    <div className={`mt-5 grid gap-2 ${stage.format === 'league' ? 'grid-cols-4' : 'grid-cols-2'}`}>
      {stage.groups.map((group) => (
        <button
          key={group.id}
          className="tabular rounded border border-rule bg-surface px-2 py-3 text-[15px]"
          onClick={() => onPick(group)}
        >
          {group.label}
        </button>
      ))}
    </div>
  </section>
)

const GroupHome = ({
  eventId,
  plan,
  stage,
  group,
  onChangeGroup,
}: {
  eventId: string
  plan: EventPlan
  stage: Stage
  group: Group
  onChangeGroup: () => void
}) => {
  const matches = matchesOf(stage).filter((match) => match.groupId === group.id)
  const [openKey, setOpenKey] = useState<string | null>(null)

  return (
    <section className="flex flex-1 flex-col px-5 pt-6 pb-8">
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-2xl">{group.label}</h1>
        <button className="text-[12px] text-accent" onClick={onChangeGroup}>
          {stage.format === 'league' ? 'ブロックを変える' : '試合を変える'}
        </button>
      </div>
      <p className="mt-1 text-[12px] text-muted">
        {stage.name}・{formatLabel(stage.rules)}
        {stage.rules.maxTurns !== null && `・${stage.rules.maxTurns} ターン`}
        {stage.rules.timeLimitMinutes !== null && `・${stage.rules.timeLimitMinutes} 分`}
      </p>
      <p className="mt-3 text-[12px] text-muted">
        {stage.format === 'league'
          ? '上から順に、空いたコートで進めてください。同じブロックの 2 コートで別々の端末から記録できます。'
          : '投げる順番を決めてから始めてください。'}
      </p>

      {matches.length === 0 ? (
        <EmptyState>この組は試合がなく、そのまま勝ち抜けです</EmptyState>
      ) : (
        <ul className="mt-4 divide-y divide-rule border-y border-rule">
          {matches.map((match) => (
            <MatchRow
              key={match.key}
              eventId={eventId}
              plan={plan}
              stage={stage}
              match={match}
              open={openKey === match.key}
              onToggle={() => setOpenKey(openKey === match.key ? null : match.key)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

/** 予定の試合 1 つ。本部での扱いを映し、開くと投げる順を決めて始められる */
const MatchRow = ({
  eventId,
  plan,
  stage,
  match,
  open,
  onToggle,
}: {
  eventId: string
  plan: EventPlan
  stage: Stage
  match: PlanMatch
  open: boolean
  onToggle: () => void
}) => {
  const navigate = useNavigate()
  const submission = useSubmission(eventId, match.key)
  const games = useAppStore((state) => state.games)
  const eventSeries = useAppStore((state) => state.eventSeries)
  // この端末で記録を始めた試合なら、続きから開ける
  const seriesId = Object.entries(eventSeries).find(
    ([, link]) => link.eventId === eventId && link.matchKey === match.key,
  )?.[0]
  const series = seriesId === undefined ? [] : gamesOfSeries(games, seriesId)
  const number = match.key.split('-').at(-1)

  return (
    <li className="py-3">
      <button className="flex w-full items-center gap-3 text-left" onClick={onToggle}>
        <span className="tabular w-8 shrink-0 text-[12px] text-muted">
          {stage.format === 'league' ? `${number}` : ''}
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px]">
          {match.playerIds.map((id) => nameOf(plan, id)).join(' 対 ')}
        </span>
        <SubmissionBadge status={submission?.status ?? 'none'} />
      </button>
      {open &&
        (series.length > 0 ? (
          <Button
            variant="outline"
            className="mt-3 w-full py-2.5 text-[14px]"
            onClick={() => navigate(`/games/${series.at(-1)!.id}`)}
          >
            記録を開く
          </Button>
        ) : (
          <StartMatch eventId={eventId} plan={plan} stage={stage} match={match} />
        ))}
    </li>
  )
}

/** 投げる順番を決めて試合を始める。顔ぶれとルールは大会プランのまま */
const StartMatch = ({
  eventId,
  plan,
  stage,
  match,
}: {
  eventId: string
  plan: EventPlan
  stage: Stage
  match: PlanMatch
}) => {
  const navigate = useNavigate()
  const members = useAppStore((state) => state.members)
  const addMember = useAppStore((state) => state.addMember)
  const createGame = useAppStore((state) => state.createGame)
  const linkEventSeries = useAppStore((state) => state.linkEventSeries)
  const [order, setOrder] = useState(match.playerIds)

  const start = () => {
    // チームの ID を参加者の ID にそろえ、本部で人ごとの成績を集められるようにする
    const entries: Entry[] = order.map((playerId) => {
      const name = nameOf(plan, playerId)
      const member = members.find((item) => item.name === name) ?? addMember(name)
      return { id: playerId, name, memberIds: [member.id], handicap: 0 }
    })
    const gameId = createGame(entries, stage.rules, null)
    const seriesId = useAppStore.getState().games.find((game) => game.id === gameId)!.seriesId
    linkEventSeries(seriesId, { eventId, matchKey: match.key, label: matchLabel(stage, match) })
    navigate(`/games/${gameId}`)
  }

  return (
    <div className="mt-3 rounded border border-rule bg-surface px-3 py-3">
      <p className="mb-1 text-[12px] text-muted">投げる順（取っ手で入れ替え）</p>
      <OrderList
        items={order}
        onMove={(from, to) => setOrder(moveItem(order, from, to))}
        renderItem={(playerId) => <span className="flex-1 text-[15px]">{nameOf(plan, playerId)}</span>}
      />
      <Button className="mt-3 w-full py-3" onClick={start}>
        この順で試合を始める
      </Button>
    </div>
  )
}
