/// <reference types="vitest/config" />
import { createServer, defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

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

/**
 * Renders Home to static markup at build time and puts it inside #root, so the first paint
 * needs only the HTML and the stylesheet. The browser then hydrates it (see src/main.tsx).
 */
function prerenderHome(): Plugin {
  return {
    name: 'prerender-home',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      async handler(html, context) {
        // A throwaway Vite server gives us the app's modules compiled for Node.
        const server = await createServer({
          configFile: false,
          plugins: [react()],
          server: { middlewareMode: true, ws: false },
          appType: 'custom',
          logLevel: 'error',
          optimizeDeps: { noDiscovery: true },
        })
        try {
          const { renderHome } = (await server.ssrLoadModule('/src/entry-server.tsx')) as { renderHome: () => string }
          const marker = '<div id="root"></div>'
          if (!html.includes(marker)) throw new Error('index.html has no empty #root to prerender into')
          // The app itself starts after first paint (src/boot.ts); fetching it early keeps that from costing time.
          const app = Object.values(context.bundle ?? {}).find(
            (chunk) => chunk.type === 'chunk' && chunk.facadeModuleId?.endsWith('/src/main.tsx'),
          )
          const preload = app ? `<link rel="modulepreload" crossorigin href="./${app.fileName}">\n  ` : ''
          return html.replace('</head>', `${preload}</head>`).replace(marker, `<div id="root">${renderHome()}</div>`)
        } finally {
          await server.close()
        }
      },
    },
  }
}

export default defineConfig({
  // Relative asset paths, so the built site works from any folder on any static host.
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    cubejsModuleScope(),
    prerenderHome(),
    // Precaches the whole app (it is small) so it runs offline after the first visit.
    VitePWA({
      registerType: 'autoUpdate',
      // Deferred, so registering the service worker never holds up the first paint.
      injectRegister: 'script-defer',
      includeAssets: [],
      includeManifestIcons: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Take over on the first visit, so the app is already offline-capable when it ends.
        clientsClaim: true,
        skipWaiting: true,
      },
      manifest: {
        name: 'Cube Solver',
        short_name: 'Cube Solver',
        description: "Take two photos of your Rubik's cube and follow an animated 3D solution.",
        display: 'standalone',
        start_url: '.',
        scope: '.',
        background_color: '#eceef1',
        theme_color: '#eceef1',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 900 },
  // Workers are bundled by their own pipeline, and so are pre-bundled dependencies in dev.
  worker: { format: 'es', plugins: () => [cubejsModuleScope()] },
  optimizeDeps: { rolldownOptions: { plugins: [cubejsModuleScope()] } },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
  },
})
