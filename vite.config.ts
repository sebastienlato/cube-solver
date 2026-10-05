/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * cubejs wraps its files in `(function () { … }).call(this)` and reads `this.Cube`. In an ES
 * module `this` is undefined, so the bundled worker crashed on load. Giving the wrapper an
 * empty object as `this` sends it down its CommonJS path (`require('./cube')`), which works.
 */
function cubejsModuleScope(): Plugin {
  return {
    name: 'cubejs-module-scope',
    transform(code, id) {
      if (!/[\\/]cubejs[\\/]lib[\\/](cube|solve)\.js$/.test(id.split('?')[0])) return null
      const last = code.lastIndexOf('.call(this)')
      if (last < 0) return null
      return { code: `${code.slice(0, last)}.call({})${code.slice(last + '.call(this)'.length)}`, map: null }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cubejsModuleScope()],
  // Workers are bundled by their own pipeline, and so are pre-bundled dependencies in dev.
  worker: { format: 'es', plugins: () => [cubejsModuleScope()] },
  optimizeDeps: { rolldownOptions: { plugins: [cubejsModuleScope()] } },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
  },
})
