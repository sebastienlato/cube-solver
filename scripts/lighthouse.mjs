/**
 * Runs Lighthouse (mobile) against the production build and prints the three scores the
 * spec sets targets for. Usage: npm run build && npm run lighthouse
 */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'

const PORT = 4174
const URL = `http://localhost:${PORT}/`
const TARGETS = { performance: 90, accessibility: 95, 'best-practices': 95 }

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      if ((await fetch(URL)).ok) return
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('The preview server did not start. Run `npm run build` first.')
}

let failed = false
try {
  await waitForServer()
  // Playwright's Chromium, so the run does not depend on what is installed on the machine.
  const chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new'] })
  const routes = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['']
  mkdirSync('.lighthouse', { recursive: true })
  for (const route of routes) {
    const result = await lighthouse(URL + route, {
      port: chrome.port,
      onlyCategories: Object.keys(TARGETS),
      output: 'html',
    })
    writeFileSync(`.lighthouse/report${route ? '-' + route.replace(/\W+/g, '-') : ''}.html`, result.report)
    console.log(`\n${URL}${route}`)
    for (const [category, target] of Object.entries(TARGETS)) {
      const score = Math.round(result.lhr.categories[category].score * 100)
      if (score < target) failed = true
      console.log(
        `  ${category.padEnd(15)} ${String(score).padStart(3)}  (target ${target})${score < target ? '  BELOW TARGET' : ''}`,
      )
    }
    const audits = result.lhr.audits
    console.log(
      `  FCP ${audits['first-contentful-paint'].displayValue}, LCP ${audits['largest-contentful-paint'].displayValue}, TBT ${audits['total-blocking-time'].displayValue}, CLS ${audits['cumulative-layout-shift'].displayValue}`,
    )
    for (const category of Object.keys(TARGETS)) {
      for (const ref of result.lhr.categories[category].auditRefs) {
        const audit = audits[ref.id]
        if (ref.weight > 0 && audit.score !== null && audit.score < 0.9 && category !== 'performance') {
          console.log(`    ! ${category}: ${audit.title}`)
        }
      }
    }
  }
  await chrome.kill()
} finally {
  server.kill()
}
process.exit(failed ? 1 : 0)
