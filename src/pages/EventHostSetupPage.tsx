import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { OrderList } from '../components/OrderList'
import { RulesEditor } from '../components/RulesEditor'
import { Button, SectionTitle, TextInput } from '../components/ui'
import {
  FORMAT_LABEL,
  PLAN_TEMPLATES,
  RANK_KEY_LABEL,
  newStage,
  nextNumberName,
  playersFromNames,
  rankingLabel,
  resizeNames,
  shuffled,
  startPlan,
} from '../domain/eventPlan'
import type { RankKey, Stage, StageFormat } from '../domain/eventPlan'
import type { PointRules } from '../domain/points'
import { TOURNAMENT_PRESETS, formatLabel } from '../domain/formats'
import { moveItem } from '../domain/order'
import { clampNumber } from '../domain/rules'
import { createEvent } from '../sync/eventChannel'
import { useAppStore } from '../store/useAppStore'

/** 電波が無いと書き込みが返ってこないため、待つのはここまでにする */
const CONNECT_TIMEOUT_MS = 10_000

/**
 * 本部として大会を開く。
 * 参加者と大会の形（ステージの並び）を決めると、最初のステージの組み合わせができ、
 * 各コートに配る QR が出る。ステージごとにルールを変えられる（決勝だけ 100 点ゲームなど）
 */
