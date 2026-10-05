import type { Move } from '../cube/moves'
import type { SolverRequest, SolverResponse } from './protocol'

interface Pending {
  resolve: (moves: Move[]) => void
  reject: (error: Error) => void
}

/** Owns the solver worker: warms it up early and matches each answer to its request. */
class SolverClient {
  private worker: Worker | null = null
  private ready = false
  private nextId = 1
  private pending = new Map<number, Pending>()
  private listeners = new Set<() => void>()

  /** Starts the worker and builds the solver tables. Safe to call more than once. */
  warmUp(): void {
    if (this.worker) return
    this.worker = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = ({ data }: MessageEvent<SolverResponse>) => this.receive(data)
    this.worker.onerror = (event) => {
      const error = new Error(event.message || 'The solver stopped unexpectedly.')
      for (const { reject } of this.pending.values()) reject(error)
      this.pending.clear()
    }
    this.send({ type: 'init' })
  }

  isReady = (): boolean => this.ready

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  solve(facelets: string): Promise<Move[]> {
    this.warmUp()
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.send({ type: 'solve', id, facelets })
    })
  }

  private send(message: SolverRequest): void {
    this.worker?.postMessage(message)
  }

  private receive(message: SolverResponse): void {
    if (message.type === 'ready') {
      this.ready = true
      for (const listener of this.listeners) listener()
      return
    }
    const request = this.pending.get(message.id)
    if (!request) return
    this.pending.delete(message.id)
    if (message.type === 'solution') request.resolve(message.moves)
    else request.reject(new Error(message.message))
  }
}

export const solverClient = new SolverClient()
