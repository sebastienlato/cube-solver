import { expect, test } from '@playwright/test'
import {
  DEFAULT_COLORS,
  SCRAMBLED,
  SOLVED,
  cubeReady,
  displayedCube,
  netState,
  playToTheEnd,
  seedSession,
} from './helpers'
import { cornerPhoto } from './photos'

const solveSession = { solve: { facelets: SCRAMBLED, colors: DEFAULT_COLORS, from: 'home' } }

test.describe('demo scramble', () => {
  test('plays the solution to the end and the 3D cube ends solved', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Try a random scramble' }).click()
    await expect(page.getByText(/^\d+ moves to solve$/)).toBeVisible({ timeout: 30_000 })
    await cubeReady(page)
    expect(await displayedCube(page)).not.toBe(SOLVED)

    await playToTheEnd(page)
    await expect.poll(() => displayedCube(page)).toBe(SOLVED)
    await expect(page.getByRole('img', { name: '3D view of your cube, solved' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Scan another cube' })).toBeVisible()
  })

  test('steps, jumps and keyboard shortcuts keep the readout and the cube in step', async ({ page }) => {
    await seedSession(page, solveSession)
    await page.goto('/#/solve')
    await expect(page.getByText(/^\d+ moves to solve$/)).toBeVisible({ timeout: 30_000 })
    await cubeReady(page)
    await expect(page.getByText('Hold the cube with white on top, green facing you.')).toBeVisible()

    await page.getByRole('button', { name: 'Next move' }).click()
    await expect(page.getByText(/^Move 1 of \d+$/)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Move 1:/ })).toHaveAttribute('aria-current', 'step')
    const afterOne = await expect.poll(() => displayedCube(page)).not.toBe(SCRAMBLED)
    void afterOne

    // Arrow keys step; Space plays and pauses when no control has focus.
    await page.locator('body').click({ position: { x: 5, y: 300 } })
    await page.keyboard.press('ArrowRight')
    await expect(page.getByText(/^Move 2 of \d+$/)).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByText(/^Move 1 of \d+$/)).toBeVisible()
    await page.keyboard.press('Space')
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
    await page.keyboard.press('Space')
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()

    // A chip jumps straight to the cube as it is after that move.
    await page.getByRole('button', { name: /^Move 5:/ }).click()
    await expect(page.getByText(/^Move 5 of \d+$/)).toBeVisible()
    await page.getByRole('button', { name: 'Restart' }).click()
    await expect(page.getByText(/^\d+ moves to solve$/)).toBeVisible()
    await expect.poll(() => displayedCube(page)).toBe(SCRAMBLED)
  })

  test('with reduced motion, each move lands at once', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await seedSession(page, solveSession)
    await page.goto('/#/solve')
    await expect(page.getByText(/^\d+ moves to solve$/)).toBeVisible({ timeout: 30_000 })
    await cubeReady(page)
    for (let move = 1; move <= 4; move++) {
      await page.getByRole('button', { name: 'Next move' }).click()
      await expect(page.getByText(new RegExp(`^Move ${move} of \\d+$`))).toBeVisible({ timeout: 1_000 })
    }
    await playToTheEnd(page)
    await expect.poll(() => displayedCube(page)).toBe(SOLVED)
    await context.close()
  })

  test('says so when the cube is already solved', async ({ page }) => {
    await seedSession(page, { solve: { facelets: SOLVED, colors: DEFAULT_COLORS, from: 'manual' } })
    await page.goto('/#/solve')
    await expect(page.getByText('Your cube is already solved')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toHaveCount(0)
  })
})

