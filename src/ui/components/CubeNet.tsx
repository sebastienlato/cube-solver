import { useRef, type KeyboardEvent } from 'react'
import { NET_FACE_ORDER } from '../../cube/edit'
import { FACE_WORD, faceIndex, isCenter, type Face } from '../../cube/facelets'
import type { ColorScheme } from '../../cube/scheme'

/** Where each face sits on the unfolded cross, in face-sized grid cells. */
const FACE_CELL: Record<Face, { column: number; row: number }> = {
  U: { column: 1, row: 0 },
  L: { column: 0, row: 1 },
  F: { column: 1, row: 1 },
  R: { column: 2, row: 1 },
  B: { column: 3, row: 1 },
  D: { column: 1, row: 2 },
}

/** Sticker position on the whole net, for arrow-key movement between faces. */
const netPosition = (index: number) => {
  const cell = FACE_CELL[NET_FACE_ORDER.find((face) => faceIndex(face) === Math.floor(index / 9)) as Face]
  const k = index % 9
  return { x: cell.column * 3 + (k % 3), y: cell.row * 3 + Math.floor(k / 3) }
}

const INDEX_AT = new Map(
  Array.from({ length: 54 }, (_, index) => {
    const { x, y } = netPosition(index)
    return [`${x},${y}`, index] as const
  }),
)

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

export interface CubeNetProps {
  facelets: string
  colors: ColorScheme
  /** Color name per face, read out with each sticker. */
  names: Record<Face, string>
  selected?: number | null
  /** Stickers the classifier was unsure about: marked with a thin ring. */
  lowConfidence?: readonly number[]
  /** Stickers the validator points at: marked with a heavy ring. */
  flagged?: readonly number[]
  centersEditable?: boolean
  onSelect?: (index: number) => void
  className?: string
}

/**
 * The cube unfolded into a cross. Each sticker is a button that announces its place and
 * color name, so color is never the only way to read it.
 */
export function CubeNet({
  facelets,
  colors,
  names,
  selected = null,
  lowConfidence = [],
  flagged = [],
  centersEditable = false,
  onSelect,
  className = '',
}: CubeNetProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  // One sticker is in the tab order; arrow keys move between the rest.
  const tabStop = selected ?? faceIndex('U') * 9

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = ARROWS[event.key]
    if (!step) return
    const { x, y } = netPosition(index)
    const target = INDEX_AT.get(`${x + step[0]},${y + step[1]}`)
    if (target === undefined) return
    event.preventDefault()
    buttons.current[target]?.focus()
  }

  return (
    <div className={`grid grid-cols-4 gap-[1.6%] ${className}`} role="group" aria-label="Cube colors, unfolded">
      {NET_FACE_ORDER.map((face) => (
        <div
          key={face}
          className="grid aspect-square grid-cols-3 gap-[5%]"
          style={{ gridColumnStart: FACE_CELL[face].column + 1, gridRowStart: FACE_CELL[face].row + 1 }}
        >
          {Array.from({ length: 9 }, (_, k) => {
            const index = faceIndex(face) * 9 + k
            const letter = facelets[index] as Face
            const center = isCenter(index)
            const locked = center && !centersEditable
            const isSelected = index === selected
            const isFlagged = flagged.includes(index)
            const isLow = lowConfidence.includes(index)
            const label = [
              `${FACE_WORD[face]} face, row ${Math.floor(k / 3) + 1}, column ${(k % 3) + 1}`,
              `${names[letter]}${center ? ' center' : ''}`,
              isFlagged ? 'check this sticker' : isLow ? 'the camera was unsure' : '',
            ]
              .filter(Boolean)
              .join(', ')
            return (
              <button
                key={index}
                type="button"
                ref={(button) => {
                  buttons.current[index] = button
                }}
                data-facelet={index}
                data-color={letter}
                aria-label={label}
                aria-pressed={onSelect ? isSelected : undefined}
                aria-disabled={locked || !onSelect || undefined}
                tabIndex={index === tabStop ? 0 : -1}
                onClick={() => {
                  if (!locked) onSelect?.(index)
                }}
                onKeyDown={(event) => onKeyDown(event, index)}
                className={`relative grid aspect-square place-items-center rounded-[22%] font-mono text-[0.62rem] font-semibold leading-none ring-1 ring-inset ring-black/15 transition-[transform,box-shadow] duration-150 ${
                  locked || !onSelect ? 'cursor-default' : 'hover:scale-[1.06]'
                } ${isSelected ? 'z-10 scale-[1.14] shadow-[0_0_0_2px_var(--backdrop),0_0_0_4.5px_var(--ink)]' : ''} ${
                  !isSelected && isFlagged
                    ? 'z-[5] scale-[1.1] shadow-[0_0_0_2px_var(--backdrop),0_0_0_5px_var(--iris)]'
                    : ''
                } ${!isSelected && !isFlagged && isLow ? 'shadow-[0_0_0_1.5px_var(--backdrop),0_0_0_3px_var(--iris)]' : ''}`}
                style={{ backgroundColor: colors[letter] }}
              >
                {center && (
                  // The face letter used in the solution, so the notation is familiar by the time it appears.
                  <span aria-hidden="true" className="text-black/55 mix-blend-multiply">
                    {face}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
