import type { ReactNode } from 'react'

/**
 * 画面上部の見出し。紙の地に、左から操作・見出し・右の操作を並べる。
 * 色の付いた帯にはせず、本文と地続きにして静かに見せる。
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
  <header className="safe-top sticky top-0 z-10 border-b border-rule bg-paper/95 backdrop-blur">
    <div className="flex h-12 items-center gap-3 px-4">
      <div className="flex items-center gap-4 text-muted">{left}</div>
      <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{title}</p>
      <div className="flex items-center gap-4 text-muted">{right}</div>
    </div>
  </header>
)
