import { test, type Page } from '@playwright/test'
import { DEFAULT_COLORS, SCRAMBLED, cubeReady, seedSession } from './helpers'

/**
 * Captures every screen at phone and desktop sizes, in light and dark, into e2e/screenshots/.
 * These are for visual review, not pixel comparison.
 */
const VIEWPORTS = {
  phone: { width: 390, height: 844, deviceScaleFactor: 2 },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
} as const

const SCHEMES = ['light', 'dark'] as const

const solveSession = { solve: { facelets: SCRAMBLED, colors: DEFAULT_COLORS, from: 'home' }, speed: 2 }

// One green sticker misread as yellow, plus a few stickers the classifier was unsure of.
const MISREAD = SCRAMBLED.slice(0, 2) + 'D' + SCRAMBLED.slice(3)
const reviewSession = (facelets: string) => ({
  scan: { facelets, colors: DEFAULT_COLORS, lowConfidence: [2, 16, 30, 47], inputKey: 'screenshots' },
})

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  for (const scheme of SCHEMES) {
    test.describe(`${device} ${scheme}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.deviceScaleFactor,
        colorScheme: scheme,
        hasTouch: device === 'phone',
      })

      const shot = (page: Page, name: string) =>
        page.screenshot({ path: `e2e/screenshots/${name}-${device}-${scheme}.png` })

      test('home', async ({ page }) => {
        await page.goto('/')
        await cubeReady(page)
        await page.waitForTimeout(1800)
        await shot(page, 'home')
      })

      test('manual entry', async ({ page }) => {
        await page.goto('/#/manual')
        await cubeReady(page)
        await shot(page, 'manual-start')
        await page.getByRole('button', { name: /top face, row 1, column 1/ }).click()
        await page.getByRole('radio', { name: 'green' }).click()
        await page.getByRole('radio', { name: 'red' }).click()
        await page.waitForTimeout(300)
        await shot(page, 'manual-picker')
      })

      test('review', async ({ page }) => {
        await seedSession(page, reviewSession(MISREAD))
        await page.goto('/#/review')
        await cubeReady(page)
        await shot(page, 'review-problem')
        await page.getByRole('button', { name: /to check/ }).click()
        await page.waitForTimeout(300)
        await shot(page, 'review-culprits')
        await page.getByRole('button', { name: /top face, row 1, column 3/ }).click()
        await page.getByRole('radio', { name: 'green' }).click()
        await page.getByText('This is a real cube position.').waitFor()
        await page.waitForTimeout(300)
        await shot(page, 'review-valid')
      })

      test('solution', async ({ page }) => {
        await seedSession(page, solveSession)
        await page.goto('/#/solve')
        await cubeReady(page)
        await page.getByText(/moves to solve/).waitFor()
        await shot(page, 'solution-start')

        await page.getByRole('button', { name: 'Next move' }).click()
        await page.getByText('Move 1 of').waitFor()
        await page.getByRole('button', { name: 'Next move' }).click()
        await page.getByText('Move 2 of').waitFor()
        await page.waitForTimeout(700)
        await shot(page, 'solution-move')

        await page.getByRole('button', { name: 'Play' }).click()
        await page.getByText(/Solved in/).waitFor({ timeout: 45_000 })
        await page.waitForTimeout(1600)
        await shot(page, 'solution-solved')
      })
    })
  }
}
