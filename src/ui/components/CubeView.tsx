import { Component, Suspense, lazy, useEffect, type ReactNode } from 'react'
import type { Cube3DProps } from '../../three/Cube3D'

// three.js is the largest dependency by far; loading it on demand keeps Home's first paint fast.
const Cube3D = lazy(() => import('../../three/Cube3D'))

class RenderBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/** Shown when WebGL is unavailable. Turns still complete, so playback never stalls. */
function NoWebGL({ className, label, turn, onTurnEnd }: Cube3DProps) {
  const turnId = turn?.id
  useEffect(() => {
    if (turnId !== undefined) onTurnEnd?.(turnId)
  }, [turnId, onTurnEnd])
  return (
    <div className={`${className ?? ''} grid place-items-center p-6 text-center text-sm text-graphite`} role="img" aria-label={label}>
      <p>The 3D view needs WebGL, which this browser has turned off. The steps still work.</p>
    </div>
  )
}

export function CubeView(props: Cube3DProps) {
  return (
    <RenderBoundary fallback={<NoWebGL {...props} />}>
      <Suspense fallback={<div className={props.className} />}>
        <Cube3D {...props} />
      </Suspense>
    </RenderBoundary>
  )
}
