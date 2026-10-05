import type { Move } from '../../cube/moves'

/**
 * Move notation set for the eye: a true prime mark, pulled in against the letter because the
 * monospace face would otherwise give it a full cell of its own.
 */
export function MoveLabel({ move }: { move: Move }) {
  const suffix = move.slice(1)
  return (
    <>
      {move[0]}
      {suffix === "'" ? <span className="-ml-[0.28em]">′</span> : suffix}
    </>
  )
}
