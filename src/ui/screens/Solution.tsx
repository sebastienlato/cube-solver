import { useEffect, useMemo, useReducer, useState, useSyncExternalStore } from 'react'
import { describeMove, spokenMove } from '../../cube/moves'
import { statesAlong } from '../../cube/state'
import { solverClient } from '../../solver/solverClient'
import {
  currentMoveIndex,
  initialPlayback,
  pauseBetweenMoves,
  playbackReducer,
  turnDuration,
  type Speed,
} from '../../three/Playback'
import { nameScheme } from '../../vision/naming'
import { Button } from '../components/Button'
import { CubeView } from '../components/CubeView'
import { Icon } from '../components/Icon'
import { MoveLabel } from '../components/MoveLabel'
import { MoveStrip } from '../components/MoveStrip'
import { PlaybackControls } from '../components/PlaybackControls'
import { TopBar } from '../components/TopBar'
import { useReducedMotion } from '../hooks'
import { clearAllPhotos } from '../photos'
import { navigate } from '../router'
import { getState, setState, useAppState, type SolveData } from '../store'

type Status = 'solving' | 'ready' | 'failed'

const BACK_ROUTE = { home: 'home', review: 'review', manual: 'manual' } as const

export function SolutionScreen() {
  const data = useAppState((state) => state.solve)

  useEffect(() => {
    if (!data) navigate({ name: 'home' }, { replace: true })
  }, [data])

  return data ? <Solution key={data.facelets} data={data} /> : null
}