test.describe('solution screen on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('fits 390×844 without scrolling at every stage', async ({ page }) => {
    await seedSession(page, { ...solveSession, speed: 2 })
    await page.goto('/#/solve')
    await expect(page.getByText(/^\d+ moves to solve$/)).toBeVisible({ timeout: 30_000 })

    const fits = async () => {
      const { scrollHeight, scrollWidth } = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth,
      }))
      expect(scrollHeight).toBeLessThanOrEqual(844)
      expect(scrollWidth).toBeLessThanOrEqual(390)
      for (const name of ['Restart', 'Previous move', 'Next move']) {
        const box = await page.getByRole('button', { name }).boundingBox()
        expect(box!.y + box!.height).toBeLessThanOrEqual(844)
      }
      // The cube keeps the largest share of the screen.
      const cube = await page.getByRole('region', { name: '3D cube' }).boundingBox()
      expect(cube!.height).toBeGreaterThan(380)
    }

    await fits()
    await page.getByRole('button', { name: 'Next move' }).click()
    await expect(page.getByText(/^Move 1 of \d+$/)).toBeVisible()
    await fits()
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await expect(page.getByText(/^Solved in \d+ moves?$/)).toBeVisible({ timeout: 60_000 })
    await fits()
  })
})

test.describe('manual entry', () => {
  test('enter a cube sticker by sticker, then solve it', async ({ page }) => {
    await page.goto('/#/manual')
    await expect(page.getByRole('heading', { name: 'Enter your cube’s colors' })).toBeVisible()
    await expect(page.getByText('This is a real cube position.')).toBeVisible()

    for (let index = 0; index < 54; index++) {
      if (index % 9 === 4) continue
      const sticker = page.locator(`[data-facelet="${index}"]`)
      if ((await sticker.getAttribute('data-color')) === SCRAMBLED[index]) continue
      // Entry moves on to the next sticker by itself; only select when it hasn't.
      if ((await sticker.getAttribute('aria-pressed')) !== 'true') await sticker.click()
      await page.locator(`[data-pick="${SCRAMBLED[index]}"]`).click()
    }
    if (await page.getByRole('button', { name: 'Done' }).isVisible())
      await page.getByRole('button', { name: 'Done' }).click()

    expect(await netState(page)).toBe(SCRAMBLED)
    await expect(page.getByText('This is a real cube position.')).toBeVisible()

    await page.getByRole('button', { name: 'Solve' }).click()
    await expect(page.getByText(/^\d+ moves to solve$/)).toBeVisible({ timeout: 30_000 })
    await cubeReady(page)
    expect(await displayedCube(page)).toBe(SCRAMBLED)
    await playToTheEnd(page)
    await expect.poll(() => displayedCube(page)).toBe(SOLVED)
  })

  test('explains what is wrong, points at the stickers, and only then allows Solve', async ({ page }) => {
    await page.goto('/#/manual')
    const solve = page.getByRole('button', { name: 'Solve' })
    await expect(solve).toBeEnabled()

    // Paint one top sticker yellow: ten yellow, eight white.
    await page.getByRole('button', { name: /^top face, row 1, column 1/ }).click()
    await page.getByRole('radio', { name: 'yellow' }).click()
    await page.getByRole('button', { name: 'Done' }).click()

    const message = page.getByRole('button', { name: /There are 10 yellow stickers and 8 white/ })
    await expect(message).toContainText('One yellow sticker is probably white.')
    await expect(solve).toBeDisabled()

    await message.click()
    await expect(page.getByRole('button', { name: /^top face, row 1, column 1.*check this sticker/ })).toBeVisible()

    await page.getByRole('button', { name: /^top face, row 1, column 1/ }).click()
    await page.keyboard.press('1')
    // Manual entry has moved on to the next sticker; close the picker to see the verdict.
    await page.keyboard.press('Escape')
    await expect(page.getByText('This is a real cube position.')).toBeVisible()
    await expect(solve).toBeEnabled()
  })

  test('centers can be changed here, the two faces trade colors, and edits survive a refresh', async ({ page }) => {
    await page.goto('/#/manual')
    const top = page.locator('[data-facelet="4"]')
    const bottom = page.locator('[data-facelet="31"]')
    const colorOf = (sticker: typeof top) => sticker.evaluate((element) => getComputedStyle(element).backgroundColor)
    const white = await colorOf(top)
    const yellow = await colorOf(bottom)

    await top.click()
    await page.getByRole('radio', { name: 'yellow' }).click()
    expect(await colorOf(top)).toBe(yellow)
    expect(await colorOf(bottom)).toBe(white)
    // Stickers the user had already set keep their color.
    expect(await colorOf(page.locator('[data-facelet="0"]'))).toBe(white)

    await page.reload()
    expect(await colorOf(page.locator('[data-facelet="4"]'))).toBe(yellow)

    await page.getByRole('button', { name: 'Start over' }).click()
    await page.getByRole('button', { name: 'Clear all' }).click()
    expect(await colorOf(page.locator('[data-facelet="4"]'))).toBe(white)
    await expect(page.getByText('This is a real cube position.')).toBeVisible()
  })
})

