import { expect, test } from '@playwright/test'

const GAME_COUNT = 10

test('shows the splash, then the menu', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Tabletop Tavern' }),
  ).toBeVisible()

  // The splash lasts 2s; give it room without making the assertion meaningless.
  await expect(page.getByRole('button', { name: 'Chess' })).toBeVisible({
    timeout: 5_000,
  })
  await expect(page).toHaveURL(/#\/menu$/)
})

test('lists every game', async ({ page }) => {
  await page.goto('/#/menu')
  await expect(page.locator('.grid button')).toHaveCount(GAME_COUNT)
})

test('work-in-progress games do not navigate', async ({ page }) => {
  await page.goto('/#/menu')
  const ludo = page.getByRole('button', { name: 'Ludo' })
  await expect(ludo).toHaveAttribute('aria-disabled', 'true')

  // `force` bypasses Playwright's actionability check, which would otherwise
  // refuse to click an aria-disabled element. That refusal proves the markup
  // is right; forcing through proves the click handler guards as well, so the
  // behaviour doesn't rest on the attribute alone.
  await ludo.click({ force: true })
  await expect(page).toHaveURL(/#\/menu$/)
})

test('the title stays reachable when the games overflow the screen', async ({
  page,
}) => {
  await page.goto('/#/menu')
  // Regression test for flex `justify-content: center` clipping overflow off
  // the top of the scroll container, which hid the title on short viewports.
  await page.setViewportSize({ width: 390, height: 500 })

  const title = page.getByRole('heading', { name: 'Tabletop Tavern' })
  const box = await title.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.y).toBeGreaterThanOrEqual(0)
})

test('an unknown game id falls back to the menu', async ({ page }) => {
  await page.goto('/#/game/not-a-real-game')
  await expect(page.getByText(/There's no game called/)).toBeVisible()
})
