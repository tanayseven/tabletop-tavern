import { expect, test, type Page } from '@playwright/test'

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

  const cells = board.getByRole('button')
  const marks = async () =>
    (await cells.allTextContents()).filter((t) => t.trim() !== '').length

  // Every cell is disabled while the computer is thinking, so an enabled cell
  // means it is the human's turn. Waiting for that matters: when the computer
  // wins the toss it moves first, and a click before it has played is a no-op,
  // because `take` refuses a move that isn't the human's. Clicking blind left
  // one mark on the board and the test waiting for a second that never came --
  // on a coin flip, so it failed about half the time.
  const playable = board.locator('button:not([disabled])')
  await expect
    .poll(() => playable.count(), { timeout: 5_000 })
    .toBeGreaterThan(0)

  const before = await marks()
  await playable.first().click()

  // The human's mark, and then the computer's reply.
  await expect
    .poll(marks, { timeout: 5_000 })
    .toBeGreaterThanOrEqual(before + 2)
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

test('the board does not move when the endgame buttons appear', async ({
  page,
}) => {
  await page.goto('/#/game/tic-tac-toe')

  await page.getByRole('button', { name: 'Player vs Player' }).click()
  await page.getByRole('button', { name: 'Heads' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'X', exact: true }).click()

  const board = page.getByRole('grid', { name: 'Tic Tac Toe board' })
  const cells = board.getByRole('button')
  const boardTop = async () => (await board.boundingBox())!.y

  // Regression test for "Play Again" / "Back to Menu" being inserted into the
  // centred column at game over, which grew it and shunted the board upwards.
  const during = await boardTop()

  const playAgain = page.getByRole('button', { name: 'Play Again' })
  await expect(playAgain).toBeHidden()

  for (const index of [0, 3, 1, 4, 2]) await cells.nth(index).click()
  await expect(page.getByText('X wins!')).toBeVisible()
  await expect(playAgain).toBeVisible()

  expect(Math.abs((await boardTop()) - during)).toBeLessThan(1)
})

/**
 * A verified hot-seat sequence ending in an X match win, as [board, cell]
 * pairs. Generated by replaying the rules engine rather than written by hand:
 * each cell index dictates which board the next move must go in, so a
 * hand-built sequence is wrong more often than not. X takes boards 0, 1 and 2
 * -- the top row.
 */
const WIN_SEQUENCE: [number, number][] = [
  [2, 6],
  [6, 3],
  [3, 5],
  [5, 7],
  [7, 7],
  [7, 0],
  [0, 3],
  [3, 0],
  [0, 4],
  [4, 0],
  [0, 5],
  [5, 0],
  [1, 5],
  [5, 2],
  [2, 8],
  [8, 1],
  [1, 8],
  [8, 0],
  [2, 7],
  [7, 2],
  [1, 2],
]

/** Walks the pre-game screens into a hot-seat match with X moving first. */
async function startAdvanced(page: Page) {
  await page.goto('/#/game/advanced-tic-tac-toe')
  await page.getByRole('button', { name: 'Player vs Player' }).click()
  await page.getByRole('button', { name: 'Heads' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'X', exact: true }).click()
}

function advancedCells(page: Page) {
  return page
    .getByRole('group', { name: 'Advanced Tic Tac Toe board' })
    .getByRole('button')
}

/** Cells are laid out board-major, so board b cell c is at b * 9 + c. */
function advancedCell(page: Page, board: number, cell: number) {
  return advancedCells(page).nth(board * 9 + cell)
}

test('plays a hot-seat round of Advanced Tic Tac Toe', async ({ page }) => {
  await startAdvanced(page)

  const cells = advancedCells(page)
  await expect(cells).toHaveCount(81)

  // The rule the whole game turns on: the cell just played names the board the
  // next move must go in, and a click anywhere else does nothing at all.
  await advancedCell(page, 4, 6).click()
  await expect(
    page.getByText("O's turn — play in the bottom-left board"),
  ).toBeVisible()

  const marked = () => cells.locator('text=/^[XO]$/').count()
  const before = await marked()
  await advancedCell(page, 0, 0).click({ force: true })
  expect(await marked()).toBe(before)

  // And a legal one does.
  await advancedCell(page, 6, 0).click()
  expect(await marked()).toBe(before + 1)
})

