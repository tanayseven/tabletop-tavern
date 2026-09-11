# Tic Tac Toe — Implementation Plan

Status: **implemented** (core game, computer opponent, and pre-game setup
flow).

## Goal

The first real game behind the "Tic Tac Toe" menu button: a 3x3 Tic Tac Toe
match, played with the mouse, either hot-seat against another local player
or against a computer opponent of a chosen difficulty. No networking, no
persistent score across rounds — each round starts from a fresh setup.

## Scope

In scope:

- A choice of Player vs Player (local hot-seat) or Player vs Computer before
  each match.
- Four computer difficulty levels — see "Computer difficulty" below.
- A coin toss to decide who goes first, and a choice of mark (X or O) for
  whoever wins it.
- Standard 3x3 board, alternating turns starting from whichever mark won the
  toss.
- Click an empty cell to place the current player's mark.
- Detect win (3 in a row/column/diagonal) or draw (board full, no winner).
- Status line showing whose turn it is, or the result.
- "Play Again" (reset the board, keeping the same setup) and "Back to Menu"
  buttons once the round ends.
- Automated tests for the win/draw detection logic and the computer's move
  selection at every difficulty.

Out of scope (later, if at all):

- Score tracking across multiple rounds.
- Animations/sound.
- Any game other than Tic Tac Toe — this is the template the others will
  follow once it's proven out.

## Flow

The app gains a short sequence of screens reachable only from the menu.
Clicking the "Tic Tac Toe" button starts this sequence:

1. **Choose a mode** — Player vs Player, or Player vs Computer.
2. **Choose a difficulty** (Player vs Computer only) — see below.
3. **Coin toss** — Player 1 (the human) calls heads or tails; the flip
   decides who goes first: the caller if they called it right, otherwise
   the other side (Player 2, or the computer).
4. **Choose a mark** — whoever won the toss picks X or O, and moves first
   playing that mark. If the computer wins the toss, it picks its own mark
   automatically and this screen is skipped.
5. **Play** — the match itself.

Each of the four setup screens has its own "Back" button, returning to
whichever screen precedes it in the sequence above (stepping back from Coin
Toss or Symbol Choice also un-does the coin toss, so it's re-flipped rather
than replayed). Clicking "Back to Menu" (available once the round has
ended) returns to the menu; starting Tic Tac Toe again from the menu always
begins this sequence from the top. This mirrors how the app already moves
from the splash screen into the menu — entering a screen builds it, leaving
it tears it down.

## Computer difficulty

Four levels, from least to most challenging:

- **Very Easy** — moves completely at random.
- **Easy** — takes a winning move when one is available, blocks an
  immediate loss when it must, otherwise moves at random.
- **Medium** — plays solid positional strategy (favoring the center, then
  opposite corners, then other corners) on top of the same win/block
  awareness as Easy, but doesn't look far enough ahead to catch every
  double-threat setup — a player who spots one can still beat it.
- **Hard** — plays perfectly. It never loses; the best a player can do
  against it is force a draw.

## Game rules

- The board is a 3x3 grid of empty cells.
- Turns alternate, starting from whichever mark the coin-toss winner chose
  (see Flow above) — not always X.
- Clicking an empty cell places the current player's mark there and passes
  the turn, but only while the round is still in progress — clicks are
  ignored once a winner is decided or the board is full.
- A win is three of the same mark in a row, column, or either diagonal (8
  possible winning lines total).
- If the board fills up with no winning line, the round is a draw.
- A status line always reflects the current state: whose turn it is while
  the round is in progress, or the result once it ends.
- Once the round ends, two options appear: start a new round on a cleared
  board (keeping the same mode, difficulty, and starting mark), or return to
  the menu.

## Menu integration

Today every game in the menu is a placeholder — every button just shows a
grayed-out "Coming soon" label, regardless of which game it is. Tic Tac Toe
becomes the first exception: its button leads into an actual game instead of
that label, while every other game keeps behaving exactly as it does now.
Nothing about the menu's overall look or the other nine games changes.

