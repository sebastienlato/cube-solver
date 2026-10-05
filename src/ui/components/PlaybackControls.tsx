import { SPEEDS, type Speed } from '../../three/Playback'
import { Icon, type IconName } from './Icon'

function RoundButton({
  icon,
  label,
  onClick,
  disabled,
  large = false,
}: {
  icon: IconName
  label: string
  onClick: () => void
  disabled?: boolean
  large?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid shrink-0 place-items-center rounded-full transition-[transform,opacity,background-color] duration-150 active:scale-95 disabled:opacity-30 disabled:active:scale-100 ${
        large ? 'size-16 bg-ink text-on-ink hover:opacity-90' : 'size-12 text-ink hover:bg-ink/8'
      }`}
    >
      <Icon name={icon} size={large ? 28 : 24} />
    </button>
  )
}

export function PlaybackControls({
  playing,
  atStart,
  atEnd,
  speed,
  onToggle,
  onPrevious,
  onNext,
  onRestart,
  onSpeed,
}: {
  playing: boolean
  atStart: boolean
  atEnd: boolean
  speed: Speed
  onToggle: () => void
  onPrevious: () => void
  onNext: () => void
  onRestart: () => void
  onSpeed: (speed: Speed) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <RoundButton icon="restart" label="Restart" onClick={onRestart} disabled={atStart} />
      <div className="flex items-center gap-2">
        <RoundButton icon="previous" label="Previous move" onClick={onPrevious} disabled={atStart} />
        <RoundButton icon={playing ? 'pause' : 'play'} label={playing ? 'Pause' : 'Play'} onClick={onToggle} large />
        <RoundButton icon="next" label="Next move" onClick={onNext} disabled={atEnd} />
      </div>
      <div role="radiogroup" aria-label="Playback speed" className="flex rounded-full bg-ink/6 p-0.5">
        {SPEEDS.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={option === speed}
            aria-label={`${option} times speed`}
            onClick={() => onSpeed(option)}
            className={`h-9 min-w-9 rounded-full px-1.5 font-mono text-[0.7rem] font-medium transition-colors duration-150 ${
              option === speed ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--hairline)]' : 'text-graphite hover:text-ink'
            }`}
          >
            {option}×
          </button>
        ))}
      </div>
    </div>
  )
}
