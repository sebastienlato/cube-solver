export type CameraProblem = 'insecure' | 'missing' | 'denied' | 'failed'

/** Why the live camera can't be used at all here, or null if it is worth trying. */
export function cameraUnsupported(): CameraProblem | null {
  if (!window.isSecureContext) return 'insecure'
  if (!navigator.mediaDevices?.getUserMedia) return 'missing'
  return null
}

export function cameraProblemFrom(error: unknown): CameraProblem {
  const name = typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'missing'
  return 'failed'
}
