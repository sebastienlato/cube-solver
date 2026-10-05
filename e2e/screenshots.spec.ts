import { test, type Page } from '@playwright/test'
import { DEFAULT_COLORS, SCHEMES, SCRAMBLED, SOLVED, VIEWPORTS, cubeReady, seedSession } from './helpers'
import { cornerPhoto } from './photos'

/**
 * Captures every screen at phone and desktop sizes, in light and dark, into e2e/screenshots/.
 * These are for visual review, not pixel comparison.
 */

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

      test('scan with uploads', async ({ page }) => {
        await page.goto('/#/scan/1')
        await page.getByRole('heading', { name: 'Look straight at one corner' }).waitFor()
        await cubeReady(page)
        await page.waitForTimeout(1500)
        await shot(page, 'scan-photo1-upload')

        await page.setInputFiles('input[type=file]', cornerPhoto(SCRAMBLED, 'first', 1))
        await page.getByRole('heading', { name: 'Line up the grid' }).waitFor()
        await page.waitForTimeout(300)
        await shot(page, 'scan-photo1-adjust')

        if (device === 'phone') {
          // Drag a handle with a finger to bring up the loupe, then put it back where it was.
          const box = (await page.locator('[data-handle="TR"]').boundingBox())!
          const x = box.x + box.width / 2
          const y = box.y + box.height / 2
          const touch = await page.context().newCDPSession(page)
          await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
          await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 5, y: y + 4 }] })
          await page.waitForTimeout(200)
          await shot(page, 'scan-adjust-loupe')
          await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] })
          await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        }

        await page.getByRole('button', { name: 'Looks right' }).click()
        await page.getByRole('heading', { name: 'Now the opposite corner' }).waitFor()
        await cubeReady(page)
        await page.waitForTimeout(1500)
        await shot(page, 'scan-photo2-upload')

        await page.setInputFiles('input[type=file]', cornerPhoto(SCRAMBLED, 1, 2))
        await page.getByRole('heading', { name: 'Line up the grid' }).waitFor()
        await page.waitForTimeout(300)
        await shot(page, 'scan-photo2-adjust')

        await page.getByRole('button', { name: 'Looks right' }).click()
        await page.getByRole('heading', { name: 'Check the colors' }).waitFor()
        await cubeReady(page)
        await shot(page, 'review-from-scan')
      })

      test('scan problems', async ({ page }) => {
        // A user who has refused camera access.
        await page.addInitScript(() => {
          navigator.mediaDevices.getUserMedia = () =>
            Promise.reject(new DOMException('Permission denied', 'NotAllowedError'))
        })
        await page.goto('/#/scan/1')
        await page.getByText('Camera access is turned off for this site').waitFor()
        await cubeReady(page)
        await page.waitForTimeout(1500)
        await shot(page, 'scan-camera-denied')

        await page.setInputFiles('input[type=file]', cornerPhoto(SCRAMBLED, 'first', 3, 0.05))
        await page.getByText('This photo is quite dark').waitFor()
        await shot(page, 'scan-adjust-dark')

        await page.getByRole('button', { name: 'Retake' }).click()
        await page.setInputFiles('input[type=file]', cornerPhoto(SCRAMBLED, 'first', 1))
        await page.getByRole('button', { name: 'Looks right' }).click()
        await page.getByRole('heading', { name: 'Now the opposite corner' }).waitFor()
        await page.setInputFiles('input[type=file]', cornerPhoto(SCRAMBLED, 'first', 5))
        await page.getByRole('button', { name: 'Looks right' }).click()
        await page.getByText('Photo 2 shows a face that was already in photo 1').waitFor()
        await page.waitForTimeout(500)
        await shot(page, 'scan-same-corner')
      })

      test('already solved', async ({ page }) => {
        await seedSession(page, { solve: { facelets: SOLVED, colors: DEFAULT_COLORS, from: 'manual' } })
        await page.goto('/#/solve')
        await cubeReady(page)
        await page.getByText('Your cube is already solved').waitFor()
        await page.waitForTimeout(600)
        await shot(page, 'solution-already-solved')
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
        await page.waitForTimeout(600)
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
