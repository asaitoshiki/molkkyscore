import { useState } from 'react'
import { SubmissionBadge } from './SubmissionBadge'
import { Button, TextInput } from './ui'
import type { Submission } from '../domain/event'
import {
  WILDCARD_KEY,
  drawGroups,
  groupDone,
  groupStandings,
  matchesOf,
  nameOf,
  qualify,
  replaceStage,
  swapPlayers,
} from '../domain/eventPlan'
import type { EventPlan, Group, GroupStanding, MatchResult, Stage } from '../domain/eventPlan'
import { formatLabel } from '../domain/formats'

type PanelProps = {
  plan: EventPlan
  stage: Stage
  results: Record<string, MatchResult>
  submissions: Record<string, Submission>
  /** 本部の端末だけが書き換えられる。ほかの端末では null */
  save: ((plan: EventPlan) => void) | null
}

/**
 * 1 ステージの進み具合。組み合わせを作る → 発表する → 結果を見て同点を決める → 次へ、の順に進む。
 * 前のステージが終わるまでは、次のステージの組み合わせは作れない
 */
export const StagePanel = (props: PanelProps) => {
  const { plan, stage } = props
  const index = plan.stages.findIndex((item) => item.id === stage.id)
  const previous = plan.stages[index - 1]

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-muted">
        {formatLabel(stage.rules)}・{stage.rules.targetScore} 点
        {stage.rules.maxTurns !== null && `・${stage.rules.maxTurns} ターン`}
        {stage.rules.timeLimitMinutes !== null && `・${stage.rules.timeLimitMinutes} 分`}
        {stage.rules.finalAmongWinners && '・最終ゲームはゲームを取った人だけ'}
      </p>
      {stage.groups.length === 0 ? (
        <NextDraw {...props} previous={previous} />
      ) : stage.started ? (
        <Running {...props} last={index === plan.stages.length - 1} />
      ) : (
        <Draft {...props} />
      )}
    </div>
  )
}