function Solution({ data }: { data: SolveData }) {
  const reducedMotion = useReducedMotion()
  const solverReady = useSyncExternalStore(solverClient.subscribe, solverClient.isReady)
  const [status, setStatus] = useState<Status>('solving')
  const [playback, dispatch] = useReducer(playbackReducer, undefined, () => initialPlayback([], getState().speed))
  const [resetViewKey, setResetViewKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    solverClient.solve(data.facelets).then(
      (moves) => {
        if (cancelled) return
        dispatch({ type: 'load', moves })
        setStatus('ready')
      },
      () => {
        if (!cancelled) setStatus('failed')
      },
    )
    return () => {
      cancelled = true
    }
  }, [data.facelets])

  const { moves, index, turn, playing, speed } = playback
  const states = useMemo(() => statesAlong(data.facelets, moves), [data.facelets, moves])
  const names = useMemo(() => nameScheme(data.colors), [data.colors])

  // Autoplay: after each turn lands, wait a beat, then start the next.
  useEffect(() => {
    if (!playing || turn) return
    const timer = setTimeout(() => dispatch({ type: 'advance' }), pauseBetweenMoves(speed))
    return () => clearTimeout(timer)
  }, [playing, turn, index, speed])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      // Space on a focused button already activates it; don't also toggle playback.
      const onControl = target?.closest('button, a, input, select, textarea') != null
      if (event.key === ' ' && !onControl) {
        event.preventDefault()
        dispatch({ type: 'toggle' })
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        dispatch({ type: 'next' })
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        dispatch({ type: 'previous' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const setSpeed = (next: Speed) => {
    dispatch({ type: 'speed', speed: next })
    setState({ speed: next })
  }

  const total = moves.length
  const current = currentMoveIndex(playback)
  const solved = status === 'ready' && total > 0 && index === total && !turn
  const alreadySolved = status === 'ready' && total === 0
  const scanAnother = () => {
    clearAllPhotos()
    navigate({ name: 'scan', photo: 1, stage: 'capture' })
  }

  const hold = (
    <>
      <strong className="font-semibold text-ink">{names.U}</strong> on top,{' '}
      <strong className="font-semibold text-ink">{names.F}</strong> facing you
    </>
  )

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[90rem] flex-col tall:h-dvh tall:overflow-hidden">
      <TopBar onBack={() => navigate({ name: BACK_ROUTE[data.from] })}>
        <h1 className="text-center text-[0.95rem] font-semibold">Solution</h1>
      </TopBar>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:items-stretch lg:gap-6 lg:px-8 lg:pb-8">
        <section aria-label="3D cube" className="relative min-h-[17rem] flex-1 tall:min-h-0 lg:flex-[1.25]">
          <CubeView
            className="absolute inset-0"
            label={`3D view of your cube${states[index] === states[states.length - 1] && status === 'ready' ? ', solved' : ''}`}
            facelets={states[index]}
            colors={data.colors}
            view="solve"
            orbit
            turn={turn}
            turnDuration={turn && !reducedMotion ? turnDuration(turn.move, speed) : 0}
            onTurnEnd={(id) => dispatch({ type: 'turnEnd', id })}
            celebrateKey={playback.finishes}
            resetViewKey={resetViewKey}
            reducedMotion={reducedMotion}
          />
          <p className="pointer-events-none absolute inset-x-0 top-0 px-5 text-center text-sm text-graphite lg:top-2 lg:text-base">
            {hold}
          </p>
          <button
            type="button"
            onClick={() => setResetViewKey((key) => key + 1)}
            className="absolute bottom-1 right-3 inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-graphite hover:bg-ink/5 hover:text-ink lg:bottom-2 lg:right-2"
          >
            <Icon name="view" size={18} />
            Reset view
          </button>
        </section>

        <section
          aria-label="Steps"
          className="flex shrink-0 flex-col gap-3 pb-[max(1rem,env(safe-area-inset-bottom))] lg:w-[27rem] lg:justify-center lg:gap-7 lg:pb-0"
        >
          <div aria-live="polite" className="min-h-[7.25rem] px-5 lg:min-h-[13rem] lg:px-0">
            {status === 'solving' && (
              <Readout
                title={solverReady ? 'Finding the shortest route' : 'Preparing solver'}
                body="This takes a few seconds the first time."
              />
            )}
            {status === 'failed' && (
              <Readout
                title="The solver stopped"
                body="Something went wrong while solving. Go back and press Solve again."
              />
            )}
            {alreadySolved && (
              <Readout
                title="Your cube is already solved"
                body="Nothing to turn. Scramble it and scan again whenever you like."
              >
                <Button onClick={scanAnother} className="mt-3 w-full lg:w-auto">
                  Scan another cube
                </Button>
              </Readout>
            )}
            {solved && (
              <Readout
                title={
                  <span className="inline-flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-full bg-iris text-on-iris">
                      <Icon name="check" size={18} />
                    </span>
                    Solved in {total} {total === 1 ? 'move' : 'moves'}
                  </span>
                }
                body="Your cube should now match the one on screen."
              >
                <Button onClick={scanAnother} className="mt-3 w-full lg:w-auto">
                  Scan another cube
                </Button>
              </Readout>
            )}
            {status === 'ready' && total > 0 && !solved && current < 0 && (
              <Readout
                title={`${total} ${total === 1 ? 'move' : 'moves'} to solve`}
                body={<>Hold the cube with {hold}. Then press play, or step through one move at a time.</>}
              />
            )}
            {status === 'ready' && !solved && current >= 0 && (
              <div className="grid grid-cols-[auto_1fr] items-center gap-x-5 lg:grid-cols-1 lg:gap-y-3">
                <p
                  className="min-w-[5.5rem] font-mono text-[3.5rem] font-semibold leading-none tracking-tight lg:text-[6rem]"
                  aria-label={spokenMove(moves[current])}
                >
                  <MoveLabel move={moves[current]} />
                </p>
                <div>
                  <p className="font-mono text-xs tracking-tight text-graphite">
                    Move {current + 1} of {total}
                  </p>
                  <p className="mt-1 text-[1.05rem] font-medium leading-snug lg:text-xl">
                    {describeMove(moves[current]).instruction}
                  </p>
                  <p className="mt-0.5 text-sm text-graphite lg:text-base">{describeMove(moves[current]).hint}</p>
                </div>
              </div>
            )}
          </div>

          {total > 0 && (
            <>
              <MoveStrip
                moves={moves}
                current={current}
                onJump={(target) => dispatch({ type: 'jump', index: target })}
                reducedMotion={reducedMotion}
              />
              <div className="px-5 lg:px-0">
                <PlaybackControls
                  playing={playing}
                  atStart={index === 0 && !turn}
                  atEnd={index === total && !turn}
                  speed={speed}
                  onToggle={() => dispatch({ type: 'toggle' })}
                  onPrevious={() => dispatch({ type: 'previous' })}
                  onNext={() => dispatch({ type: 'next' })}
                  onRestart={() => dispatch({ type: 'restart' })}
                  onSpeed={setSpeed}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function Readout({
  title,
  body,
  children,
}: {
  title: React.ReactNode
  body: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="appear">
      <p className="text-xl font-semibold leading-tight lg:text-3xl">{title}</p>
      <p className="mt-1.5 text-[0.95rem] leading-snug text-graphite lg:mt-3 lg:text-lg">{body}</p>
      {children}
    </div>
  )
}