test.describe('scanning with uploaded photos', () => {
  test('two synthetic photos → review → solve, with nothing sent off the device', async ({ page, baseURL }) => {
    const elsewhere: string[] = []
    page.on('request', (request) => {
      const url = request.url()
      if (!url.startsWith(baseURL!) && !url.startsWith('data:') && !url.startsWith('blob:')) elsewhere.push(url)
    })

    await page.goto('/')
    await page.getByRole('button', { name: 'Scan my cube' }).click()
    await expect(page.getByRole('heading', { name: 'Look straight at one corner' })).toBeVisible()
    await expect(page.getByText('Photos are processed on your device and never uploaded.')).toBeVisible()

    await page.setInputFiles('input[type=file]', cornerPhoto(SCRAMBLED, 'first', 11))
    await expect(page.getByRole('heading', { name: 'Line up the grid' })).toBeVisible()
    await expect(page.locator('[data-handle]')).toHaveCount(7)
    await page.getByRole('button', { name: 'Looks right' }).click()

    await expect(page.getByRole('heading', { name: 'Now the opposite corner' })).toBeVisible()
    // Held with the left face on top: the app has to work out which way round it is.
    await page.setInputFiles('input[type=file]', cornerPhoto(SCRAMBLED, 2, 12))
    await expect(page.getByRole('heading', { name: 'Line up the grid' })).toBeVisible()
    await page.getByRole('button', { name: 'Looks right' }).click()

    await expect(page.getByRole('heading', { name: 'Check the colors' })).toBeVisible()
    expect(await netState(page)).toBe(SCRAMBLED)
    await expect(page.getByText('This is a real cube position.')).toBeVisible()

    await page.getByRole('button', { name: 'Solve' }).click()
    await expect(page.getByText(/^\d+ moves to solve$/)).toBeVisible({ timeout: 30_000 })
    await cubeReady(page)
    expect(await displayedCube(page)).toBe(SCRAMBLED)
    await playToTheEnd(page)
    await expect.poll(() => displayedCube(page)).toBe(SOLVED)

    expect(elsewhere).toEqual([])
  })

  test('going back keeps the photos, the handles and the corrections', async ({ page }) => {
    await page.goto('/#/scan/1')
    await page.setInputFiles('input[type=file]', cornerPhoto(SCRAMBLED, 'first', 21))
    await page.getByRole('button', { name: 'Looks right' }).click()
    await page.setInputFiles('input[type=file]', cornerPhoto(SCRAMBLED, 0, 22))
    await page.getByRole('button', { name: 'Looks right' }).click()
    await expect(page.getByRole('heading', { name: 'Check the colors' })).toBeVisible()

    // Change one sticker in Review.
    const sticker = page.locator('[data-facelet="0"]')
    const before = await sticker.getAttribute('data-color')
    const other = before === 'R' ? 'L' : 'R'
    await sticker.click()
    await page.locator(`[data-pick="${other}"]`).click()
    await expect(sticker).toHaveAttribute('data-color', other)

    // Back to photo 2's handles, then forward again without touching them.
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Line up the grid' })).toBeVisible()
    await expect(page.locator('[data-handle]')).toHaveCount(7)
    await page.getByRole('button', { name: 'Looks right' }).click()
    await expect(page.locator('[data-facelet="0"]')).toHaveAttribute('data-color', other)

    // The browser's own back button works too, and the photo is still there to reuse.
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'Line up the grid' })).toBeVisible()
    await expect(page.locator('[data-handle]')).toHaveCount(7)
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Now the opposite corner' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Use the photo you took' })).toBeVisible()

    // A refresh in Review keeps the cube (photos are not stored, by design).
    await page.goto('/#/review')
    await page.reload()
    await expect(page.locator('[data-facelet="0"]')).toHaveAttribute('data-color', other)
  })

  test('handles can be dragged and nudged, and the grid follows', async ({ page }) => {
    await page.goto('/#/scan/1')
    await page.setInputFiles('input[type=file]', cornerPhoto(SCRAMBLED, 'first', 31))
    await expect(page.getByRole('heading', { name: 'Line up the grid' })).toBeVisible()

    const handle = page.locator('[data-handle="T"]')
    const grid = page.locator('svg[role="group"] path').last()
    const position = () => handle.getAttribute('transform')
    const start = await position()
    const gridBefore = await grid.getAttribute('d')

    const box = (await handle.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 18, { steps: 4 })
    await page.mouse.up()
    const dragged = await position()
    expect(dragged).not.toBe(start)
    expect(await grid.getAttribute('d')).not.toBe(gridBefore)

    await handle.focus()
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('Shift+ArrowUp')
    expect(await position()).not.toBe(dragged)
  })

  test('a second photo of the same corner is caught, with a way to retake it', async ({ page }) => {
    await page.goto('/#/scan/1')
    await page.setInputFiles('input[type=file]', cornerPhoto(SCRAMBLED, 'first', 41))
    await page.getByRole('button', { name: 'Looks right' }).click()
    await page.setInputFiles('input[type=file]', cornerPhoto(SCRAMBLED, 'first', 42))
    await page.getByRole('button', { name: 'Looks right' }).click()

    await expect(page.getByRole('alert')).toContainText('Photo 2 shows a face that was already in photo 1.')
    await page.getByRole('button', { name: 'Retake photo 2' }).click()
    await expect(page.getByRole('heading', { name: 'Now the opposite corner' })).toBeVisible()

    await page.setInputFiles('input[type=file]', cornerPhoto(SCRAMBLED, 1, 43))
    await page.getByRole('button', { name: 'Looks right' }).click()
    await expect(page.getByRole('heading', { name: 'Check the colors' })).toBeVisible()
    expect(await netState(page)).toBe(SCRAMBLED)
  })

  test('a very dark photo gets a warning but can still be used', async ({ page }) => {
    await page.goto('/#/scan/1')
    await page.setInputFiles('input[type=file]', cornerPhoto(SCRAMBLED, 'first', 51, 0.05))
    await expect(page.getByText(/^This photo is quite dark, so colors may be misread\./)).toBeVisible()
    await page.getByRole('button', { name: 'Looks right' }).click()
    await expect(page.getByRole('heading', { name: 'Now the opposite corner' })).toBeVisible()
  })

  test('refusing camera access switches to upload with an explanation', async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException('Permission denied', 'NotAllowedError'))
    })
    await page.goto('/#/scan/1')
    await expect(page.getByText('Camera access is turned off for this site, so upload a photo instead.')).toBeVisible()
    await expect(page.locator('input[type=file]')).toHaveAttribute('capture', 'environment')
    await expect(page.locator('input[type=file]')).toHaveAttribute('accept', 'image/*')
  })

  test('review without a scan sends the user to photo 1', async ({ page }) => {
    await page.goto('/#/review')
    await expect(page.getByRole('heading', { name: 'Look straight at one corner' })).toBeVisible()
  })
})

