import { INITIAL_FORMATION } from '../domain/rules'

/**
 * 実際のスキットルの並びどおりに番号を置く。
 * 盤面を見たまま指が動くよう、奥の列を上に描く。
 * 白木のスキットルを上から見た形にし、倒した（選んだ）ものは芝の緑に変える。
 */
const ROWS = [...INITIAL_FORMATION].reverse()

export const PinPad = ({
  selected,
  onToggle,
}: {
  selected: number[]
  onToggle: (pin: number) => void
}) => (
  <div className="space-y-2.5">
    {ROWS.map((row, index) => (
      <div key={index} className="flex justify-center gap-2.5">
        {row.map((pin) => (
          <button
            key={pin}
            aria-pressed={selected.includes(pin)}
            onClick={() => onToggle(pin)}
            className={`tabular press h-[60px] w-[60px] rounded-full border-2 font-serif text-2xl font-semibold ${
              selected.includes(pin)
                ? 'border-accent bg-accent text-white [--press:var(--color-accent-deep)]'
                : 'border-wood-deep bg-wood text-ink [--press:var(--color-wood-deep)]'
            }`}
          >
            {pin}
          </button>
        ))}
      </div>
    ))}
  </div>
)
