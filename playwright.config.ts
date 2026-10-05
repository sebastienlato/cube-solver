import { defineConfig } from '@playwright/test'

const PORT = 4173

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  workers: 4,
  retries: 0,
  timeout: 90_000,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: 'chromium',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  // E2E runs against the production build so the service worker and code splitting are what users get.
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
