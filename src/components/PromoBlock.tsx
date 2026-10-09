import { Icon } from './Icon'
import { promotionsFor } from '../domain/promotions'
import type { PromoSlot } from '../domain/promotions'

/**
 * 広告・アフィリエイトの枠。
 *
 * 景品表示法（いわゆるステマ規制）により、広告であることの明示が必要。
 * そのため「広告」の見出しは引数で消せないようにしてある。
 *
 * 左右の余白は持たない。置く側の余白に合わせる。
 */
export const PromoBlock = ({ slot }: { slot: PromoSlot }) => {
  const items = promotionsFor(slot)
  if (items.length === 0) return null

  return (
    <section className="pt-3">
      <h2 className="eyebrow mb-3 border-t border-rule pt-3 text-muted">広告</h2>
      <ul className="divide-y divide-rule border-y border-rule">
        {items.map((item) => (
          <li key={item.id}>
            <a
              className="flex items-center gap-3 py-3.5"
              href={item.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[14px]">{item.title}</span>
                <span className="mt-0.5 block text-[12px] text-muted">{item.note}</span>
              </span>
              <span className="shrink-0 text-accent">
                <Icon name="arrowRight" size={18} />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
