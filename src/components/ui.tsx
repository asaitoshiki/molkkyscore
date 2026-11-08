import type { ComponentProps, ReactNode } from 'react'
import { Icon } from './Icon'

/**
 * 使わなくても試合ができる追加の設定。閉じた状態では 1 行だけ見せ、押すと中身が開く。
 * hint には今の設定を短く出して、開かなくても中身が分かるようにする
 */
export const Fold = ({
  label,
  hint,
  defaultOpen = false,
  children,
}: {
  label: string
  hint?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) => (
  <details className="group rounded border-2 border-rule bg-surface" open={defaultOpen}>
    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
      <span className="min-w-0 flex-1 text-[15px] font-bold">{label}</span>
      <span className="shrink-0 text-[12px] text-muted">{hint}</span>
      <span className="shrink-0 text-faint transition-transform group-open:rotate-180">
        <Icon name="chevronDown" size={18} />
      </span>
    </summary>
    <div className="border-t-2 border-rule px-4 pt-3 pb-4">{children}</div>
  </details>
)

/** 白いカード。クリームの地から少し浮かせる */
export const Panel = ({ className = '', ...props }: ComponentProps<'div'>) => (
  <div className={`rounded border border-rule bg-surface ${className}`} {...props} />
)

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'outline' | 'quiet' | 'danger'
}

/** 押すボタンには厚み（press）を付け、文字だけのボタンは平らにする */
const buttonStyles = {
  primary: 'press bg-accent text-white border-accent [--press:var(--color-accent-deep)]',
  outline: 'press bg-surface text-ink border-rule [--press:var(--color-rule)]',
  quiet: 'bg-transparent text-muted border-transparent',
  danger: 'bg-transparent text-alert border-transparent',
} as const

export const Button = ({ variant = 'primary', className = '', ...props }: ButtonProps) => (
  <button
    className={`rounded border-2 px-4 py-3 text-[15px] font-bold disabled:opacity-35 ${buttonStyles[variant]} ${className}`}
    {...props}
  />
)

export const TextInput = ({ className = '', ...props }: ComponentProps<'input'>) => (
  <input
    className={`w-full rounded border-2 border-rule bg-surface px-3 py-2.5 text-[15px] outline-none placeholder:text-faint focus:border-accent ${className}`}
    {...props}
  />
)

/** 小さな見出し。上の細い罫線とセットで区画の始まりを示す。 */
export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="eyebrow mb-3 border-t border-rule pt-3 text-muted">{children}</h2>
)

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <p className="py-8 text-center text-[13px] text-muted">{children}</p>
)

/** 大きな数字。スコアは本文と別の書体にして、盤面の主役にする。 */
export const Numeral = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span className={`tabular font-serif leading-none ${className}`}>{children}</span>
)