export const EventHostSetupPage = () => {
  const navigate = useNavigate()
  const addHostedEvent = useAppStore((state) => state.addHostedEvent)

  const [name, setName] = useState('')
  // 名前の初期値は番号。ゼッケン番号のまま使ってもよい
  const [names, setNames] = useState(['1', '2'])
  const [lottery, setLottery] = useState(true)
  const [template, setTemplate] = useState(0)
  const [stages, setStages] = useState<Stage[]>(() => PLAN_TEMPLATES[0].build([]))
  const [status, setStatus] = useState<'idle' | 'creating' | 'failed'>('idle')

  const players = playersFromNames(names)
  const trimmed = names.map((item) => item.trim())
  const blank = trimmed.some((item) => item === '')
  const duplicated = new Set(trimmed).size !== trimmed.length

  // 1 対 1 のトーナメントは人数でラウンド数が変わるので、選んだ時点の人数で作る
  const chooseTemplate = (index: number) => {
    setTemplate(index)
    setStages(PLAN_TEMPLATES[index].build(players))
  }

  const updateStage = (index: number, patch: Partial<Stage>) =>
    setStages(stages.map((stage, position) => (position === index ? { ...stage, ...patch } : stage)))

  const addStage = () => {
    setStages([...stages, newStage(stages.length, { name: '次のステージ' })])
  }

  // 消したあとも提出の置き場所がずれないよう、ステージの ID は並び順で振り直す
  const removeStage = (index: number) =>
    setStages(
      stages
        .filter((_, position) => position !== index)
        .map((stage, position) => ({ ...stage, id: `s${position + 1}` })),
    )

  const create = async () => {
    setStatus('creating')
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), CONNECT_TIMEOUT_MS),
    )
    // 抽選のときは配る順だけを混ぜる。参加者の一覧は入れた順のまま残す
    const plan = { ...startPlan(lottery ? shuffled(players) : players, stages), players }
    const eventId = await Promise.race([createEvent(name, plan), timeout]).catch(() => null)
    if (eventId === null) return setStatus('failed')
    addHostedEvent({ eventId, name: name.trim() })
    navigate(`/e/${eventId}/hq`, { replace: true })
  }

  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow text-muted">HEADQUARTERS</p>
        <h1 className="mt-1 font-serif text-2xl">本部で大会を開く</h1>
        <p className="mt-2 text-[13px] text-muted">
          予選から決勝まで、ブロック分け・対戦表・順位・勝ち上がりをまとめて管理します。
          各コートの選手は自分のスマホで記録し、終わった試合のスコアシートが本部に届きます。
        </p>
      </header>

      <section>
        <SectionTitle>大会名</SectionTitle>
        <TextInput
          value={name}
          maxLength={100}
          placeholder="例：第 1 回 ○○モルック大会"
          onChange={(event) => setName(event.target.value)}
        />
      </section>

      <section className="border-t border-rule pt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl">参加チーム</h2>
          {/* 数を入れるとまとめて増減できる。打っている途中で丸めないよう、確定は入力欄を離れたとき */}
          <label className="flex items-center gap-1.5 text-[12px] text-muted">
            <span className="w-16">
              <TextInput
                key={names.length}
                aria-label="チーム数"
                type="number"
                inputMode="numeric"
                className="tabular py-1.5 text-right"
                defaultValue={names.length}
                onBlur={(event) => setNames(resizeNames(names, clampNumber(event.target.value, 2, 300)))}
              />
            </span>
            チーム
          </label>
        </div>
        <p className="mt-1 mb-5 text-[12px] text-muted">
          取っ手で順番を入れ替え、名前はタップして直せます。
        </p>

        <OrderList
          items={names}
          onMove={(from, to) => setNames(moveItem(names, from, to))}
          renderItem={(item, index) => (
            <>
              <input
                aria-label={`${index + 1} 番目のチームの名前`}
                className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1 text-[15px] outline-none placeholder:text-faint focus:border-accent focus-visible:outline-none"
                placeholder="チーム名"
                value={item}
                onChange={(event) =>
                  setNames(names.map((name, position) => (position === index ? event.target.value : name)))
                }
              />
              {names.length > 2 && (
                <button
                  aria-label={`${item} を外す`}
                  className="shrink-0 p-1 text-faint"
                  onClick={() => setNames(names.filter((_, position) => position !== index))}
                >
                  <Icon name="close" size={16} />
                </button>
              )}
            </>
          )}
        />

        <button
          className="mt-3 flex items-center gap-2 py-1 text-[14px] text-accent"
          onClick={() => setNames([...names, nextNumberName(names)])}
        >
          <Icon name="plus" size={16} />
          チームを追加
        </button>

        {(blank || duplicated) && (
          <p className="mt-2 text-[12px] text-alert">
            {blank ? '名前が空のチームがあります' : '同じ名前のチームがあります'}
          </p>
        )}

        <label className="mt-4 flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            className="accent-accent"
            checked={lottery}
            onChange={(event) => setLottery(event.target.checked)}
          />
          ブロック分けを抽選にする（外すと入れた順に配ります）
        </label>
      </section>

      <section>
        <SectionTitle>大会の形</SectionTitle>
        <div className="space-y-2">
          {PLAN_TEMPLATES.map((item, index) => (
            <button
              key={item.label}
              className={`block w-full rounded border px-4 py-3 text-left ${
                template === index ? 'border-accent bg-accent-soft' : 'border-rule bg-surface'
              }`}
              onClick={() => chooseTemplate(index)}
            >
              <span className="block text-[14px]">{item.label}</span>
              <span className="mt-0.5 block text-[12px] text-muted">{item.note}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>ステージ</SectionTitle>
        <p className="-mt-1 mb-3 text-[12px] text-muted">
          1 ブロックのチーム数・勝ち抜けの数・ルールは、ステージごとに変えられます（決勝だけ 100 点ゲームにする、など）。
        </p>
        <ol className="space-y-3">
          {stages.map((stage, index) => (
            <StageCard
              key={stage.id}
              stage={stage}
              index={index}
              onChange={(patch) => updateStage(index, patch)}
              onRemove={stages.length > 1 ? () => removeStage(index) : null}
            />
          ))}
        </ol>
        <button className="mt-3 flex items-center gap-2 py-1 text-[14px] text-accent" onClick={addStage}>
          <Icon name="plus" size={16} />
          ステージを追加
        </button>
      </section>

      {status === 'failed' && (
        <p className="text-[13px] text-alert">
          インターネットにつながらないため、大会を開けませんでした。電波のよい場所でもう一度お試しください。
        </p>
      )}

      <Button
        className="w-full py-4"
        disabled={name.trim() === '' || blank || duplicated || status === 'creating'}
        onClick={create}
      >
        {status === 'creating' ? '準備しています…' : '大会を開く'}
      </Button>
    </div>
  )
}

const FORMATS: StageFormat[] = ['league', 'knockout']

/** 勝ち抜けの数え方。リーグはブロック内の順位、トーナメントは 1 試合から進むチーム数 */
const ADVANCE_UNIT: Record<StageFormat, string> = {
  league: '位まで（各ブロック）',
  knockout: 'チーム（各試合）',
}

const GROUP_UNIT: Record<StageFormat, string> = { league: '1 ブロック', knockout: '1 試合' }

const RANK_KEYS: RankKey[] = ['rankPoints', 'sets', 'score']

/** 1 試合に出るチームの数。ポイントを何位まで決めるかに使う */
const teamsPerMatch = (stage: Stage) => {
  if (stage.format === 'knockout') return stage.groupSize
  return stage.rounds === null ? 2 : stage.matchSize
}

/** 1 ステージの設定。普段は概要だけ見せ、開くと組み方・順位の決め方・ポイント・ルールまで直せる */
const StageCard = ({
  stage,
  index,
  onChange,
  onRemove,
}: {
  stage: Stage
  index: number
  onChange: (patch: Partial<Stage>) => void
  onRemove: (() => void) | null
}) => (
  <li className="rounded border border-rule bg-surface">
    <details>
      <summary className="flex cursor-pointer items-center gap-3 px-4 py-3">
        <span className="tabular text-[12px] text-muted">{index + 1}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px]">{stage.name}</span>
          <span className="block text-[12px] text-muted">
            {FORMAT_LABEL[stage.format]}・{stage.groupSize} チームずつ・{formatLabel(stage.rules)}
            {stage.rules.maxTurns !== null && `・${stage.rules.maxTurns} ターン`}
            {stage.rules.timeLimitMinutes !== null && `・${stage.rules.timeLimitMinutes} 分`}
          </span>
          <span className="block text-[12px] text-muted">順位：{rankingLabel(stage)}</span>
        </span>
      </summary>

      <div className="space-y-5 border-t border-rule px-4 py-4">
        <div className="space-y-3">
          <TextInput
            aria-label="ステージの名前"
            value={stage.name}
            onChange={(event) => onChange({ name: event.target.value })}
          />
          <Chips
            options={FORMATS.map((format) => ({ value: format, label: FORMAT_LABEL[format] }))}
            value={stage.format}
            onChange={(format) => onChange({ format })}
          />
        </div>

        <Part title="組み方">
          <NumberRow
            label={GROUP_UNIT[stage.format]}
            unit="チーム"
            value={stage.groupSize}
            onChange={(raw) => onChange({ groupSize: clampNumber(raw, 1, 50) })}
          />
          {stage.format === 'league' && <LeagueSchedule stage={stage} onChange={onChange} />}
        </Part>

        <Part title="勝ち抜け">
          <NumberRow
            label="勝ち抜け"
            unit={ADVANCE_UNIT[stage.format]}
            value={stage.advancePerGroup}
            onChange={(raw) => onChange({ advancePerGroup: clampNumber(raw, 1, stage.groupSize) })}
          />
          {stage.format === 'league' && (
            <NumberRow
              label="敗者復活"
              unit={`チーム（各ブロックの ${stage.advancePerGroup + 1} 位から）`}
              value={stage.wildcards}
              onChange={(raw) => onChange({ wildcards: clampNumber(raw, 0, 99) })}
            />
          )}
        </Part>

        <Part title="順位の決め方">
          <RankingEditor ranking={stage.ranking} onChange={(ranking) => onChange({ ranking })} />
        </Part>

        {stage.ranking.includes('rankPoints') && (
          <Part title="ポイント（1 ゲームごと）">
            <PointsEditor stage={stage} onChange={(points) => onChange({ points })} />
          </Part>
        )}

        <Part title="1 試合のルール">
          <RulesEditor
            rules={stage.rules}
            presets={TOURNAMENT_PRESETS}
            onChange={(rules) => onChange({ rules })}
          />
        </Part>

        {onRemove && (
          <button className="text-[12px] text-alert" onClick={onRemove}>
            このステージを消す
          </button>
        )}
      </div>
    </details>
  </li>
)

