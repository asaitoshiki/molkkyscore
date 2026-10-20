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
  nextNumberName,
  playersFromNames,
  resizeNames,
  shuffled,
  startPlan,
} from '../domain/eventPlan'
import type { Stage, StageFormat } from '../domain/eventPlan'
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
    const [knockout] = PLAN_TEMPLATES[2].build([])
    setStages([...stages, { ...knockout, id: `s${stages.length + 1}`, name: '次のステージ' }])
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

/** 勝ち抜けの数え方。リーグはブロック内の順位、トーナメントは 1 試合から進む人数 */
const ADVANCE_UNIT: Record<StageFormat, string> = {
  league: '位まで（各ブロック）',
  knockout: 'チーム（各試合）',
}

const GROUP_UNIT: Record<StageFormat, string> = { league: '1 ブロック', knockout: '1 試合' }

/** 1 ステージの設定。普段は概要だけ見せ、開くとルールまで直せる */
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
        </span>
      </summary>

      <div className="space-y-3 border-t border-rule px-4 py-4">
        <TextInput
          aria-label="ステージの名前"
          value={stage.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        <div className="flex gap-1.5">
          {FORMATS.map((format) => (
            <button
              key={format}
              className={`rounded-full border px-3 py-1.5 text-[13px] ${
                stage.format === format ? 'border-accent bg-accent text-paper' : 'border-rule text-muted'
              }`}
              onClick={() => onChange({ format })}
            >
              {FORMAT_LABEL[format]}
            </button>
          ))}
        </div>
        <NumberRow
          label={GROUP_UNIT[stage.format]}
          unit="チーム"
          value={stage.groupSize}
          onChange={(raw) => onChange({ groupSize: clampNumber(raw, 1, 12) })}
        />
        <NumberRow
          label="勝ち抜け"
          unit={ADVANCE_UNIT[stage.format]}
          value={stage.advancePerGroup}
          onChange={(raw) => onChange({ advancePerGroup: clampNumber(raw, 1, stage.groupSize) })}
        />
        {stage.format === 'league' && (
          <>
            <NumberRow
              label="敗者復活"
              unit={`チーム（各ブロックの ${stage.advancePerGroup + 1} 位から）`}
              value={stage.wildcards}
              onChange={(raw) => onChange({ wildcards: clampNumber(raw, 0, 99) })}
            />
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                className="accent-accent"
                checked={stage.pointsBreakTies}
                onChange={(event) => onChange({ pointsBreakTies: event.target.checked })}
              />
              勝ったゲーム数が並んだら、合計点で順位を決める（チェックしないときは、7m 投などの結果を本部が入力します）
            </label>
          </>
        )}
        <div className="border-t border-rule pt-3">
          <RulesEditor
            rules={stage.rules}
            presets={TOURNAMENT_PRESETS}
            onChange={(rules) => onChange({ rules })}
          />
        </div>
        {onRemove && (
          <button className="text-[12px] text-alert" onClick={onRemove}>
            このステージを消す
          </button>
        )}
      </div>
    </details>
  </li>
)

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
