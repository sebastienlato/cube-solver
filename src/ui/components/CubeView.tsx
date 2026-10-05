import { Component, Suspense, lazy, useEffect, type ReactNode } from 'react'
import type { Cube3DProps } from '../../three/Cube3D'
import { nameScheme } from '../../vision/naming'
import { CubeNet } from './CubeNet'

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
  return (
    <RenderBoundary fallback={<FlatCube {...props} />}>
      <Suspense fallback={<div className={props.className} />}>
        <Cube3D {...props} />
      </Suspense>
    </RenderBoundary>
  )
}
