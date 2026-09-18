import { PIN_NUMBERS } from '../domain/rules'

/**
 * スキットル番号ごとの撃破数を示す単系列の棒グラフ。
 * 系列が 1 つなので凡例は置かず、最大値だけ直接ラベルを付けて残りはホバーで補う。
 */
export const PinHitChart = ({ hits }: { hits: number[] }) => {
  const max = Math.max(...hits, 1)

  return (
    <figure className="m-0">
      <figcaption className="eyebrow mb-5">よく倒すスキットル</figcaption>
      <div className="flex h-20 items-end gap-[3px] border-b border-rule">
        {PIN_NUMBERS.map((pin, index) => {
          const value = hits[index]
          const tallest = value === max && value > 0
          return (
            <div
              key={pin}
              title={`${pin} 番　${value} 本`}
              className="relative flex-1 bg-accent"
              style={{ height: `${Math.max((value / max) * 100, 1.5)}%` }}
            >
              {tallest && (
                <span className="tabular absolute inset-x-0 -top-5 text-center font-serif text-[12px]">
                  {value}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-[3px]">
        {PIN_NUMBERS.map((pin) => (
          <span key={pin} className="tabular flex-1 text-center text-[10px] text-faint">
            {pin}
          </span>
        ))}
      </div>
    </figure>
  )
}
