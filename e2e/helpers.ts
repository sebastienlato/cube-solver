import type { Page } from '@playwright/test'

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
