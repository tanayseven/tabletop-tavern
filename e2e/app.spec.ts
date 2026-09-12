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
      // Generous, because this polls while four workers share the machine and
      // both games' opponents search on the main thread.
      { timeout: 10_000 },
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

test('only the card list scrolls, not the whole menu', async ({ page }) => {
  await page.goto('/#/menu')
  await page.setViewportSize({ width: 390, height: 500 })

  const title = page.getByRole('heading', { name: 'Tabletop Tavern' })
  const before = await title.boundingBox()

  // The cards overflow at this size -- that overflow has to live in .scroller
  // and nowhere else, so the title and Quit stay put while the list moves.
  const overflows = (selector: string) =>
    page.locator(selector).evaluate((el) => el.scrollHeight > el.clientHeight)

  expect(await overflows('.scroller')).toBe(true)
  expect(await overflows('.page')).toBe(false)
  expect(await overflows('body')).toBe(false)

  await page
    .locator('.scroller')
    .evaluate((el) => el.scrollTo(0, el.scrollHeight))
  await expect
    .poll(() => page.locator('.scroller').evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0)

  // Scrolling the list moved the cards, but not the heading above them.
  expect(await title.boundingBox()).toEqual(before)
})

test('plays Advanced Tic Tac Toe, which routes you by the cell you pick', async ({
  page,
}) => {
  await page.goto('/#/menu')
  await page
    .getByRole('button', { name: 'Advanced Tic Tac Toe', exact: true })
    .click()

  // The same setup sequence as the plain game -- it's the shared component.
  await page.getByRole('button', { name: 'Player vs Player' }).click()
  await page.getByRole('button', { name: 'Heads' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'X', exact: true }).click()

  const board = page.getByRole('grid', { name: 'Ultimate Tic Tac Toe board' })
  await expect(board).toBeVisible()
  await expect(board.getByRole('button')).toHaveCount(81)

  const cell = (name: string, row: number, column: number) =>
    page.getByRole('button', {
      name: new RegExp(`^${name} board, row ${row}, column ${column}`),
    })

  // The opening move may go anywhere.
  await expect(page.getByText(/Free choice/)).toBeVisible()
  await cell('top-left', 3, 1).click()
  await expect(cell('top-left', 3, 1)).toHaveAccessibleName(/: X$/)

  // Row 3, column 1 is the bottom-left cell, so O is sent to the bottom-left
  // board -- and nowhere else.
  await expect(page.getByText(/Play in the bottom-left board/)).toBeVisible()
  await expect(cell('bottom-left', 1, 1)).toBeEnabled()
  await expect(cell('top-left', 1, 1)).toBeDisabled()

  await cell('bottom-left', 2, 2).click()
  await expect(cell('bottom-left', 2, 2)).toHaveAccessibleName(/: O$/)

  // Row 2, column 2 is the centre cell, so X is sent to the centre board.
  await expect(page.getByText(/Play in the centre board/)).toBeVisible()
  await expect(cell('centre', 1, 1)).toBeEnabled()
  await expect(cell('bottom-left', 1, 1)).toBeDisabled()
})

test('the computer answers in Advanced Tic Tac Toe', async ({ page }) => {
  await page.goto('/#/game/advanced-tic-tac-toe')

  await page.getByRole('button', { name: 'Player vs Computer' }).click()
  await page.getByRole('button', { name: /^Hard/ }).click()
  await page.getByRole('button', { name: 'Heads' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()

  // The mark screen only appears when the human wins the toss.
  const markChoice = page.getByRole('button', { name: 'X', exact: true })
  if (await markChoice.isVisible()) await markChoice.click()

  const board = page.getByRole('grid', { name: 'Ultimate Tic Tac Toe board' })
  await expect(board).toBeVisible()

  const cells = board.getByRole('button')
  const marked = async () => {
    const names = await cells.evaluateAll((els) =>
      els.map((el) => el.getAttribute('aria-label') ?? ''),
    )
    return names.filter((name) => !name.endsWith(': empty')).length
  }

  // Every cell is disabled while the computer is thinking, and when it is the
  // human's turn only the board they were sent to opens up -- so take whatever
  // is playable rather than naming a cell.
  const open = board.locator('button:not([disabled])')
  await expect(open.first()).toBeEnabled({ timeout: 10_000 })
  await open.first().click()

  // Whoever moved first, two marks are down shortly after that one click.
  await expect.poll(marked, { timeout: 10_000 }).toBeGreaterThanOrEqual(2)
})

test('an unknown game id falls back to the menu', async ({ page }) => {
  await page.goto('/#/game/not-a-real-game')
  await expect(page.getByText(/There's no game called/)).toBeVisible()
})
