import { useEffect, useRef } from 'react'
import { spokenMove, type Move } from '../../cube/moves'
import { MoveLabel } from './MoveLabel'

/** The whole solution as tappable chips. Scrolls sideways on phones, wraps on wide screens. */
export function MoveStrip({
  moves,
  current,
  onJump,
  reducedMotion,
}: {
  moves: Move[]
  /** Index of the highlighted move, or -1 before the first. */
  current: number
  onJump: (index: number) => void
  reducedMotion: boolean
}) {
  const list = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const chip = list.current?.children[Math.max(0, current)]
    chip?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [current, reducedMotion])

  return (
    <ol
      ref={list}
      aria-label="Solution moves"
      className="flex gap-1.5 overflow-x-auto px-5 py-1 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {moves.map((move, index) => {
        const state = index === current ? 'current' : index < current ? 'done' : 'upcoming'
        return (
          <li key={index} className="shrink-0">
            <button
              type="button"
              onClick={() => onJump(index + 1)}
              aria-label={`Move ${index + 1}: ${spokenMove(move)}`}
              aria-current={state === 'current' ? 'step' : undefined}
              className={`h-10 min-w-11 rounded-[0.6rem] px-2 font-mono text-[0.95rem] font-medium transition-colors duration-150 ${
                state === 'current'
                  ? 'bg-iris text-on-iris'
                  : state === 'done'
                    ? 'text-graphite hover:bg-ink/5'
                    : 'bg-surface text-ink ring-1 ring-inset ring-hairline hover:ring-ink/40'
              }`}
            >
              <MoveLabel move={move} />
            </button>
          </li>
        )
      })}
    </ol>
  )
}