/** 前のステージを勝ち抜けた人で、このステージの組み合わせを作る */
const NextDraw = ({ plan, stage, results, save, previous }: PanelProps & { previous: Stage }) => {
  const qualification = qualify(previous, results)
  if (!previous.started || qualification.blockers.length > 0) {
    return (
      <div className="rounded border border-rule bg-surface px-4 py-4 text-[13px]">
        <p>「{previous.name}」が終わると、勝ち抜けた人で組み合わせを作れます。</p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[12px] text-muted">
          {qualification.blockers.slice(0, 8).map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      </div>
    )
  }
  return (
    <div className="rounded border border-accent bg-accent-soft px-4 py-4 text-[13px]">
      <p>「{previous.name}」から {qualification.playerIds.length} 人が勝ち抜けました。</p>
      <p className="mt-1 text-[12px] text-muted">
        成績の良い人どうしが早く当たらないよう、成績順に振り分けます。発表の前に入れ替えられます。
      </p>
      {save && (
        <Button
          className="mt-3 w-full"
          onClick={() =>
            save(replaceStage(plan, stage.id, { groups: drawGroups(stage, qualification.playerIds) }))
          }
        >
          組み合わせを作る
        </Button>
      )}
    </div>
  )
}

/** 発表前の組み合わせ。2 人を順にタップすると入れ替わる。グループの名前（コート名など）も直せる */
const Draft = ({ plan, stage, save }: PanelProps) => {
  const [picked, setPicked] = useState<string | null>(null)

  const tap = (playerId: string) => {
    if (save === null) return
    if (picked === null) return setPicked(playerId)
    setPicked(null)
    if (picked !== playerId) save(replaceStage(plan, stage.id, { groups: swapPlayers(stage.groups, picked, playerId) }))
  }
  const rename = (group: Group, label: string) =>
    save!(
      replaceStage(plan, stage.id, {
        groups: stage.groups.map((item) => (item.id === group.id ? { ...item, label } : item)),
      }),
    )

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted">
        まだコートには見えていません。入れ替えたい 2 人を順にタップしてください。
      </p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {stage.groups.map((group) => (
          <li key={group.id} className="rounded border border-rule bg-surface px-3 py-3">
            <TextInput
              aria-label="グループの名前"
              key={group.label}
              defaultValue={group.label}
              disabled={save === null}
              className="py-1.5 text-[14px]"
              onBlur={(event) => event.target.value.trim() !== '' && rename(group, event.target.value.trim())}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {group.playerIds.map((playerId) => (
                <button
                  key={playerId}
                  className={`rounded-full border px-2.5 py-1 text-[13px] ${
                    picked === playerId ? 'border-accent bg-accent text-paper' : 'border-rule'
                  }`}
                  onClick={() => tap(playerId)}
                >
                  {nameOf(plan, playerId)}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {save && (
        <Button className="w-full" onClick={() => save(replaceStage(plan, stage.id, { started: true }))}>
          組み合わせを発表して、コートで始められるようにする
        </Button>
      )}
    </div>
  )
}

/** 進行中のステージ。グループごとの順位と試合の状況、敗者復活、勝ち抜けを並べる */
const Running = (props: PanelProps & { last: boolean }) => {
  const { plan, stage, results, last } = props
  const qualification = qualify(stage, results)

  return (
    <div className="space-y-4">
      {/* 開いたグループの隣が一緒に伸びないよう、上で揃える */}
      <ul className="grid items-start gap-3 lg:grid-cols-2">
        {stage.groups.map((group) => (
          <GroupCard key={group.id} {...props} group={group} />
        ))}
      </ul>

      {stage.wildcards > 0 && <Wildcards {...props} pool={qualification.wildcardPool} />}

      <section className="rounded border border-rule bg-surface px-4 py-4">
        <p className="eyebrow text-muted">{last ? '最終結果' : '勝ち抜け'}</p>
        {qualification.blockers.length > 0 ? (
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[12px] text-muted">
            {qualification.blockers.slice(0, 8).map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
            {qualification.blockers.length > 8 && <li>ほか {qualification.blockers.length - 8} 件</li>}
          </ul>
        ) : last ? (
          <FinalResult plan={plan} stage={stage} results={results} />
        ) : (
          <p className="mt-2 text-[13px]">
            {qualification.playerIds.map((id) => nameOf(plan, id)).join('、')}
            <span className="ml-1 text-muted">（{qualification.playerIds.length} 人）</span>
          </p>
        )}
      </section>
    </div>
  )
}

/** 最後のステージの順位。決勝が 1 試合なら、そのまま優勝・準優勝・3 位になる */
const FinalResult = ({
  plan,
  stage,
  results,
}: {
  plan: EventPlan
  stage: Stage
  results: Record<string, MatchResult>
}) => (
  <ol className="mt-2 space-y-1">
    {stage.groups.flatMap((group) =>
      groupStandings(stage, group, results).map((line) => (
        <li key={line.playerId} className="flex items-baseline gap-3">
          <span className="w-16 text-[12px] text-muted">{['優勝', '準優勝', '3 位'][line.rank - 1] ?? `${line.rank} 位`}</span>
          <span className={line.rank === 1 ? 'font-serif text-xl text-accent' : 'text-[15px]'}>
            {nameOf(plan, line.playerId)}
          </span>
        </li>
      )),
    )}
  </ol>
)

/** グループ 1 つ。ふだんは要点だけ見せ、開くと順位表と試合が出る */
const GroupCard = ({ plan, stage, group, results, submissions, save }: PanelProps & { group: Group }) => {
  const lines = groupStandings(stage, group, results)
  const matches = matchesOf(stage).filter((match) => match.groupId === group.id)
  const approved = matches.filter((match) => results[match.key]?.approved === true).length
  const done = groupDone(stage, group, results)
  const tied = lines.filter((line) => line.tied)

  return (
    <li className={`rounded border bg-surface ${tied.length > 0 ? 'border-alert' : 'border-rule'}`}>
      <details open={tied.length > 0}>
        <summary className="flex cursor-pointer items-center gap-3 px-4 py-3">
          <span className="font-serif text-lg">{group.label}</span>
          <span className="min-w-0 flex-1 truncate text-[12px] text-muted">
            {tied.length > 0 ? '同点の順位を決めてください' : `1 位 ${nameOf(plan, lines[0].playerId)}`}
          </span>
          <span className={`tabular shrink-0 text-[12px] ${done ? 'text-accent' : 'text-muted'}`}>
            {done ? '完了' : `${approved} / ${matches.length}`}
          </span>
        </summary>
        <div className="border-t border-rule px-4 py-3">
          <StandingsTable plan={plan} lines={lines} advance={stage.advancePerGroup} />
          {tied.length > 0 && save && (
            <TieBreaker
              plan={plan}
              tied={tied}
              order={stage.tiebreaks[group.id] ?? []}
              onChange={(order) =>
                save(replaceStage(plan, stage.id, { tiebreaks: { ...stage.tiebreaks, [group.id]: order } }))
              }
            />
          )}
          {matches.length > 0 && (
            <ul className="mt-3 divide-y divide-rule border-t border-rule text-[13px]">
              {matches.map((match) => (
                <li key={match.key} className="flex items-center gap-2 py-1.5">
                  <span className="tabular w-5 text-[11px] text-faint">{match.key.split('-').at(-1)}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {match.playerIds.map((id) => nameOf(plan, id)).join(' 対 ')}
                  </span>
                  <SubmissionBadge status={submissions[match.key]?.status ?? 'none'} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </li>
  )
}

const StandingsTable = ({
  plan,
  lines,
  advance,
}: {
  plan: EventPlan
  lines: GroupStanding[]
  advance: number
}) => (
  <table className="tabular w-full text-[13px]">
    <thead>
      <tr className="text-[11px] text-muted">
        <th className="w-6 py-1 text-left font-normal">位</th>
        <th className="py-1 text-left font-normal">名前</th>
        <th className="w-10 py-1 text-right font-normal">試合</th>
        <th className="w-12 py-1 text-right font-normal">ゲーム</th>
        <th className="w-12 py-1 text-right font-normal">点</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-rule">
      {lines.map((line) => (
        <tr key={line.playerId} className={line.rank <= advance ? 'text-accent' : ''}>
          <td className="py-1.5">{line.tied ? '＝' : line.rank}</td>
          <td className="max-w-0 truncate py-1.5">{nameOf(plan, line.playerId)}</td>
          <td className="py-1.5 text-right text-muted">{line.played}</td>
          <td className="py-1.5 text-right font-semibold">{line.sets}</td>
          <td className="py-1.5 text-right text-muted">{line.points}</td>
        </tr>
      ))}
    </tbody>
  </table>
)

/**
 * 同点の人たちの順位を 7m 投などで決めた結果を入れる。勝った人から順にタップする。
 * 1 位だけ決めればよいときは、1 人タップすれば残りは下に回る
 */
const TieBreaker = ({
  plan,
  tied,
  order,
  onChange,
}: {
  plan: EventPlan
  tied: { playerId: string }[]
  order: string[]
  onChange: (order: string[]) => void
}) => (
  <div className="mt-3 rounded border border-alert px-3 py-3">
    <p className="text-[12px] text-alert">同点です。7m 投などで決めて、勝った人から順にタップしてください。</p>
    <div className="mt-2 flex flex-wrap gap-1.5">
      {tied.map((line) => (
        <button
          key={line.playerId}
          className="rounded-full border border-rule bg-paper px-3 py-1 text-[13px]"
          onClick={() => onChange([...order, line.playerId])}
        >
          {nameOf(plan, line.playerId)}
        </button>
      ))}
    </div>
    {order.length > 0 && (
      <button className="mt-2 text-[12px] text-muted underline" onClick={() => onChange([])}>
        決めた順をやり直す
      </button>
    )}
  </div>
)

/** 各ブロックの次点の並び。上から決めた人数が敗者復活で進む */
const Wildcards = ({
  plan,
  stage,
  save,
  pool,
}: PanelProps & { pool: ReturnType<typeof qualify>['wildcardPool'] }) => {
  const tied = pool.filter((line) => line.tied)
  return (
    <section className="rounded border border-rule bg-surface px-4 py-4">
      <p className="eyebrow text-muted">
        敗者復活（各ブロック {stage.advancePerGroup + 1} 位から {stage.wildcards} 人）
      </p>
      <div className="mt-2">
        <StandingsTable plan={plan} lines={pool} advance={stage.wildcards} />
      </div>
      {tied.length > 0 && save && (
        <TieBreaker
          plan={plan}
          tied={tied}
          order={stage.tiebreaks[WILDCARD_KEY] ?? []}
          onChange={(order) =>
            save(replaceStage(plan, stage.id, { tiebreaks: { ...stage.tiebreaks, [WILDCARD_KEY]: order } }))
          }
        />
      )}
    </section>
  )
}