## Layout notes

The board and its surrounding screen should reuse the same resize-friendly
approach already proven out on the menu screen: content stays centered and
usable as the window is resized, rows of cells are laid out in a way that
avoids the overlap issue previously found and fixed in the menu, and cells
shrink together gracefully on narrow windows rather than overlapping or
spilling off-screen.

## Testing

The win/draw detection logic should be covered by automated tests
independent of the on-screen game, since it's the one piece of real game
logic being introduced. No other automated test coverage is planned
initially — everything else is thin interactive wiring around that logic,
best checked by playing it. The cases below should all be verified, whether
by an automated test or by hand.

### Win/draw detection

- An empty board has no result yet — the round is still in progress.
- A board with marks placed but no completed line yet is still in progress,
  not a draw, even if only one empty cell remains.
- Each of the 8 winning lines (3 rows, 3 columns, 2 diagonals) is correctly
  detected as a win for whichever player holds all three cells in that line.
- A win is detected the moment the winning line is completed — it does not
  require the board to be full first. In particular, a win on the very last
  move (a full board that also contains a winning line) counts as a win, not
  a draw.
- A full board with no completed line for either player is a draw.
- It should not be possible for both players to simultaneously hold a
  winning line on the same board (this can't happen with legal alternating
  play, but the detection logic shouldn't misreport it as a win for the
  wrong player, or for both).

### Turn order and input handling

- Whichever mark won the coin toss (see Flow) moves first in a fresh round.
- Turns strictly alternate — a player cannot move twice in a row.
- Clicking an empty cell places the current player's mark and passes the
  turn to the other player.
- Clicking a cell that's already marked does nothing — it does not overwrite
  the existing mark, and does not consume a turn.
- Clicking any cell after the round has ended (win or draw) does nothing —
  the board stops accepting moves.
- Clicking the same already-decided board repeatedly does not change the
  result or corrupt the status line.
- In Player vs Computer, clicks are only accepted on the human's turn; the
  computer's move happens automatically once it's its turn.

### Status line

- While the round is in progress, the status line always names the player
  whose turn it is, and updates immediately after each move.
- Once a player wins, the status line names the winner and no longer
  mentions whose "turn" it is.
- Once the round is a draw, the status line says so, distinctly from a win
  message.

### Round end and reset

- The "Play Again" and "Back to Menu" options are unavailable while the
  round is in progress, and only appear once it ends (win or draw).
- Starting a new round via "Play Again" fully clears every cell, resets the
  status line, and restarts turn order from the same mark that started the
  finished round (the mode, difficulty, and coin-toss outcome aren't
  replayed) — no marks or other state carry over from the finished round.
- Returning to the menu mid-round is not possible in this scope — the only
  way back to the menu is after the round has ended. (Whether that's the
  right restriction long-term is an open question below.)
- Leaving the game via "Back to Menu" and re-entering "Tic Tac Toe" again
  from the menu always starts over from mode selection, regardless of how
  the previous round ended.

### Layout/resizing

- All 9 cells remain visible, distinct, and non-overlapping across the range
  of window sizes the app supports, consistent with how the menu screen
  already behaves when resized.

## Open questions

1. Any visual preference for X/O beyond plain colored text (e.g. drawn
   shapes)? Still assumed to be plain text for simplicity.
2. Resolved: "Play Again" keeps the starting mark chosen during setup for
   that match (no re-toss), rather than always restarting from X.
3. Should a player be able to abandon a round and return to the menu before
   it ends, or is finishing (or drawing) the round required first? Still
   assumes the latter, for simplicity — the Play screen has no way out
   mid-round. The mode, difficulty, coin toss, and symbol choice screens are
   different: each has a "Back" button to the previous setup screen, since
   abandoning _before_ a round starts has no in-progress state to lose.
