/**
 * Minimum-cost assignment (Hungarian algorithm, O(n³)) for a square cost matrix.
 * Returns, for each row, the column it is assigned to.
 */
export function assign(cost: number[][]): number[] {
  const n = cost.length
  // Potentials and matching are 1-indexed; index 0 is a sentinel, as in the classic formulation.
  const rowPotential = new Array<number>(n + 1).fill(0)
  const columnPotential = new Array<number>(n + 1).fill(0)
  const rowOfColumn = new Array<number>(n + 1).fill(0)
  const previousColumn = new Array<number>(n + 1).fill(0)

  for (let row = 1; row <= n; row++) {
    rowOfColumn[0] = row
    let column = 0
    const slack = new Array<number>(n + 1).fill(Infinity)
    const used = new Array<boolean>(n + 1).fill(false)
    do {
      used[column] = true
      const currentRow = rowOfColumn[column]
      let delta = Infinity
      let nextColumn = 0
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue
        const reduced = cost[currentRow - 1][j - 1] - rowPotential[currentRow] - columnPotential[j]
        if (reduced < slack[j]) {
          slack[j] = reduced
          previousColumn[j] = column
        }
        if (slack[j] < delta) {
          delta = slack[j]
          nextColumn = j
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          rowPotential[rowOfColumn[j]] += delta
          columnPotential[j] -= delta
        } else {
          slack[j] -= delta
        }
      }
      column = nextColumn
    } while (rowOfColumn[column] !== 0)
    do {
      const previous = previousColumn[column]
      rowOfColumn[column] = rowOfColumn[previous]
      column = previous
    } while (column !== 0)
  }

  const columnOfRow = new Array<number>(n).fill(-1)
  for (let j = 1; j <= n; j++) columnOfRow[rowOfColumn[j] - 1] = j - 1
  return columnOfRow
}
