const STEPS = ['Photo 1', 'Photo 2', 'Review', 'Solve'] as const

export type FlowStep = (typeof STEPS)[number]

/** Progress through the scan flow: four short bars and the name of the current step. */
export function StepIndicator({ current }: { current: FlowStep }) {
  const at = STEPS.indexOf(current)
  return (
    <ol aria-label="Progress" className="flex items-center justify-center gap-1.5">
      {STEPS.map((step, i) => (
        <li key={step} aria-current={i === at ? 'step' : undefined} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`block h-1 rounded-full transition-[width,background-color] duration-300 ${
              i === at ? 'w-5 bg-iris' : i < at ? 'w-2.5 bg-ink' : 'w-2.5 bg-hairline'
            }`}
          />
          <span className={i === at ? 'text-[0.9rem] font-semibold' : 'sr-only lg:not-sr-only lg:text-sm lg:text-graphite'}>
            {step}
            {i < at && <span className="sr-only"> (done)</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}