const Part = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-3 border-t border-rule pt-3">
    <h3 className="eyebrow text-muted">{title}</h3>
    {children}
  </section>
)

const Chips = <T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map((option) => (
      <button
        key={option.value}
        className={`rounded-full border px-3 py-1.5 text-[13px] ${
          value === option.value ? 'border-accent bg-accent text-paper' : 'border-rule text-muted'
        }`}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </button>
    ))}
  </div>
)

type ScheduleKind = 'roundRobin' | 'rounds'

/**
 * リーグの試合の組み方。1 対 1 の総当たりか、何チームかずつの試合を決めた回数だけ行うか。
 * 後者はポイント制でよく使う（4 チームで 4 試合など）
 */
const LeagueSchedule = ({
  stage,
  onChange,
}: {
  stage: Stage
  onChange: (patch: Partial<Stage>) => void
}) => (
  <>
    <Chips<ScheduleKind>
      options={[
        { value: 'roundRobin', label: '1 対 1 の総当たり' },
        { value: 'rounds', label: '何チームかで数試合' },
      ]}
      value={stage.rounds === null ? 'roundRobin' : 'rounds'}
      onChange={(kind) =>
        onChange(
          kind === 'roundRobin'
            ? { rounds: null }
            : { rounds: 4, matchSize: Math.min(4, stage.groupSize) },
        )
      }
    />
    {stage.rounds !== null && (
      <>
        <NumberRow
          label="1 試合"
          unit="チーム"
          value={stage.matchSize}
          onChange={(raw) => onChange({ matchSize: clampNumber(raw, 2, stage.groupSize) })}
        />
        <NumberRow
          label="試合数"
          unit="試合（各チーム）"
          value={stage.rounds}
          onChange={(raw) => onChange({ rounds: clampNumber(raw, 1, 30) })}
        />
      </>
    )}
  </>
)

