import { describe, expect, it } from 'vitest'
import { parseAlg } from '../cube/moves'
import {
  currentMoveIndex,
  initialPlayback,
  playbackReducer,
  turnDuration,
  type PlaybackAction,
  type PlaybackState,
} from './Playback'

const moves = parseAlg("R U2 F'")
const run = (state: PlaybackState, ...actions: PlaybackAction[]) => actions.reduce(playbackReducer, state)
const endTurn = (state: PlaybackState) => playbackReducer(state, { type: 'turnEnd', id: state.turn!.id })

describe('playback', () => {
  it('starts before the first move', () => {
    const state = initialPlayback(moves)
    expect(state.index).toBe(0)
    expect(currentMoveIndex(state)).toBe(-1)
  })

  it('steps forward one move at a time', () => {
    let state = run(initialPlayback(moves), { type: 'next' })
    expect(state.turn).toMatchObject({ move: 'R', forward: true })
    expect(currentMoveIndex(state)).toBe(0)
    state = endTurn(state)
    expect(state).toMatchObject({ index: 1, turn: null, playing: false })
    expect(currentMoveIndex(state)).toBe(0)
  })

  it('steps back by turning the inverse move', () => {
    let state = run(initialPlayback(moves), { type: 'jump', index: 3 }, { type: 'previous' })
    expect(state.turn).toMatchObject({ move: 'F', forward: false })
    state = endTurn(state)
    expect(state.index).toBe(2)
  })

  it('finishes a turn in flight before starting the next step', () => {
    const state = run(initialPlayback(moves), { type: 'next' }, { type: 'next' })
    expect(state.index).toBe(1)
    expect(state.turn?.move).toBe('U2')
  })

  it('does nothing when stepping past either end', () => {
    expect(run(initialPlayback(moves), { type: 'previous' }).turn).toBeNull()
    expect(run(initialPlayback(moves), { type: 'jump', index: 3 }, { type: 'next' }).turn).toBeNull()
  })

  it('plays through to the end and then stops', () => {
    let state = run(initialPlayback(moves), { type: 'toggle' })
    expect(state.playing).toBe(true)
    for (let i = 0; i < 3; i++) {
      state = endTurn(state)
      state = playbackReducer(state, { type: 'advance' })
    }
    expect(state).toMatchObject({ index: 3, playing: false, turn: null, finishes: 1 })
  })

  it('pauses without cutting the current turn short', () => {
    let state = run(initialPlayback(moves), { type: 'toggle' }, { type: 'toggle' })
    expect(state.playing).toBe(false)
    expect(state.turn?.move).toBe('R')
    state = playbackReducer(endTurn(state), { type: 'advance' })
    expect(state).toMatchObject({ index: 1, turn: null })
  })

  it('plays again from the start when play is pressed at the end', () => {
    const state = run(initialPlayback(moves), { type: 'jump', index: 3 }, { type: 'toggle' })
    expect(state).toMatchObject({ index: 0, playing: true })
    expect(state.turn?.move).toBe('R')
  })

  it('jumps to any position and clamps out-of-range targets', () => {
    expect(run(initialPlayback(moves), { type: 'jump', index: 2 }).index).toBe(2)
    expect(run(initialPlayback(moves), { type: 'jump', index: 99 }).index).toBe(3)
    expect(run(initialPlayback(moves), { type: 'jump', index: -4 }).index).toBe(0)
  })

  it('ignores the end of a turn that was cancelled by a jump', () => {
    const turning = run(initialPlayback(moves), { type: 'next' })
    const jumped = playbackReducer(turning, { type: 'jump', index: 2 })
    expect(playbackReducer(jumped, { type: 'turnEnd', id: turning.turn!.id }).index).toBe(2)
  })

  it('counts a finish only when the last move is turned, not when jumping', () => {
    expect(run(initialPlayback(moves), { type: 'jump', index: 3 }).finishes).toBe(0)
    const stepped = endTurn(run(initialPlayback(moves), { type: 'jump', index: 2 }, { type: 'next' }))
    expect(stepped.finishes).toBe(1)
  })

  it('keeps the speed across a restart and a new solution', () => {
    const state = run(initialPlayback(moves), { type: 'speed', speed: 2 }, { type: 'restart' })
    expect(state.speed).toBe(2)
    expect(playbackReducer(state, { type: 'load', moves: parseAlg('U') })).toMatchObject({ speed: 2, index: 0 })
  })

  it('does not play an empty solution', () => {
    expect(run(initialPlayback([]), { type: 'toggle' }).playing).toBe(false)
  })

  it('scales turn time with speed and gives half turns longer', () => {
    expect(turnDuration('R', 2)).toBe(turnDuration('R', 1) / 2)
    expect(turnDuration('R2', 1)).toBeGreaterThan(turnDuration('R', 1))
  })
})
