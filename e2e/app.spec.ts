import { expect, test } from '@playwright/test'

const GAME_COUNT = 10

test('shows the splash, then the menu', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Tabletop Tavern' }),
  ).toBeVisible()

  // The splash runs a 3s fade-in / 2s hold / 2s fade-out; allow the full 7s
  // plus a margin, without making the assertion meaningless.
  await expect(page.getByRole('button', { name: 'Chess' })).toBeVisible({
    timeout: 10_000,
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

test('plays a hot-seat round of Tic Tac Toe', async ({ page }) => {
  await page.goto('/#/menu')
  await page.getByRole('button', { name: 'Tic Tac Toe', exact: true }).click()

  // The setup sequence from docs/tic-tac-toe.md: mode, then the coin toss
  // (no difficulty screen for hot-seat), then the mark choice.
  await page.getByRole('button', { name: 'Player vs Player' }).click()
  await page.getByRole('button', { name: 'Heads' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'X', exact: true }).click()

  // Proves the lazy chunk resolved, not just that the route changed.
  const board = page.getByRole('grid', { name: 'Tic Tac Toe board' })
  await expect(board).toBeVisible()
  await expect(page.getByText("X's turn")).toBeVisible()

  const cells = board.getByRole('button')
  await cells.nth(0).click() // X
  await expect(page.getByText("O's turn")).toBeVisible()
  await cells.nth(3).click() // O
  await cells.nth(1).click() // X
  await cells.nth(4).click() // O
  await cells.nth(2).click() // X completes the top row
  await expect(page.getByText('X wins!')).toBeVisible()

  // The session scoreboard counts the round.
  await expect(page.getByText(/Games played: 1/)).toBeVisible()

  await page.getByRole('button', { name: 'Back to Menu' }).click()
  await expect(page).toHaveURL(/#\/menu$/)
})

test('the computer plays its turn against a Hard opponent', async ({
  page,
}) => {
  await page.goto('/#/game/tic-tac-toe')

  await page.getByRole('button', { name: 'Player vs Computer' }).click()
  await page.getByRole('button', { name: /^Hard/ }).click()
  await page.getByRole('button', { name: 'Heads' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()

  // The mark screen only appears when the human wins the toss; when the
  // computer wins it picks for itself and play starts straight away.
  const markChoice = page.getByRole('button', { name: 'X', exact: true })
  if (await markChoice.isVisible()) await markChoice.click()

  const board = page.getByRole('grid', { name: 'Tic Tac Toe board' })
  await expect(board).toBeVisible()

  // Whoever moves first, two marks are on the board shortly after one click.
  const cells = board.getByRole('button')
  await cells
    .nth(4)
    .click()
    .catch(() => {})
  await expect
    .poll(
      async () => {
        const texts = await cells.allTextContents()
        return texts.filter((t) => t.trim() !== '').length
      },
      { timeout: 5_000 },
    )
    .toBeGreaterThanOrEqual(2)
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

test('the board cells keep their size as marks are placed', async ({
  page,
}) => {
  await page.goto('/#/game/tic-tac-toe')

  await page.getByRole('button', { name: 'Player vs Player' }).click()
  await page.getByRole('button', { name: 'Heads' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'X', exact: true }).click()

  const cells = page
    .getByRole('grid', { name: 'Tic Tac Toe board' })
    .getByRole('button')

  // Regression test for the grid's rows being left implicit, which made them
  // content-sized: an empty cell is textless and short, so the first mark
  // dropped into a row grew it and visibly resized the board mid-game.
  const heights = async () => {
    const boxes = await cells.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().height),
    )
    return { min: Math.min(...boxes), max: Math.max(...boxes) }
  }

  const empty = await heights()
  expect(empty.max - empty.min).toBeLessThan(1)

  for (const index of [0, 3, 1]) {
    await cells.nth(index).click()
    const now = await heights()
    // Uniform across the board, and unchanged from the empty board.
    expect(now.max - now.min).toBeLessThan(1)
    expect(Math.abs(now.max - empty.max)).toBeLessThan(1)
  }
})

test('an unknown game id falls back to the menu', async ({ page }) => {
  await page.goto('/#/game/not-a-real-game')
  await expect(page.getByText(/There's no game called/)).toBeVisible()
})
