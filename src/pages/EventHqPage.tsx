import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { AppBar } from '../components/AppBar'
import { EventGate } from '../components/EventGate'
import { Icon } from '../components/Icon'
import { ScoreSheetView } from '../components/ScoreSheetView'
import { StagePanel } from '../components/StagePanel'
import { SubmissionBadge } from '../components/SubmissionBadge'
import { Button, EmptyState, TextInput } from '../components/ui'
import { resultsOf, submissionsCsv, summarize } from '../domain/event'
import type { CourtLive, EventInfo, MatchSummary, Submission, SubmissionStatus } from '../domain/event'
import { activeStage, findMatch, matchLabel } from '../domain/eventPlan'
import type { EventPlan } from '../domain/eventPlan'
import { eventCourtUrl } from '../domain/sharing'
import { decodeSeries } from '../domain/watchSnapshot'
import { reviewSubmission, updatePlan } from '../sync/eventChannel'
import { useCourtLive, useEventUid, useSubmissions } from '../sync/useEvent'

/**
 * 本部の画面。ステージの進み具合（順位・同点・勝ち抜け）、提出されたスコアシート、
 * 試合中のコートの様子を一か所で見る。
 * 書き換えができるのは大会を開いた端末だけで、ほかの端末で開くと見るだけになる。
 * 机に置いたタブレットやパソコンでも見やすいよう、幅を広めに取る
 */
export const EventHqPage = () => {
  const eventId = useParams().eventId!
  return <EventGate eventId={eventId}>{(info) => <HqView eventId={eventId} info={info} />}</EventGate>
}

type Tab = 'progress' | 'submissions' | 'live'

/** 確認待ちを先に、そのあと差し戻し・承認済みの順に並べる */
const STATUS_ORDER: Record<SubmissionStatus, number> = { submitted: 0, returned: 1, approved: 2 }

