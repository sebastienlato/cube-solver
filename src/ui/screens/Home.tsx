import { useMemo } from 'react'
import { SOLVED } from '../../cube/facelets'
import { DEFAULT_SCHEME } from '../../cube/scheme'
import { applyMoves, mulberry32, randomScramble } from '../../cube/state'
import { Button } from '../components/Button'
import { CubeView } from '../components/CubeView'
import { useReducedMotion } from '../hooks'
import { navigate } from '../router'
import { setState } from '../store'

const STEPS = [
  { title: 'Take two photos', body: 'One of each opposite corner, so the camera sees all six faces.' },
  { title: 'Check the colors', body: 'Tap any sticker the camera got wrong.' },
  { title: 'Follow the moves', body: 'A 3D cube shows each turn, one at a time.' },
]

// A fixed scramble, so the hero looks the same on every visit and in every screenshot.
const HERO_CUBE = applyMoves(SOLVED, randomScramble(22, mulberry32(20)))

export function HomeScreen() {
  const reducedMotion = useReducedMotion()
  const delay = useMemo(() => (ms: number) => ({ animationDelay: `${ms}ms` }), [])

  const tryScramble = () => {
    setState({ solve: { facelets: applyMoves(SOLVED, randomScramble(24)), colors: DEFAULT_SCHEME, from: 'home' } })
    navigate({ name: 'solve' })
  }

  return (
    <div className="mx-auto flex w-full max-w-[76rem] flex-1 flex-col px-5 lg:px-10">
      <header className="flex h-14 items-center lg:h-20">
        <p className="text-[0.95rem] font-semibold tracking-tight">Cube Solver</p>
      </header>

      <main className="flex flex-1 flex-col lg:grid lg:grid-cols-2 lg:items-center lg:gap-x-10 lg:pb-16">
        <div className="relative mx-auto aspect-square w-full max-w-[min(100%,46dvh)] lg:order-2 lg:max-w-none">
          <CubeView
            className="absolute inset-0 [&_canvas]:!touch-pan-y"
            label="A scrambled cube, slowly turning. Drag to spin it."
            facelets={HERO_CUBE}
            colors={DEFAULT_SCHEME}
            view="hero"
            orbit="horizontal"
            idleSpin
            settleIn
            reducedMotion={reducedMotion}
          />
        </div>

        <div className="lg:order-1">
          <h1
            className="rise text-balance text-[2.35rem] font-semibold leading-[1.04] tracking-[-0.03em] lg:text-[3.9rem]"
            style={delay(80)}
          >
            Solve your cube from two photos
          </h1>
          <p
            className="rise mt-4 max-w-[30rem] text-[1.05rem] leading-relaxed text-graphite lg:mt-6 lg:text-xl"
            style={delay(160)}
          >
            Photograph two opposite corners, check the colors, then follow each turn on a 3D cube.
          </p>

          <div className="rise mt-7 flex flex-col gap-2 lg:mt-10 lg:max-w-[22rem]" style={delay(240)}>
            <Button
              onClick={() => navigate({ name: 'scan', photo: 1, stage: 'capture' })}
              className="min-h-14 text-[1.05rem]"
            >
              Scan my cube
            </Button>
            <div className="flex flex-wrap justify-center gap-x-1 lg:justify-start">
              <Button variant="quiet" onClick={() => navigate({ name: 'manual' })} className="text-[0.95rem]">
                Enter colors manually
              </Button>
              <Button variant="quiet" onClick={tryScramble} className="text-[0.95rem]">
                Try a random scramble
              </Button>
            </div>
          </div>
        </div>

        <section
          aria-labelledby="how-it-works"
          className="rise mt-12 pb-10 lg:order-3 lg:col-span-2 lg:mt-6 lg:pb-0"
          style={delay(320)}
        >
          <h2 id="how-it-works" className="text-sm font-medium text-graphite">
            How it works
          </h2>
          <ol className="mt-3 grid border-t border-hairline lg:grid-cols-3 lg:gap-10 lg:border-t-0">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="flex gap-4 border-b border-hairline py-4 lg:border-b-0 lg:border-t lg:py-5"
              >
                <span aria-hidden="true" className="w-5 shrink-0 pt-0.5 font-mono text-sm text-graphite">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold">{step.title}</p>
                  <p className="mt-0.5 text-[0.95rem] text-graphite">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-sm text-graphite">Photos are processed on your device and never uploaded.</p>
        </section>
      </main>
    </div>
  )
}
