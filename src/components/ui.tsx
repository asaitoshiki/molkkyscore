import type { ComponentProps, ReactNode } from 'react'

/** 罫線で囲った面。影と角丸は最小限にして、紙の区画のように見せる。 */
export const Panel = ({ className = '', ...props }: ComponentProps<'div'>) => (
  <div className={`rounded border border-rule bg-surface ${className}`} {...props} />
)

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'outline' | 'quiet' | 'danger'
}

const buttonStyles = {
  primary: 'bg-accent text-paper border-accent',
  outline: 'bg-surface text-ink border-rule',
  quiet: 'bg-transparent text-muted border-transparent',
  danger: 'bg-transparent text-alert border-transparent',
} as const

export const Button = ({ variant = 'primary', className = '', ...props }: ButtonProps) => (
  <button
    className={`rounded border px-4 py-3 text-[15px] font-medium transition-colors disabled:opacity-35 ${buttonStyles[variant]} ${className}`}
    {...props}
  />
)

export const TextInput = ({ className = '', ...props }: ComponentProps<'input'>) => (
  <input
    className={`w-full rounded border border-rule bg-surface px-3 py-2.5 text-[15px] outline-none placeholder:text-faint focus:border-accent ${className}`}
    {...props}
  />
)

/** 小さな見出し。上の細い罫線とセットで区画の始まりを示す。 */
export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="eyebrow mb-3 border-t border-rule pt-3">{children}</h2>
)

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <p className="py-8 text-center text-[13px] text-muted">{children}</p>
)

/** 大きな数字。スコアは本文と別の書体にして、盤面の主役にする。 */
export const Numeral = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span className={`tabular font-serif leading-none ${className}`}>{children}</span>
)
