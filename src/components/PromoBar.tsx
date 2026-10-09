import { Icon } from './Icon'
import { promotionsFor } from '../domain/promotions'
import type { PromoSlot } from '../domain/promotions'

/**
 * 下タブの上に出す広告の帯。
 *
 * 1 件だけ出す。帯に複数並べると、どれも読まれないうえにタブを押しにくくなる。
 * 出す順は PROMOTIONS の並び順。
 *
 * 景品表示法（ステマ規制）により広告であることの明示が要るため、
 * 「広告」の表示は引数で消せないようにしてある。
 */
export const PromoBar = ({ slot }: { slot: PromoSlot }) => {
  const item = promotionsFor(slot)[0]
  if (item === undefined) return null

  return (
    <a
      className="flex items-center gap-3 border-t border-rule bg-surface px-5 py-2.5"
      href={item.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
    >
      <span className="eyebrow shrink-0 text-faint">広告</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px]">{item.title}</span>
        <span className="block truncate text-[11px] text-muted">{item.note}</span>
      </span>
      <span className="shrink-0 text-accent">
        <Icon name="arrowRight" size={16} />
      </span>
    </a>
  )
}
