import { Component, useEffect, useState, type ReactNode } from 'react'
import type { Cube3DProps } from '../../three/Cube3D'
import { nameScheme } from '../../vision/naming'
import { CubeNet } from './CubeNet'

type Cube3DComponent = (typeof import('../../three/Cube3D'))['default']

// three.js is the largest dependency by far; loading it on demand keeps Home's first paint fast.
// Loaded by hand rather than with React.lazy so the first render is the same empty box on the
// server and in the browser, which lets the prerendered Home hydrate cleanly.
let loaded: Cube3DComponent | null = null
let loading: Promise<Cube3DComponent> | null = null
const loadCube3D = () => (loading ??= import('../../three/Cube3D').then((module) => (loaded = module.default)))

class RenderBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/**
 * Shown when WebGL is unavailable: the same cube as a flat net. Turns complete at once, so
 * playback never stalls waiting for an animation that can't run.
 */
function FlatCube({ className, label, facelets, colors, turn, onTurnEnd }: Cube3DProps) {
  const turnId = turn?.id
  useEffect(() => {
    if (turnId !== undefined) onTurnEnd?.(turnId)
  }, [turnId, onTurnEnd])
  if (!label) return null
  return (
    <div className={`${className ?? ''} flex flex-col items-center justify-center gap-3 p-4`} data-facelets={facelets}>
      <CubeNet facelets={facelets} colors={colors} names={nameScheme(colors)} className="w-full max-w-[24rem]" />
      <p className="text-center text-sm text-graphite">
        This browser has 3D graphics turned off, so the cube is shown unfolded.
      </p>
    </div>
  )
}

export function CubeView(props: Cube3DProps) {
  const [Cube3D, setCube3D] = useState<Cube3DComponent | null>(() => loaded)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    if (Cube3D) return
    let cancelled = false
    loadCube3D().then(
      (component) => {
        if (!cancelled) setCube3D(() => component)
      },
      () => {
        if (!cancelled) setUnavailable(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [Cube3D])

  if (unavailable) return <FlatCube {...props} />
  if (!Cube3D) return <div className={props.className} />
  return (
    <RenderBoundary fallback={<FlatCube {...props} />}>
      <Cube3D {...props} />
    </RenderBoundary>
  )
}