/**
 * 順位を比べる数字を、比べる順に選ぶ。2 番目以降は「なし」にもできる。
 * 選んだ数字が全部並んだときは、7m 投などの結果を本部が入れる
 */
const RankingEditor = ({
  ranking,
  onChange,
}: {
  ranking: RankKey[]
  onChange: (ranking: RankKey[]) => void
}) => {
  // ある段を選び直したら、それより後ろの段から同じ数字を外す
  const choose = (position: number, key: RankKey | null) => {
    const before = ranking.slice(0, position)
    const after = ranking.slice(position + 1).filter((item) => item !== key)
    onChange(key === null ? before : [...before, key, ...after])
  }
  const slots = Array.from({ length: Math.min(ranking.length + 1, RANK_KEYS.length) }, (_, index) => index)

  return (
    <div className="space-y-2">
      {slots.map((position) => (
        <label key={position} className="flex items-center gap-3 text-[14px]">
          <span className="w-20 shrink-0 text-muted">{position + 1} 番目</span>
          <select
            className="rounded border border-rule bg-surface px-2 py-2 text-[14px]"
            value={ranking[position] ?? ''}
            onChange={(event) => choose(position, (event.target.value || null) as RankKey | null)}
          >
            {position > 0 && <option value="">なし</option>}
            {RANK_KEYS.filter((key) => !ranking.slice(0, position).includes(key)).map((key) => (
              <option key={key} value={key}>
                {RANK_KEY_LABEL[key]}
              </option>
            ))}
          </select>
        </label>
      ))}
      <p className="text-[12px] text-muted">
        前の数字が並んだら次の数字で比べます。全部並んだら、7m 投などの結果を本部が入力します。
      </p>
    </div>
  )
}

/**
 * ゲームの順位ごとのポイント。1 位は上がり方で分ける（目標点ちょうどで上がった／ターン制限や時間切れ）。
 * 2 位から、1 試合に出るチームの数までを入れる
 */
const PointsEditor = ({ stage, onChange }: { stage: Stage; onChange: (points: PointRules) => void }) => {
  const { points } = stage
  const placeCount = Math.max(teamsPerMatch(stage) - 1, 1)
  const places = Array.from({ length: placeCount }, (_, index) => points.places[index] ?? 0)
  const cutoff = stage.rules.maxTurns === null ? 'ターン制限・時間切れ' : `${stage.rules.maxTurns} ターン・時間切れ`

  return (
    <div className="space-y-2">
      <NumberRow
        label="1 位"
        unit={`P（${stage.rules.targetScore} 点ちょうどで上がり）`}
        value={points.targetWin}
        onChange={(raw) => onChange({ ...points, targetWin: clampNumber(raw, 0, 999) })}
      />
      <NumberRow
        label="1 位"
        unit={`P（${cutoff}で点数がいちばん高い）`}
        value={points.cutoffWin}
        onChange={(raw) => onChange({ ...points, cutoffWin: clampNumber(raw, 0, 999) })}
      />
      {places.map((value, index) => (
        <NumberRow
          key={index}
          label={`${index + 2} 位`}
          unit="P"
          value={value}
          onChange={(raw) =>
            onChange({
              ...points,
              places: places.map((item, position) => (position === index ? clampNumber(raw, 0, 999) : item)),
            })
          }
        />
      ))}
      <p className="text-[12px] text-muted">同じ点数のチームは同じ順位になり、同じポイントが入ります。</p>
    </div>
  )
}

const NumberRow = ({
  label,
  unit,
  value,
  onChange,
}: {
  label: string
  unit: ReactNode
  value: number
  onChange: (raw: string) => void
}) => (
  <label className="flex items-center gap-3 text-[14px]">
    <span className="w-20 shrink-0 text-muted">{label}</span>
    {/* 打っている途中で丸めないよう、確定は入力欄を離れたとき */}
    <span className="w-16 shrink-0">
      <TextInput
        key={value}
        type="number"
        inputMode="numeric"
        className="tabular text-right"
        defaultValue={value}
        onBlur={(event) => onChange(event.target.value)}
      />
    </span>
    <span className="text-[12px] text-muted">{unit}</span>
  </label>
)
