import { expect, type Page } from '@playwright/test'

export const SOLVED = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'

export const DEFAULT_COLORS = {
  U: '#f4f5f4',
  R: '#d7332b',
  F: '#1e9b57',
  D: '#f7d42a',
  L: '#f6861f',
  B: '#2462c7',
}

/** The cube after the scramble D2 R' U F2 L B' U2 R D' F (a fixed position for repeatable runs). */
export const SCRAMBLED = 'DDFUUFBFFRLLRRLRDDUUDUFDFFBLRUBDLUULRBLDLLFRUDBBBBFBRR'

/** The two sizes every screen is reviewed at. */
export const VIEWPORTS = {
  phone: { width: 390, height: 844, deviceScaleFactor: 2 },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
} as const

export const SCHEMES = ['light', 'dark'] as const

export const STORAGE_KEY = 'cube-solver:session:v1'

/** Puts a saved session in place before the app starts, as if the user had refreshed mid-session. */
export async function seedSession(page: Page, session: Record<string, unknown>): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, value)
    },
    [STORAGE_KEY, JSON.stringify(session)] as const,
  )
}

/** Waits until the 3D cube has painted its first frame. */
export async function cubeReady(page: Page): Promise<void> {
  await page.locator('[data-facelets]').first().waitFor({ state: 'attached', timeout: 30_000 })
  await page.waitForTimeout(400)
}

/** The facelet string the 3D cube is actually showing, after any finished turn has been baked in. */
export const displayedCube = (page: Page) => page.locator('[data-facelets]').first().getAttribute('data-facelets')

/** The 54 sticker letters as shown on the editor's net. */
export async function netState(page: Page): Promise<string> {
  const letters = await page.locator('[data-facelet]').evaluateAll((stickers) =>
    stickers
      .map((sticker) => [Number(sticker.getAttribute('data-facelet')), sticker.getAttribute('data-color')] as const)
      .sort((a, b) => a[0] - b[0])
      .map(([, letter]) => letter)
      .join(''),
  )
  return letters
}

/** Plays the solution at double speed and waits for the solved message. */
export async function playToTheEnd(page: Page): Promise<void> {
  await page.getByRole('radio', { name: '2 times speed' }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByText(/^Solved in \d+ moves?$/)).toBeVisible({ timeout: 60_000 })
}
