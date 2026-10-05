import { expect, test } from '@playwright/test'
import { SCHEMES, VIEWPORTS, cubeReady } from './helpers'

// Chromium's built-in fake camera stands in for a phone's rear camera. Launch flags apply to
// the whole file, which is why the live-camera runs live here and not with the other screens.
test.use({
  permissions: ['camera'],
  launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
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

      test('live camera: guide, capture, then adjust with handles where the guide was', async ({ page }) => {
        await page.goto('/#/scan/1')
        const takePhoto = page.getByRole('button', { name: 'Take photo' })
        await expect(takePhoto).toBeEnabled({ timeout: 20_000 })
        await cubeReady(page)
        await page.waitForTimeout(1800)
        await page.screenshot({ path: `e2e/screenshots/scan-photo1-camera-${device}-${scheme}.png` })

        await takePhoto.click()
        await expect(page.getByRole('heading', { name: 'Line up the grid' })).toBeVisible()
        await expect(page.locator('[data-handle]')).toHaveCount(7)
        await page.waitForTimeout(300)
        await page.screenshot({ path: `e2e/screenshots/scan-photo1-camera-adjust-${device}-${scheme}.png` })

        // The preview can be left for the upload path and come back.
        await page.getByRole('button', { name: 'Retake' }).click()
        await page.getByRole('button', { name: 'Upload a photo instead' }).click()
        await expect(page.getByText('Upload photo')).toBeVisible()
        await page.getByRole('button', { name: 'Use the camera' }).click()
        await expect(takePhoto).toBeEnabled({ timeout: 20_000 })
      })
    })
  }
}
