import { INITIAL_FORMATION } from '../domain/rules'

/**
 * 実際のスキットルの並びどおりに番号を置く。
 * 盤面を見たまま指が動くよう、奥の列を上に描く。
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
            className={`tabular h-14 w-14 rounded-full border font-serif text-xl transition active:scale-90 ${
              selected.includes(pin)
                ? 'border-accent bg-accent text-paper'
                : 'border-rule bg-surface text-ink'
            }`}
          >
            {pin}
          </button>
        ))}
      </div>
    ))}
  </div>
)