const HqView = ({ eventId, info }: { eventId: string; info: EventInfo }) => {
  const submissions = useSubmissions(eventId)
  const uid = useEventUid()
  const owner = uid === info.ownerUid
  const [tab, setTab] = useState<Tab>('progress')
  const [showingQr, setShowingQr] = useState(false)
  const save = owner ? (plan: EventPlan) => void updatePlan(eventId, plan) : null

  const waiting = Object.values(submissions).filter((item) => item.status === 'submitted').length

  const downloadCsv = () => {
    const csv = submissionsCsv(info.plan, submissions)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = `${info.name}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="mx-auto min-h-full max-w-4xl bg-paper">
      <AppBar
        title={`本部・${info.name}`}
        left={
          <Link to="/tournaments" aria-label="大会の一覧へ">
            <Icon name="chevronLeft" size={22} />
          </Link>
        }
        right={
          <button onClick={() => setShowingQr(true)} aria-label="コート用の QR を出す">
            <Icon name="qr" size={20} />
          </button>
        }
      />

      {showingQr && <CourtQr eventId={eventId} onClose={() => setShowingQr(false)} />}

      <section className="px-5 pt-5">
        <p className="text-[12px] text-muted">
          参加 {info.plan.players.length} チーム・{info.plan.stages.map((stage) => stage.name).join(' → ')}
        </p>
        {!owner && (
          <p className="mt-2 rounded border border-rule px-3 py-2 text-[12px] text-muted">
            この端末では見るだけです。組み合わせ・同点の決定・承認は、大会を開いた端末でできます。
          </p>
        )}
        <div className="mt-4 flex border-b border-rule text-[14px]">
          <TabButton active={tab === 'progress'} onClick={() => setTab('progress')}>
            進行
          </TabButton>
          <TabButton active={tab === 'submissions'} onClick={() => setTab('submissions')}>
            提出
            {waiting > 0 && (
              <span className="ml-1 rounded-full bg-alert px-1.5 text-[11px] text-paper">{waiting}</span>
            )}
          </TabButton>
          <TabButton active={tab === 'live'} onClick={() => setTab('live')}>
            試合中
          </TabButton>
        </div>
      </section>

      {tab === 'progress' && <Progress plan={info.plan} submissions={submissions} save={save} />}
      {tab === 'submissions' && (
        <Submissions
          eventId={eventId}
          plan={info.plan}
          submissions={submissions}
          owner={owner}
          onDownload={downloadCsv}
        />
      )}
      {tab === 'live' && <Live eventId={eventId} plan={info.plan} />}
    </div>
  )
}

const TabButton = ({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) => (
  <button
    className={`-mb-px border-b-2 px-4 py-2 ${active ? 'border-accent text-ink' : 'border-transparent text-muted'}`}
    onClick={onClick}
  >
    {children}
  </button>
)

/** ステージを選んで、その進み具合を見る。はじめは今コートで進んでいるステージを開く */
const Progress = ({
  plan,
  submissions,
  save,
}: {
  plan: EventPlan
  submissions: Record<string, Submission>
  save: ((plan: EventPlan) => void) | null
}) => {
  const [stageId, setStageId] = useState((activeStage(plan) ?? plan.stages[0]).id)
  const stage = plan.stages.find((item) => item.id === stageId)!
  const results = resultsOf(submissions)

  return (
    <div className="space-y-4 px-5 py-5">
      <div className="flex flex-wrap gap-1.5">
        {plan.stages.map((item) => (
          <button
            key={item.id}
            className={`rounded-full border px-3 py-1.5 text-[13px] ${
              item.id === stageId ? 'border-accent bg-accent text-paper' : 'border-rule text-muted'
            }`}
            onClick={() => setStageId(item.id)}
          >
            {item.name}
            {item.started && ' ●'}
          </button>
        ))}
      </div>
      <StagePanel plan={plan} stage={stage} results={results} submissions={submissions} save={save} />
    </div>
  )
}

/** チームごとに各ゲームの点と合計を 1 行で */
const MatchLines = ({ summary }: { summary: MatchSummary }) => (
  <table className="tabular mt-1 w-full text-[14px]">
    <tbody>
      {summary.teams.map((team) => (
        <tr key={team.name} className={team.name === summary.winnerName ? 'text-accent' : ''}>
          <td className="max-w-0 truncate py-0.5">{team.name}</td>
          <td className="w-24 py-0.5 text-right text-[12px] text-muted">
            {team.perGame.map((score) => score ?? '−').join(' / ')}
          </td>
          <td className="w-10 py-0.5 text-right font-semibold">{team.total}</td>
        </tr>
      ))}
    </tbody>
  </table>
)

const Submissions = ({
  eventId,
  plan,
  submissions,
  owner,
  onDownload,
}: {
  eventId: string
  plan: EventPlan
  submissions: Record<string, Submission>
  owner: boolean
  onDownload: () => void
}) => {
  const [openId, setOpenId] = useState<string | null>(null)
  const list = Object.entries(submissions).sort(
    ([, a], [, b]) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.submittedAt - a.submittedAt,
  )
  const waiting = list.filter(([, submission]) => submission.status === 'submitted')

  // 両チームが確かめてから送っているので、目で見て問題なければまとめて承認できるようにする
  const approveAll = () => {
    if (!window.confirm(`確認待ちの ${waiting.length} 試合をすべて承認しますか？`)) return
    waiting.forEach(([id]) => void reviewSubmission(eventId, id, 'approved', ''))
  }

  if (list.length === 0) {
    return <EmptyState>試合が終わると、各コートからスコアシートが届きます</EmptyState>
  }

  return (
    <div className="px-5 py-4">
      <div className="mb-3 flex justify-end gap-2">
        {owner && waiting.length > 0 && (
          <Button variant="outline" className="px-3 py-1.5 text-[12px]" onClick={approveAll}>
            確認待ちをすべて承認
          </Button>
        )}
        <Button variant="outline" className="px-3 py-1.5 text-[12px]" onClick={onDownload}>
          CSV で保存
        </Button>
      </div>
      <ul className="divide-y divide-rule border-y border-rule">
        {list.map(([id, submission]) => (
          <SubmissionRow
            key={id}
            eventId={eventId}
            plan={plan}
            matchKey={id}
            submission={submission}
            owner={owner}
            open={openId === id}
            onToggle={() => setOpenId(openId === id ? null : id)}
          />
        ))}
      </ul>
    </div>
  )
}

const SubmissionRow = ({
  eventId,
  plan,
  matchKey,
  submission,
  owner,
  open,
  onToggle,
}: {
  eventId: string
  plan: EventPlan
  matchKey: string
  submission: Submission
  owner: boolean
  open: boolean
  onToggle: () => void
}) => {
  const series = decodeSeries(submission.payload)
  const summary = summarize(series)
  const { stage, match } = findMatch(plan, matchKey)
  const [note, setNote] = useState(submission.note)
  const time = new Date(submission.submittedAt).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <li className="py-3">
      <button className="flex w-full items-start gap-3 text-left" onClick={onToggle}>
        <span className="tabular w-24 shrink-0 text-[12px] text-muted">
          {matchLabel(stage, match)}
          <span className="block text-faint">{time}</span>
        </span>
        <span className="min-w-0 flex-1">
          <MatchLines summary={summary} />
        </span>
        <SubmissionBadge status={submission.status} />
      </button>

      {open && (
        <div className="mt-3 space-y-4 rounded border border-rule bg-surface px-4 py-4">
          <ScoreSheetView games={series.games} />
          {owner && (
            <div className="space-y-2 border-t border-rule pt-3">
              <TextInput
                placeholder="差し戻す理由（例：第 2 ゲームの 5 投目を確認してください）"
                maxLength={500}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="text-alert"
                  disabled={note.trim() === ''}
                  onClick={() => reviewSubmission(eventId, matchKey, 'returned', note.trim())}
                >
                  差し戻す
                </Button>
                <Button onClick={() => reviewSubmission(eventId, matchKey, 'approved', '')}>
                  承認する
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

/** 試合中のコート。最後に投げた順に並べる */
const Live = ({ eventId, plan }: { eventId: string; plan: EventPlan }) => {
  const live = useCourtLive(eventId)
  const now = useMinuteClock()
  const list = Object.entries(live)
    .map(([uid, item]) => ({ uid, item, summary: summarize(decodeSeries(item.payload)) }))
    .filter(({ summary }) => !summary.finished)
    .sort((a, b) => b.item.updatedAt - a.item.updatedAt)

  if (list.length === 0) return <EmptyState>いま試合中のコートはありません</EmptyState>

  return (
    <ul className="grid gap-3 px-5 py-5 sm:grid-cols-2 lg:grid-cols-3">
      {list.map(({ uid, item, summary }) => (
        <LiveCard key={uid} plan={plan} item={item} summary={summary} now={now} />
      ))}
    </ul>
  )
}

const LiveCard = ({
  plan,
  item,
  summary,
  now,
}: {
  plan: EventPlan
  item: CourtLive
  summary: MatchSummary
  now: number
}) => {
  const { stage, match } = findMatch(plan, item.matchKey)
  return (
    <li className="rounded border border-rule bg-surface px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[14px]">{matchLabel(stage, match)}</p>
        <span className="tabular text-[11px] text-faint">{agoLabel(now - item.updatedAt)}</span>
      </div>
      <p className="mt-1 text-[11px] text-muted">第 {summary.gameNumber} ゲーム</p>
      <MatchLines summary={summary} />
    </li>
  )
}

/** コートに配る QR。読み取るとコートの記録係の画面がブラウザで開く */
const CourtQr = ({ eventId, onClose }: { eventId: string; onClose: () => void }) => {
  const url = eventCourtUrl(eventId)
  const [image, setImage] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void QRCode.toDataURL(url, {
      width: 560,
      margin: 1,
      color: { dark: '#15191a', light: '#fbfbfa' },
    }).then(setImage)
  }, [url])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/80 px-6 py-10">
      <div className="m-auto w-full max-w-sm rounded border border-rule bg-paper px-6 py-7 text-center">
        <p className="eyebrow text-muted">FOR COURTS</p>
        <p className="mt-1 font-serif text-2xl">コートの記録係へ</p>
        <p className="mt-2 text-[13px] text-muted">
          読み取るとブラウザで開きます。アプリを入れる必要はありません。印刷して各コートに貼っても使えます。
        </p>
        {image !== '' && <img src={image} alt="コート用の QR コード" className="mx-auto mt-5 w-56 rounded" />}
        <p className="mt-4 break-all text-[11px] text-faint">{url}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
          <Button
            onClick={async () => {
              await navigator.clipboard.writeText(url)
              setCopied(true)
            }}
          >
            {copied ? 'コピーしました' : 'リンクをコピー'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** 「何分前」の表示が古くならないよう、30 秒ごとに時刻を進める */
const useMinuteClock = () => {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

const agoLabel = (ms: number) => {
  const minutes = Math.floor(ms / 60_000)
  return minutes < 1 ? 'たった今' : `${minutes} 分前`
}
