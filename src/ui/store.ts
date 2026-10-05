/**
 * App state that outlives a screen. Kept outside React so screens can come and go, and
 * mirrored to sessionStorage so a refresh mid-session loses nothing. Photos are never stored.
 */
import { useSyncExternalStore } from 'react'
import { FACES, SOLVED, isFaceletString } from '../cube/facelets'
import { DEFAULT_SCHEME, type ColorScheme } from '../cube/scheme'
import { SPEEDS, type Speed } from '../three/Playback'

export interface CubeData {
  facelets: string
  colors: ColorScheme
}

export interface ScanData extends CubeData {
  /** Stickers the classifier was least sure of. */
  lowConfidence: number[]
  /** Identifies the photos and handle positions this result came from. */
  inputKey: string
}

export interface SolveData extends CubeData {
  /** Where Solve was pressed, so Back returns there. */
  from: 'home' | 'review' | 'manual'
}

export interface AppState {
  manual: CubeData
  scan: ScanData | null
  solve: SolveData | null
  speed: Speed
}

const STORAGE_KEY = 'cube-solver:session:v1'

const initialState = (): AppState => ({
  manual: { facelets: SOLVED, colors: DEFAULT_SCHEME },
  scan: null,
  solve: null,
  speed: 1,
})

const isScheme = (value: unknown): value is ColorScheme =>
  typeof value === 'object' &&
  value !== null &&
  FACES.every((face) => /^#[0-9a-f]{6}$/i.test(String((value as Record<string, unknown>)[face])))

const isCubeData = (value: unknown): value is CubeData =>
  typeof value === 'object' &&
  value !== null &&
  isFaceletString((value as CubeData).facelets) &&
  isScheme((value as CubeData).colors)

/** Reads a saved session, dropping anything that doesn't look right rather than trusting it. */
function load(): AppState {
  const state = initialState()
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null')
    if (typeof saved !== 'object' || saved === null) return state
    const { manual, scan, solve, speed } = saved as Partial<AppState>
    if (isCubeData(manual)) state.manual = manual
    if (isCubeData(scan) && Array.isArray(scan.lowConfidence) && typeof scan.inputKey === 'string') state.scan = scan
    if (isCubeData(solve) && ['home', 'review', 'manual'].includes(solve.from)) state.solve = solve
    if (SPEEDS.includes(speed as Speed)) state.speed = speed as Speed
  } catch {
    // Storage can be unavailable (private mode) or hold junk; start fresh either way.
  }
  return state
}

let state = load()
const listeners = new Set<() => void>()

export function getState(): AppState {
  return state
}

export function setState(patch: Partial<AppState>): void {
  state = { ...state, ...patch }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Not being able to save only costs refresh survival.
  }
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Subscribes to one slice of the state. The selector must return a stored value, not a new object. */
export function useAppState<T>(selector: (state: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state))
}
