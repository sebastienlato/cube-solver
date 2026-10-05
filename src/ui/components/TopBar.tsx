import type { ReactNode } from 'react'
import { Icon } from './Icon'

/** Slim header: where you are, how to go back, and at most one extra control. */
export function TopBar({
  onBack,
  backLabel = 'Back',
  children,
  action,
  className = '',
}: {
  onBack?: () => void
  backLabel?: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <header className={`grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 lg:px-6 ${className}`}>
      <div className="flex justify-start">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 inline-flex h-11 items-center gap-0.5 rounded-control pl-1 pr-3 text-[0.95rem] font-medium hover:bg-ink/5"
          >
            <Icon name="back" size={22} />
            {backLabel}
          </button>
        )}
      </div>
      <div className="min-w-0">{children}</div>
      <div className="flex justify-end">{action}</div>
    </header>
  )
}
