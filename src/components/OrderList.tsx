import { useRef, useState } from 'react'
import { Icon } from './Icon'
import { Numeral } from './ui'

/**
 * 長押しして上下に動かせる並べ替えリスト。
 * 指でもマウスでも同じ操作になるよう、ポインタイベントだけで組み立てている。
 */
export const OrderList = ({
  items,
  onChange,
}: {
  items: string[]
  onChange: (items: string[]) => void
}) => {
  const listRef = useRef<HTMLUListElement>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const move = (clientY: number) => {
    const rows = [...listRef.current!.children] as HTMLElement[]
    const target = rows.findIndex((row) => {
      const box = row.getBoundingClientRect()
      return clientY >= box.top && clientY <= box.bottom
    })
    if (target < 0 || target === dragIndex) return

    const next = [...items]
    next.splice(target, 0, ...next.splice(dragIndex!, 1))
    onChange(next)
    setDragIndex(target)
  }

  return (
    <ul ref={listRef} className="divide-y divide-rule border-y border-rule">
      {items.map((item, index) => (
        <li
          key={item}
          className={`flex items-center gap-3 px-1 py-3 ${
            dragIndex === index ? 'bg-accent-soft' : ''
          }`}
        >
          <Numeral className="w-6 text-center text-[15px] text-muted">{index + 1}</Numeral>
          <span className="flex-1 truncate text-[15px]">{item}</span>
          <button
            aria-label={`${item} を並べ替える`}
            className="touch-none px-2 py-1 text-faint"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              setDragIndex(index)
            }}
            onPointerMove={(event) => dragIndex !== null && move(event.clientY)}
            onPointerUp={() => setDragIndex(null)}
            onPointerCancel={() => setDragIndex(null)}
          >
            <Icon name="grip" size={20} />
          </button>
        </li>
      ))}
    </ul>
  )
}