test('the Advanced Tic Tac Toe board plays out to a match win', async ({
  page,
}) => {
  await startAdvanced(page)

  for (const [board, cell] of WIN_SEQUENCE) {
    await advancedCell(page, board, cell).click()
  }

  await expect(page.getByText('X wins the match!')).toBeVisible()
  await expect(page.getByText('Boards won — X: 3, O: 0')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play Again' })).toBeVisible()
})

test('the Advanced Tic Tac Toe cells keep their size as marks are placed', async ({
  page,
}) => {
  await startAdvanced(page)

  const cells = advancedCells(page)

  // The same regression as the Tic Tac Toe board, one nesting level deeper:
  // both grids need both axes explicit, and every item needs min-width: 0, or
  // a mark (or the owner glyph) grows a track and un-squares the whole board.
  const heights = async () => {
    const boxes = await cells.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().height),
    )
    return { min: Math.min(...boxes), max: Math.max(...boxes) }
  }

  const empty = await heights()
  expect(empty.max - empty.min).toBeLessThan(1)

  // Enough moves to win a small board, so the owner glyph is on screen too.
  for (const [board, cell] of WIN_SEQUENCE.slice(0, 12)) {
    await advancedCell(page, board, cell).click()
    const now = await heights()
    expect(now.max - now.min).toBeLessThan(1)
    expect(Math.abs(now.max - empty.max)).toBeLessThan(1)
  }
})

test('the Advanced Tic Tac Toe board does not move when the endgame buttons appear', async ({
  page,
}) => {
  await startAdvanced(page)

  const board = page.getByRole('group', {
    name: 'Advanced Tic Tac Toe board',
  })
  const boardTop = async () => (await board.boundingBox())!.y
  const during = await boardTop()

  const playAgain = page.getByRole('button', { name: 'Play Again' })
  await expect(playAgain).toBeHidden()

  for (const [b, c] of WIN_SEQUENCE) await advancedCell(page, b, c).click()
  await expect(page.getByText('X wins the match!')).toBeVisible()
  await expect(playAgain).toBeVisible()

  expect(Math.abs((await boardTop()) - during)).toBeLessThan(1)
})

test('the Advanced Tic Tac Toe board fits the smallest supported window', async ({
  page,
}) => {
  // 400x600 is the Tauri window minimum. The board may be cramped there, but
  // it must stay square and must never scroll sideways.
  await page.setViewportSize({ width: 400, height: 600 })
  await startAdvanced(page)

  const box = (await page
    .getByRole('group', { name: 'Advanced Tic Tac Toe board' })
    .boundingBox())!
  expect(Math.abs(box.width - box.height)).toBeLessThan(1)

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth,
  )
  expect(overflow).toBeLessThanOrEqual(400)
})

test('the title stays put while the games scroll under it', async ({
  page,
}) => {
  await page.goto('/#/menu')
  await page.setViewportSize({ width: 600, height: 700 })

  const title = page.getByRole('heading', { name: 'Tabletop Tavern' })
  const firstCard = page.locator('.grid button').first()

  const titleBefore = (await title.boundingBox())!.y
  const cardBefore = (await firstCard.boundingBox())!.y

  await page.locator('.scroller').evaluate((el) => el.scrollBy(0, 300))
  await expect
    .poll(async () => (await firstCard.boundingBox())!.y)
    .toBeLessThan(cardBefore)

  // The games moved; the title did not.
  expect((await title.boundingBox())!.y).toBe(titleBefore)
})

test('switches between the light and dark themes', async ({ page }) => {
  await page.goto('/#/menu')

  const html = page.locator('html')
  const background = () =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor)

  // Nothing stored yet, so the attribute is absent and the palette is whatever
  // the system asks for -- Playwright's default being light.
  await expect(html).not.toHaveAttribute('data-theme')
  const light = await background()

  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await expect(html).toHaveAttribute('data-theme', 'dark')

  // The attribute alone would pass even if no token were wired to it.
  const dark = await background()
  expect(dark).not.toBe(light)

  // Applied before the first paint on the way back in. The usual way to do that
  // is an inline script in index.html, which Tauri's `script-src 'self'` CSP
  // blocks, so it runs from main.ts instead -- this is what proves it's early
  // enough.
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  expect(await background()).toBe(dark)

  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await expect(html).toHaveAttribute('data-theme', 'light')
  expect(await background()).toBe(light)
})

test('the theme can be switched without leaving a game', async ({ page }) => {
  await page.goto('/#/game/tic-tac-toe')

  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  // Still on the same screen: changing the palette must not cost the round.
  await expect(
    page.getByRole('button', { name: 'Player vs Player' }),
  ).toBeVisible()
})

test('an unknown game id falls back to the menu', async ({ page }) => {
  await page.goto('/#/game/not-a-real-game')
  await expect(page.getByText(/There's no game called/)).toBeVisible()
})
