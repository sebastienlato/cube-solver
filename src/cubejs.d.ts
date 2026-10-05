declare module 'cubejs' {
  /** Only the parts of cubejs this app uses; checked against node_modules/cubejs/lib. */
  export default class Cube {
    static initSolver(): void
    static fromString(facelets: string): Cube
    static random(): Cube
    asString(): string
    move(algorithm: string): this
    solve(maxDepth?: number): string
  }
}
