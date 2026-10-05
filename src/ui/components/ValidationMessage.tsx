import type { ValidationResult } from '../../cube/validate'
import { Icon } from './Icon'

/**
 * The validator's verdict, updated live. When it can point at stickers, the whole message
 * is a button that marks them on the net.
 */
export function ValidationMessage({
  result,
  showing,
  onToggleCulprits,
}: {
  result: ValidationResult
  /** Whether the culprits are currently marked. */
  showing: boolean
  onToggleCulprits: () => void
}) {
  const [first, ...rest] = result.issues
  const culprits = first?.facelets.length ?? 0
  const more = rest.length > 0 && (
    <span className="text-graphite">
      {rest.length} more {rest.length === 1 ? 'problem' : 'problems'} after this one.
    </span>
  )

  return (
    <div role="status" aria-live="polite" className="flex min-h-[4.25rem] items-start gap-3 text-[0.95rem] leading-snug">
      <span
        className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${result.valid ? 'bg-ink text-on-ink' : 'text-ink'}`}
      >
        <Icon name={result.valid ? 'check' : 'alert'} size={result.valid ? 16 : 24} />
      </span>
      {result.valid ? (
        <p>
          <span className="font-semibold">This is a real cube position.</span>{' '}
          <span className="text-graphite">Ready to solve.</span>
        </p>
      ) : culprits > 0 ? (
        <button type="button" onClick={onToggleCulprits} aria-pressed={showing} className="rounded-md text-left">
          {first.message}
          <span className="mt-1 flex flex-wrap gap-x-3 text-sm">
            <span className="font-medium text-iris underline decoration-iris/40 underline-offset-4">
              {showing ? 'Hide' : 'Show'} {culprits === 1 ? 'the sticker' : `the ${culprits} stickers`} to check
            </span>
            {more}
          </span>
        </button>
      ) : (
        <div>
          <p>{first.message}</p>
          {more && <p className="mt-1 text-sm">{more}</p>}
        </div>
      )}
    </div>
  )
}
