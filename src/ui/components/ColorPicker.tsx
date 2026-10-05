import { FACES, type Face } from '../../cube/facelets'
import type { ColorScheme } from '../../cube/scheme'

/** The six center colors as large, named swatches. Picks by face, since a color means "matches that center". */
export function ColorPicker({
  colors,
  names,
  current,
  onPick,
  label,
}: {
  colors: ColorScheme
  names: Record<Face, string>
  current: Face
  onPick: (face: Face) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-6 gap-1.5">
      {FACES.map((face, i) => (
        <button
          key={face}
          type="button"
          role="radio"
          aria-checked={face === current}
          aria-keyshortcuts={String(i + 1)}
          data-pick={face}
          onClick={() => onPick(face)}
          className="group flex flex-col items-center gap-1 rounded-control py-1.5 text-[0.7rem] font-medium capitalize text-graphite hover:text-ink aria-checked:text-ink"
        >
          <span
            className="block aspect-square w-full max-w-12 rounded-[22%] ring-1 ring-inset ring-black/15 transition-[transform,box-shadow] duration-150 group-hover:scale-105 group-aria-checked:shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--ink)]"
            style={{ backgroundColor: colors[face] }}
          />
          {names[face]}
        </button>
      ))}
    </div>
  )
}