test.describe('first paint', () => {
  test('Home is in the HTML itself and hydrates without errors', async ({ page, request, baseURL }) => {
    const html = await (await request.get(baseURL!)).text()
    expect(html).toContain('Solve your cube from two photos')
    expect(html).toContain('Scan my cube')

    const problems: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') problems.push(message.text())
    })
    page.on('pageerror', (error) => problems.push(error.message))

    await page.goto('/')
    await cubeReady(page)
    // The prerendered buttons are live once hydrated.
    await page.getByRole('button', { name: 'Enter colors manually' }).click()
    await expect(page.getByRole('heading', { name: 'Enter your cube’s colors' })).toBeVisible()
    // WebGL driver chatter from headless Chromium is not the app's doing.
    expect(problems.filter((text) => !/GL Driver Message|GPU stall/.test(text))).toEqual([])
  })

  test('opening a deep link never flashes Home first', async ({ page }) => {
    await seedSession(page, solveSession)
    await page.goto('/#/solve')
    await expect(page.getByRole('heading', { name: 'Solution' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Solve your cube from two photos' })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.dataset.route)).toBeUndefined()
  })
})

test.describe('resilience', () => {
  test('works offline after the first visit, including the solver', async ({ page, context, request, baseURL }) => {
    await page.goto('/')
    // Wait until the service worker has taken control and finished caching the app.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) =>
          navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
        )
      }
    })
    // Every file the service worker lists must be in the cache before the network goes away.
    const listed = ((await (await request.get(`${baseURL}/sw.js`)).text()).match(/url:"/g) ?? []).length
    expect(listed).toBeGreaterThan(10)
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const counts = await Promise.all(
            (await caches.keys()).map(async (key) => (await (await caches.open(key)).keys()).length),
          )
          return counts.reduce((a, b) => a + b, 0)
        }),
      )
      .toBeGreaterThanOrEqual(listed)

    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Solve your cube from two photos' })).toBeVisible()
    await cubeReady(page)

    await page.getByRole('button', { name: 'Try a random scramble' }).click()
    await expect(page.getByText(/^\d+ moves to solve$/)).toBeVisible({ timeout: 30_000 })
    await playToTheEnd(page)
    await expect.poll(() => displayedCube(page)).toBe(SOLVED)

    await page.goto('/#/manual')
    await expect(page.getByRole('heading', { name: 'Enter your cube’s colors' })).toBeVisible()
  })

  test('without WebGL the cube is shown flat and the solution still plays through', async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type.startsWith('webgl')) return null
        return (original as (...args: unknown[]) => unknown).call(this, type, ...rest)
      } as typeof original
    })
    await seedSession(page, solveSession)
    await page.goto('/#/solve')
    await expect(page.getByText(/^\d+ moves to solve$/)).toBeVisible({ timeout: 30_000 })
    await expect(
      page.getByText('This browser has 3D graphics turned off, so the cube is shown unfolded.'),
    ).toBeVisible()
    await playToTheEnd(page)
    expect(await netState(page)).toBe(SOLVED)
  })

  test('a refresh on the solution screen keeps the cube and the chosen speed', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Try a random scramble' }).click()
    await expect(page.getByText(/^\d+ moves to solve$/)).toBeVisible({ timeout: 30_000 })
    await cubeReady(page)
    const cube = await displayedCube(page)
    await page.getByRole('radio', { name: '0.5 times speed' }).click()

    await page.reload()
    await expect(page.getByText(/^\d+ moves to solve$/)).toBeVisible({ timeout: 30_000 })
    await cubeReady(page)
    expect(await displayedCube(page)).toBe(cube)
    await expect(page.getByRole('radio', { name: '0.5 times speed' })).toHaveAttribute('aria-checked', 'true')
  })
})
