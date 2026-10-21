import type { ReactNode } from 'react'
import { TextInput } from './ui'
import { formatLabel } from '../domain/formats'
import type { FormatPreset } from '../domain/formats'
import { clampNumber } from '../domain/rules'
import type { DecideBy, GameRules, NextOrder } from '../domain/types'

/** ゲーム数の欄の名前と単位。先取は「何ゲーム取ったら勝ちか」を入れる */
const COUNT_FIELD: Record<DecideBy, { label: string; unit: string }> = {
  wins: { label: 'ゲーム数', unit: 'ゲーム' },
  total: { label: 'ゲーム数', unit: 'ゲーム（合計点で決める）' },
  race: { label: '先取', unit: 'ゲーム先に取ったら勝ち' },
}

/** 最終ゲームを絞る決まりの説明。先取は終わりが決まっていないので言い方が変わる */
const FINALIST_NOTE: Record<DecideBy, string> = {
  wins: '最終ゲームは、それまでにゲームを取ったチームだけで行う',
  total: '最終ゲームは、それまでにゲームを取ったチームだけで行う',
  race: 'あと 1 ゲームで勝ちのチームが 2 つ以上そろったら、そのチームだけで次のゲームを行う',
}

const ORDER_OPTIONS: { value: NextOrder; label: string }[] = [
  { value: 'reverse', label: '前のゲームの逆順' },
  { value: 'same', label: '前のゲームと同じ' },
  { value: 'loserFirst', label: '点の低い組から' },
]

/**
 * 試合ルールの設定。形を選ぶだけで始められ、細かい決まりは折りたたみの中で変える。
 * 大会ごとのローカルルール（目標点・ミスの回数・制限時間など）に合わせるためのもの。
 */
export const RulesEditor = ({
  rules,
  presets,
  onChange,
}: {
  rules: GameRules
  presets: FormatPreset[]
  onChange: (rules: GameRules) => void
}) => {
  const update = (patch: Partial<GameRules>) => onChange({ ...rules, ...patch })
  const selected = (preset: FormatPreset) =>
    preset.gameCount === rules.gameCount && preset.decideBy === rules.decideBy

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset.label}
            className={`rounded-full border px-3 py-1.5 text-[13px] ${
              selected(preset) ? 'border-accent bg-accent text-paper' : 'border-rule text-muted'
            }`}
            onClick={() => update({ gameCount: preset.gameCount, decideBy: preset.decideBy })}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-muted">
        {presets.find(selected)?.note ?? formatLabel(rules)}
      </p>

      <details className="mt-3">
        <summary className="cursor-pointer text-[12px] text-accent">細かいルールを変える</summary>
        <div className="mt-3 space-y-2.5">
          {rules.gameCount !== null && (
            <Field label={COUNT_FIELD[rules.decideBy].label}>
              <NumberInput
                value={rules.gameCount}
                onChange={(raw) => update({ gameCount: clampNumber(raw, 1, 9) })}
              />
              <Unit>{COUNT_FIELD[rules.decideBy].unit}</Unit>
            </Field>
          )}
          <Field label="目標点">
            <NumberInput
              value={rules.targetScore}
              onChange={(raw) => {
                const targetScore = clampNumber(raw, 10, 200)
                // 戻る点は目標点より下でないと試合が終わらない
                update({ targetScore, penaltyScore: Math.min(rules.penaltyScore, targetScore - 1) })
              }}
            />
            <Unit>点ちょうどで勝ち</Unit>
          </Field>
          <Field label="超えたとき">
            <NumberInput
              value={rules.penaltyScore}
              onChange={(raw) =>
                update({ penaltyScore: clampNumber(raw, 0, rules.targetScore - 1) })
              }
            />
            <Unit>点に戻る</Unit>
          </Field>
          <Field label="連続ミス">
            <NumberInput
              value={rules.maxMisses}
              onChange={(raw) => update({ maxMisses: clampNumber(raw, 1, 9) })}
            />
            <Unit>回で失格</Unit>
          </Field>
          <Field label="制限時間">
            <NumberInput
              value={rules.timeLimitMinutes ?? ''}
              placeholder="なし"
              onChange={(raw) =>
                update({ timeLimitMinutes: raw === '' ? null : clampNumber(raw, 1, 180) })
              }
            />
            <Unit>分（試合全体）</Unit>
          </Field>
          <Field label="ターン制限">
            <NumberInput
              value={rules.maxTurns ?? ''}
              placeholder="なし"
              onChange={(raw) => update({ maxTurns: raw === '' ? null : clampNumber(raw, 1, 99) })}
            />
            <Unit>ターンで打ち切り、点の多い方の勝ち</Unit>
          </Field>
          <Field label="次のゲーム">
            <select
              className="rounded border border-rule bg-surface px-2 py-2 text-[14px]"
              value={rules.nextOrder}
              onChange={(event) => update({ nextOrder: event.target.value as NextOrder })}
            >
              {ORDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Unit>に投げる</Unit>
          </Field>
          {/* 3 チーム以上の試合で、最終ゲームをゲームを取ったチームどうしの 1 対 1 にする大会向け */}
          <label className="flex items-start gap-2 pt-1 text-[13px]">
            <input
              type="checkbox"
              className="mt-0.5 accent-accent"
              checked={rules.finalAmongWinners}
              onChange={(event) => update({ finalAmongWinners: event.target.checked })}
            />
            <span>{FINALIST_NOTE[rules.decideBy]}</span>
          </label>
        </div>
      </details>
    </div>
  )
}

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="flex items-center gap-3 text-[14px]">
    <span className="w-20 shrink-0 text-muted">{label}</span>
    <span className="flex items-center gap-1.5">{children}</span>
  </label>
)

const Unit = ({ children }: { children: ReactNode }) => (
  <span className="text-[12px] whitespace-nowrap text-muted">{children}</span>
)

/**
 * 打っている途中の値（例えば 50 を打つ途中の 5）で範囲に丸めないよう、確定は入力欄を離れたときにする。
 * 丸めた値が戻ってきたら key が変わり、表示も揃う
 */
const NumberInput = ({
  value,
  placeholder,
  onChange,
}: {
  value: number | ''
  placeholder?: string
  onChange: (raw: string) => void
}) => (
  // 入力欄は幅いっぱいに広がる作りなので、外側で幅を決める
  <span className="w-16 shrink-0">
    <TextInput
      key={value}
      type="number"
      inputMode="numeric"
      className="tabular text-right"
      defaultValue={value}
      placeholder={placeholder}
      onBlur={(event) => onChange(event.target.value)}
    />
  </span>
)
