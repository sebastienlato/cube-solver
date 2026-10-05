/**
 * Playback state machine for a solution. Pure, so stepping, jumping and autoplay can be
 * unit tested without a renderer. The 3D view animates `turn` and reports back with `turnEnd`.
 */
import { invertMove, parseMove, type Move } from '../cube/moves'

export const SPEEDS = [0.5, 1, 2] as const
export type Speed = (typeof SPEEDS)[number]

export interface Turn {
  /** The move the 3D view should animate. For a step back this is the inverse of the solution move. */
  move: Move
  forward: boolean
  id: number
}

export interface PlaybackState {
  moves: Move[]
  /** Number of solution moves already applied to the cube. */
  index: number
  playing: boolean
  turn: Turn | null
  speed: Speed
  /** How many times playback has arrived at the solved cube by turning, to trigger the celebration once each. */
  finishes: number
  nextTurnId: number
}

export type PlaybackAction =
  | { type: 'load'; moves: Move[] }
  | { type: 'toggle' }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'jump'; index: number }
  | { type: 'restart' }
  | { type: 'advance' }
  | { type: 'turnEnd'; id: number }
  | { type: 'speed'; speed: Speed }

export const initialPlayback = (moves: Move[] = [], speed: Speed = 1): PlaybackState => ({
  moves,
  index: 0,
  playing: false,
  turn: null,
  speed,
  finishes: 0,
  nextTurnId: 1,
})

/** Applies a turn that is still animating, so a new command always starts from a whole position. */
function settle(state: PlaybackState): PlaybackState {
  if (!state.turn) return state
  return { ...state, index: state.index + (state.turn.forward ? 1 : -1), turn: null }
}

function startTurn(state: PlaybackState, forward: boolean): PlaybackState {
  const move = forward ? state.moves[state.index] : invertMove(state.moves[state.index - 1])
  return { ...state, turn: { move, forward, id: state.nextTurnId }, nextTurnId: state.nextTurnId + 1 }
}

export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  const total = state.moves.length
  switch (action.type) {
    case 'load':
      return { ...initialPlayback(action.moves, state.speed), nextTurnId: state.nextTurnId }
    case 'speed':
      return { ...state, speed: action.speed }
    case 'jump': {
      const index = Math.max(0, Math.min(total, Math.round(action.index)))
      return { ...state, index, turn: null, playing: false }
    }
    case 'restart':
      return { ...state, index: 0, turn: null, playing: false }
    case 'next': {
      const settled = { ...settle(state), playing: false }
      return settled.index < total ? startTurn(settled, true) : settled
    }
    case 'previous': {
      const settled = { ...settle(state), playing: false }
      return settled.index > 0 ? startTurn(settled, false) : settled
    }
    case 'toggle': {
      if (state.playing) return { ...state, playing: false }
      if (total === 0) return state
      // Pressing play on a finished solution plays it again from the start.
      const from = settle(state).index === total ? { ...state, index: 0, turn: null } : state
      const playing = { ...from, playing: true }
      return playing.turn ? playing : startTurn(playing, true)
    }
    case 'advance':
      return state.playing && !state.turn && state.index < total ? startTurn(state, true) : state
    case 'turnEnd': {
      if (state.turn?.id !== action.id) return state
      const settled = settle(state)
      const finished = state.turn.forward && settled.index === total
      return {
        ...settled,
        playing: settled.playing && !finished,
        finishes: settled.finishes + (finished ? 1 : 0),
      }
    }
  }
}

/** Index of the move to show as current: the one being turned, else the last one made. -1 before the first. */
export function currentMoveIndex(state: PlaybackState): number {
  if (state.turn?.forward) return state.index
  return state.index - 1
}

const QUARTER_TURN_MS = 440
const HALF_TURN_MS = 620
const PAUSE_BETWEEN_MOVES_MS = 240

export const turnDuration = (move: Move, speed: Speed): number =>
  (parseMove(move).turns === 2 ? HALF_TURN_MS : QUARTER_TURN_MS) / speed

export const pauseBetweenMoves = (speed: Speed): number => PAUSE_BETWEEN_MOVES_MS / speed
