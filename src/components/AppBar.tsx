import type { ReactNode } from 'react'

/**
 * 画面上部の帯。左右に操作、中央に現在地を置く。
 * ウィザードと試合画面で同じ形を使い、どこにいるかを一定の位置で示す。
 */
export const AppBar = ({
  title,
  left,
  right,
}: {
  title: string
  left?: ReactNode
  right?: ReactNode
}) => (
  <header className="safe-top sticky top-0 z-10 bg-accent text-paper">
    <div className="relative flex h-12 items-center px-3">
      <div className="flex min-w-16 items-center gap-4">{left}</div>
      <p className="eyebrow pointer-events-none absolute inset-x-0 text-center text-paper">
        {title}
      </p>
      <div className="ml-auto flex min-w-16 items-center justify-end gap-4">{right}</div>
    </div>
  </header>
)
