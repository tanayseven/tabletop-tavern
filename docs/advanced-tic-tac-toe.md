# Advanced Tic Tac Toe — Implementation Plan

Status: **implemented** (core game, computer opponent, and the shared pre-game
setup flow).

## Goal

The second real game in the menu, and the first that isn't a straight port of
something the Bevy build already had. "Advanced Tic Tac Toe" is Ultimate Tic
Tac Toe: nine small Tic Tac Toe boards arranged in a 3x3 grid of their own,
where the cell you play dictates which board your opponent has to play in. As
with Tic Tac Toe: no networking, no persistence, each match set up fresh.

## The rules

- The board is a 3x3 arrangement of nine small boards, each itself a 3x3 grid.
  Call the arrangement the **meta-grid** and its nine squares **small boards**.
- The opening move may go in any cell of any small board.
- **After that, the cell just played names the small board the opponent must
  play in.** Play the top-right cell of any board and your opponent must answer
  somewhere in the top-right board. This is the whole game: you are choosing
  your opponent's next board as much as your own move.
- Winning three in a row inside a small board **claims** that board — it becomes
  yours on the meta-grid and is closed to further play.
- A small board that fills up without a winner is **drawn**: also closed, but
  claimed by nobody, and it can never form part of a winning meta-line.
- If you are sent to a board that is already claimed or drawn, you get a **free
  choice** — play anywhere that is still open.
- Claiming three small boards in a row, column, or diagonal on the meta-grid
  wins the match.
- If every small board is closed and no player holds a meta-line, the match is a
  draw.

## Scope

In scope:

- The same pre-game setup as Tic Tac Toe — mode, difficulty, coin toss, mark —
  reusing it rather than restating it.
- Four computer difficulty levels; see below.
- Click a cell to play it, but only in a board you are allowed to play in.
- The board you must play in is visibly distinguished from the ones you can't,
  and the status line says which it is in words.
- Claimed small boards show the mark that claimed them, drawn over the board.
- Status line showing whose turn it is and where they must play, or the result.
- A session scoreboard counting rounds and wins per side, as Tic Tac Toe has.
- "Play Again" and "Back to Menu" once the match ends.
- Automated tests for the rules and the computer's move selection.

Out of scope (later, if at all):

- Scores persisted across visits.
- Animations or sound.
- A "highlight the cell that sends them to a dead board" teaching aid.

## Flow

Identical to Tic Tac Toe, and deliberately so — the same four setup screens in
the same order, each with a Back button that steps to the one before it:

1. **Choose a mode** — Player vs Player, or Player vs Computer.
2. **Choose a difficulty** (Player vs Computer only).
3. **Coin toss** — the human calls; the winner goes first.
4. **Choose a mark** — the toss winner picks X or O. Skipped when the computer
   wins the toss; it picks for itself.
5. **Play** — the match itself.

Stepping back from the coin toss or the mark choice un-does the toss, so it is
re-flipped rather than replayed. As in Tic Tac Toe, there is no way back to the
menu mid-match; the way out is to finish the match.

## Computer difficulty

The plain game's Hard plays perfectly, because 3x3 Tic Tac Toe is small enough
to solve outright. This one is not — the opening position alone has 81 legal
moves and matches run past fifty — so the ladder is described honestly:

- **Very Easy** — moves completely at random.
- **Easy** — claims a small board when it can and blocks the opponent from
  claiming one, but pays no attention to the meta-grid or to where it sends
  you.
- **Medium** — plays for the meta-grid and looks one move ahead, so it won't
  hand you an immediate reply, but it misses anything deeper.
- **Hard** — searches several moves ahead, values the centre and corner boards
  above the edges, and avoids handing you a free choice of board. It is strong,
  not perfect: it can be beaten.

The search is bounded by how many positions it examines rather than by a clock,
so the computer plays the same way on a slow phone as on a fast desktop, and
plays the same way twice given the same position.

## Layout notes

Eighty-one cells have to stay legible and tappable on a phone, which drives
most of the visual design:

- The whole thing is one square that scales with the smaller viewport
  dimension, exactly as the plain board does, so it survives a phone held
  sideways.
- Small boards you cannot play in are dimmed; the ones you can are at full
  strength and outlined. This is the main way a player reads where they are,
  and it is always visible rather than depending on hover — the same reasoning
  that keeps the menu's "Coming soon" label always visible.
- A claimed board keeps its cells visible underneath the large mark drawn over
  it, so the history of the match stays readable.
- The status line repeats the constraint in words ("Play in the centre board"),
  because colour and dimming alone are not enough for a player who can't rely
  on them.
- Every cell names its board, row, column and contents to a screen reader —
  "centre board, row 2, column 3: empty" — since position alone carries all the
  meaning here.

## Testing

The rules and the computer are both plain logic and both get automated tests.
The cases below should all be verified, whether by automated test or by hand.

### Small boards

- A small board is won by three in a row, column, or either diagonal.
- A win on the last free cell of a small board counts as a win, not a draw.
- A full small board with no line is drawn, and a drawn board is claimed by
  nobody.

### The active board

- The opening move may go anywhere: every cell of every board is legal.
- After a move, the only legal moves are in the board named by the cell just
  played.
- Being sent to a claimed board, or to a full one, opens up a free choice of
  every board still in play.
- A free choice never includes a board that is already closed.
- A move outside the board you were sent to is rejected and does not consume a
  turn.
- A move onto an occupied cell is rejected and does not consume a turn.

### The match

- Turns strictly alternate, starting from whichever mark won the coin toss.
- The match is won the moment three claimed boards line up on the meta-grid.
- Three boards in a line where the middle one is _drawn_ is not a win.
- The match is a draw when every small board is closed and nobody holds a
  meta-line.
- Once the match is decided, no further moves are accepted.

### The computer

- Every difficulty returns a legal move, including when confined to one board.
- Every difficulty can play a whole match to a finish without stalling.
- Easy claims a small board when one is available, and blocks one when it isn't.
- Hard takes a small board that wins it the match.
- Hard declines a move that would send the opponent to a board they win the
  match in, when a safe move exists.
- Hard beats the random opponent.

### Status line and reset

- While the match runs, the status line names the player to move and the board
  they must play in, or says the choice is free.
- Once the match ends, the status line names the winner or reports the draw,
  and stops mentioning turns or boards.
- "Play Again" clears all nine boards and restarts from the same starting mark,
  keeping the mode and difficulty; the session scoreboard carries over.

## Open questions

1. Should a drawn small board count for the player who holds the most cells in
   it? Some rule sets do. Assumed not — a draw claims nothing, which is the
   more common rule and the simpler one to explain on screen.
2. Should the cell you are about to play preview which board it would send the
   opponent to? It would help a new player enormously and might make the game
   too easy. Left out for now.
3. Hard is beatable, unlike the plain game's Hard. Whether that gap wants
   closing — with a longer search, or an opening book — is left open until
   somebody complains it's too weak.
