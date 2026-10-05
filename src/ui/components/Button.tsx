import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'quiet'

const BASE =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-5 text-base font-medium transition-[background-color,opacity,transform] duration-150 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-ink text-on-ink hover:opacity-90',
  secondary: 'border border-ink/25 text-ink hover:bg-ink/5',
  quiet: 'px-3 text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink',
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={`${BASE} ${VARIANT[variant]} ${className}`} {...props} />
}
