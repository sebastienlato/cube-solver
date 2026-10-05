import { useState } from 'react'
import { SOLVED } from '../../cube/facelets'
import { DEFAULT_SCHEME } from '../../cube/scheme'
import { useReducedMotion } from '../hooks'
import { CORNER_POSE, FACE_ON_POSE, OPPOSITE_CORNER_POSE } from '../poses'
import { CubeView } from './CubeView'

/**
 * A small 3D cube showing how to hold the real one for each photo. It plays once when it
 * appears, and again when tapped; nothing loops on its own.
 */
export function HoldIllustration({ photo, className = '' }: { photo: 1 | 2; className?: string }) {
  const reducedMotion = useReducedMotion()
  const [replay, setReplay] = useState(0)

  return (
    <button
      type="button"
      onClick={() => setReplay((count) => count + 1)}
      aria-label={
        photo === 1
          ? 'How to hold the cube for photo 1: turned so one corner points at you. Press to play again.'
          : 'How to hold the cube for photo 2: flipped over to show the opposite corner. Press to play again.'
      }
      className={`relative block rounded-2xl ${className}`}
    >
      <CubeView
        className="pointer-events-none absolute inset-0"
        label=""
        facelets={SOLVED}
        colors={DEFAULT_SCHEME}
        view="corner"
        shadow={false}
        pose={photo === 1 ? CORNER_POSE : OPPOSITE_CORNER_POSE}
        poseFrom={photo === 1 ? FACE_ON_POSE : CORNER_POSE}
        poseReplayKey={replay}
        reducedMotion={reducedMotion}
      />
    </button>
  )
}
