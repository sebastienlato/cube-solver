import { useEffect, useMemo, useState } from 'react'
import { applyColor, nextSticker, type EditableCube } from '../../cube/edit'
import { FACES, SOLVED, isCenter, type Face } from '../../cube/facelets'
import { DEFAULT_SCHEME } from '../../cube/scheme'
import { validate } from '../../cube/validate'
import { nameScheme } from '../../vision/naming'
import { Button } from '../components/Button'
import { ColorPicker } from '../components/ColorPicker'
import { CubeNet } from '../components/CubeNet'
import { CubeView } from '../components/CubeView'
import { StepIndicator } from '../components/StepIndicator'
import { TopBar } from '../components/TopBar'
import { ValidationMessage } from '../components/ValidationMessage'
import { useReducedMotion, useWideLayout } from '../hooks'
import { navigate } from '../router'
import { getState, setState, useAppState } from '../store'

type Mode = 'review' | 'manual'

/** Review (after a scan) and manual entry share one editor; only the starting cube and the center rule differ. */
export function EditorScreen({ mode }: { mode: Mode }) {
  const scan = useAppState((state) => state.scan)
  const manual = useAppState((state) => state.manual)
  const cube = mode === 'review' ? scan : manual

  useEffect(() => {
    // Review only exists after a scan; photos aren't kept across a refresh, so start again.
    if (!cube) navigate({ name: 'scan', photo: 1, stage: 'capture' }, { replace: true })
  }, [cube])

  if (!cube) return null
  return <Editor mode={mode} cube={cube} lowConfidence={mode === 'review' ? (scan?.lowConfidence ?? []) : []} />
}

function Editor({ mode, cube, lowConfidence }: { mode: Mode; cube: EditableCube; lowConfidence: number[] }) {
  const wide = useWideLayout()
  const reducedMotion = useReducedMotion()
  const [selected, setSelected] = useState<number | null>(null)
  const [showCulprits, setShowCulprits] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const names = useMemo(() => nameScheme(cube.colors), [cube.colors])
  const result = useMemo(() => validate(cube.facelets, names), [cube.facelets, names])
  const untouched = mode === 'manual' && cube.facelets === SOLVED && cube.colors === DEFAULT_SCHEME

  const save = (next: EditableCube, confirmed?: number) => {
    if (mode === 'manual') {
      setState({ manual: next })
      return
    }
    const scan = getState().scan
    if (!scan) return
    // A sticker the user has looked at and set no longer needs its "unsure" ring.
    setState({ scan: { ...scan, ...next, lowConfidence: scan.lowConfidence.filter((i) => i !== confirmed) } })
  }

  const pick = (face: Face) => {
    if (selected === null) return
    save(applyColor(cube, selected, face), selected)
    // Filling in a whole cube is quicker when the next sticker is selected for you.
    setSelected(mode === 'manual' && !isCenter(selected) ? nextSticker(selected) : null)
  }

  useEffect(() => {
    if (selected === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null)
      const number = Number(event.key)
      if (number >= 1 && number <= 6 && !event.metaKey && !event.ctrlKey && !event.altKey) pick(FACES[number - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const solve = () => {
    setState({ solve: { facelets: cube.facelets, colors: cube.colors, from: mode } })
    navigate({ name: 'solve' })
  }

  const goBack = () => navigate(mode === 'review' ? { name: 'scan', photo: 2, stage: 'adjust' } : { name: 'home' })

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[84rem] flex-col">
      <TopBar onBack={goBack}>
        {mode === 'review' ? (
          <StepIndicator current="Review" />
        ) : (
          <p className="text-center text-[0.95rem] font-semibold">Manual entry</p>
        )}
      </TopBar>

      <main className="flex flex-1 flex-col px-5 pb-52 lg:grid lg:grid-cols-[minmax(0,33rem)_minmax(0,1fr)] lg:grid-rows-[auto_auto_1fr] lg:gap-x-14 lg:px-10 lg:pb-10">
        <div className="pt-1 lg:pt-8">
          <h1 className="text-2xl font-semibold tracking-tight lg:text-4xl">
            {mode === 'review' ? 'Check the colors' : 'Enter your cube’s colors'}
          </h1>
          <p className="mt-1.5 text-[0.95rem] leading-snug text-graphite lg:mt-3 lg:text-lg">
            {mode === 'review'
              ? `Tap any sticker that doesn’t match your cube.${lowConfidence.length > 0 ? ' Rings mark the ones the camera was least sure of.' : ''}`
              : 'Hold the cube with one face toward you. Set the six centers to match it, then fill in each face.'}
          </p>
        </div>

        <div className="mt-5 lg:mt-8">
          <CubeNet
            facelets={cube.facelets}
            colors={cube.colors}
            names={names}
            selected={selected}
            lowConfidence={lowConfidence}
            flagged={showCulprits ? (result.issues[0]?.facelets ?? []) : []}
            centersEditable={mode === 'manual'}
            onSelect={(index) => setSelected((current) => (current === index ? null : index))}
          />
          <p className="mt-3 text-xs text-graphite lg:text-sm">
            <span className="font-mono">U</span> top · <span className="font-mono">L</span> left ·{' '}
            <span className="font-mono">F</span> front · <span className="font-mono">R</span> right ·{' '}
            <span className="font-mono">B</span> back · <span className="font-mono">D</span> bottom
          </p>
        </div>

        <div className="relative mx-auto mt-1 h-[clamp(9rem,calc(100dvh-41rem),16rem)] w-full max-w-[22rem] lg:sticky lg:top-6 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:mt-6 lg:h-[calc(100dvh-6.5rem)] lg:max-w-none">
          <CubeView
            className="absolute inset-0 [&_canvas]:!touch-pan-y"
            label="3D view of the cube as entered. Drag to turn it."
            facelets={cube.facelets}
            colors={cube.colors}
            view="hero"
            orbit={wide ? true : 'horizontal'}
            reducedMotion={reducedMotion}
          />
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-backdrop/95 px-5 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:static lg:col-start-1 lg:row-start-3 lg:mt-8 lg:self-start lg:border-t-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          {selected !== null ? (
            <div className="appear">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-medium">
                  {isCenter(selected) ? 'Center color' : 'Sticker color'}
                  <span className="ml-2 font-normal text-graphite">or press 1–6</span>
                </p>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="-mr-2 h-9 rounded-control px-2 text-sm font-medium underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
                >
                  Done
                </button>
              </div>
              <ColorPicker
                colors={cube.colors}
                names={names}
                current={cube.facelets[selected] as Face}
                onPick={pick}
                label={isCenter(selected) ? 'Color of this center' : 'Color of this sticker'}
              />
            </div>
          ) : (
            <>
              <ValidationMessage
                result={result}
                showing={showCulprits}
                onToggleCulprits={() => setShowCulprits((showing) => !showing)}
              />
              <div className="mt-2 flex items-center gap-2">
                <Button
                  onClick={solve}
                  disabled={!result.valid}
                  className="min-h-14 flex-1 text-[1.05rem] lg:max-w-[16rem]"
                >
                  Solve
                </Button>
                {mode === 'manual' &&
                  !untouched &&
                  (confirmClear ? (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setState({ manual: { facelets: SOLVED, colors: DEFAULT_SCHEME } })
                          setConfirmClear(false)
                        }}
                      >
                        Clear all
                      </Button>
                      <Button variant="quiet" onClick={() => setConfirmClear(false)}>
                        Keep
                      </Button>
                    </>
                  ) : (
                    <Button variant="quiet" onClick={() => setConfirmClear(true)}>
                      Start over
                    </Button>
                  ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
