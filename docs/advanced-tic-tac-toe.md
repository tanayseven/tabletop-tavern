# Advanced Tic Tac Toe — Implementation Plan

Status: **planned** (nothing built yet; the menu button exists but is a
placeholder).

## Goal

The second real game in the menu, behind the "Advanced Tic Tac Toe" button:
the variant usually called Ultimate Tic Tac Toe, played on nine small Tic
Tac Toe boards arranged in a 3x3 grid. Like Tic Tac Toe, it is played with
the mouse, either hot-seat against another local player or against a
computer opponent of a chosen difficulty. No networking, no persistent
score across rounds — each match starts from a fresh setup.

This game exists partly on its own merits and partly as proof: Tic Tac Toe
was built as the template every other game would follow, and a second game
that reuses its setup flow, its difficulty vocabulary and its screen
structure is how we find out whether that template actually holds.

## Scope

In scope:

- A choice of Player vs Player (local hot-seat) or Player vs Computer
  before each match, identical to Tic Tac Toe's.
- Four computer difficulty levels — see "Computer difficulty" below.
- A coin toss to decide who goes first, and a choice of mark (X or O) for
  whoever wins it.
- Nine small 3x3 boards in a 3x3 arrangement, with the rule that the cell
  you play inside a small board decides which small board your opponent
  must play in next.
- Clear, always-visible signalling of which small board may be played in,
  who owns each finished small board, and where the last move was made.
- Detect a match win (three small boards owned in a row, column or
  diagonal) or a draw (every small board decided with no such line).
- Status line showing whose turn it is _and where they must play_, or the
  result.
- A running count of small boards won by each side, shown for interest.
- "Play Again" (reset to a fresh match, keeping the same setup) and "Back
  to Menu" buttons once the match ends.
- Automated tests for the match rules and the computer's move selection at
  every difficulty.

Out of scope (later, if at all):

- A rules primer or tutorial screen — see "Open questions".
- Undo, move history, or replaying a finished match.
- Score tracking that survives leaving the game.
- Animations/sound.

## Flow

Identical to Tic Tac Toe, and deliberately so — a player who has played one
should not have to learn a second set of pre-game screens. Clicking the
"Advanced Tic Tac Toe" button starts this sequence:

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
than replayed). Clicking "Back to Menu" (available once the match has
ended) returns to the menu; starting Advanced Tic Tac Toe again from the
menu always begins this sequence from the top.

## Computer difficulty

Four levels, using the same names as Tic Tac Toe so the difficulty screen
reads the same, but describing genuinely different opponents — this board
is far too large to solve outright.

- **Very Easy** — moves completely at random among the moves available to
  it.
- **Easy** — takes a move that wins the match when one is available, takes
  a small board when it can, blocks the opponent from taking one when it
  must, and otherwise moves at random. It pays no attention to where it
  sends its opponent.
- **Medium** — everything Easy does, plus positional judgement: it prefers
  the centre board and centre cells, values boards that build towards a
  line of three, and — the part that makes it feel like this game rather
  than nine unrelated ones — it avoids handing the opponent a free choice
  of board, and avoids sending them somewhere they have an immediate win.
- **Hard** — looks several moves ahead and judges the resulting positions,
  weighing both the small boards and the overall line of three. It is a
  strong opponent that will punish an obvious mistake.

An honest note, because the Tic Tac Toe document promises something
different: Tic Tac Toe's Hard plays _perfectly_ and cannot be beaten. That
is possible there because the whole game can be examined to the end. Here
it is not — the number of positions is astronomically larger — so Hard
looks only a few moves ahead. It is strong, but it is beatable, and the
difficulty screen's wording should not claim otherwise.

## Game rules

The board:

- The playing area is a 3x3 grid of nine **small boards**, each itself a
  3x3 grid of nine cells — 81 cells in total.
- Every cell belongs to exactly one small board, and sits at one of nine
  positions within it. Both of those positions matter: the small board says
  where the move happens, the position within it says where the opponent
  must play next.

Placing a mark:

- Turns alternate, starting from whichever mark the coin-toss winner chose
  (see Flow above) — not always X.
- Clicking an empty cell in a playable small board places the current
  player's mark there and passes the turn. Clicks anywhere else are
  ignored: a cell that is already marked, a cell in a small board that
  isn't playable this turn, or any cell at all once the match has ended.
- The very first move of a match may be played anywhere.

Where the next move must go — the rule this whole game turns on:

- The **position within the small board** of the move just played names the
  small board the opponent must play in next. Playing in the top-left cell
  of any small board sends the opponent to the top-left small board;
  playing in the centre cell of any small board sends them to the centre
  small board, and so on.
- A worked example: X plays the bottom-right cell of the centre board. O
  must now play somewhere in the bottom-right board. If O then plays the
  middle-left cell of that board, X must play in the middle-left board.

Finished small boards, and the free move:

- A small board is **won** when a player gets three of their marks in a
  row, column or diagonal within it. That player owns it.
- A small board that fills up with no such line is **drawn**. It belongs to
  nobody, and can never be claimed afterwards.
- A small board that is won or drawn is **decided**, and accepts no further
  moves. Its existing marks stay visible.
- If the small board a player is sent to is already decided, that player
  gets a **free move**: they may play in any undecided small board.
- This includes the case where the move that decides a board is the very
  move that would have sent the opponent there. If X wins the bottom-right
  board by playing its bottom-right cell, the opponent is being sent to a
  board that just became decided — so they get a free move. The same
  applies if that move fills the board to a draw.

Winning the match:

- A player wins the match by owning three small boards in a row, column or
  diagonal of the 3x3 arrangement — the same eight lines as ordinary Tic
  Tac Toe, one level up.
- The match is won the moment that line is completed. It does not require
  every small board to be decided first, so a win on the move that decides
  the last remaining board counts as a win, not a draw.
- If every small board is decided and neither player owns such a line, the
  match is a draw — regardless of how many small boards each side won. The
  count of boards won is shown on screen because it is interesting, but it
  never decides the match. Four boards to three with no line is a draw.
- There is no way for the match to get stuck. Whenever any small board is
  still undecided there is a legal move available, because being sent to a
  decided board always turns into a free move.

What the screen always shows:

- A status line reflecting the current state: whose turn it is **and where
  they must play** while the match is in progress ("play in the centre
  board", or "play in any board" after a free move), or the result once it
  ends.
- Which small board may be played in, distinguished clearly from the ones
  that may not.
- Who owns each decided small board, and which ones were drawn.
- Where the last move was played — easy to lose on a board this size, and
  it is the thing that explains the current restriction.
- The three small boards forming the winning line, once there is one.
- Once the match ends, two options: start a new match on a cleared board
  (keeping the same mode, difficulty, and starting mark), or return to the
  menu.

## Menu integration

"Advanced Tic Tac Toe" is currently a placeholder, like eight of the other
nine entries: its button shows a grayed-out "Coming soon" label and does
nothing. It becomes the second exception after Tic Tac Toe, leading into an
actual game instead of that label. Nothing about the menu's overall look or
the remaining eight placeholders changes, and the menu keeps ten entries in
the same order.

## Layout notes

The playing area stays the same size and shape as the Tic Tac Toe board —
square, centred, capped at the same maximum, shrinking with the window in
the same way. Nine times as many cells in the same space makes each one
small, and that is accepted deliberately rather than solved by making this
game's board larger than the other's: one sizing rule across both games is
easier to reason about, and the board is still comfortably clickable at the
smallest window the app supports.

Two levels of grid lines are needed, weighted differently, so the area
reads as nine boards rather than as one grid of eighty-one cells. The
division into small boards must be obvious at a glance, because every rule
in this game depends on seeing it.

Everything the Tic Tac Toe board learned about resizing applies here and
applies twice over, once at each level: all 81 cells stay visible, equally
sized, and non-overlapping across the whole range of window sizes the app
supports, and none of them changes size when a mark lands in it or when the
end-of-match buttons appear. The signalling described under "Game rules"
must not depend on hovering — it has to be visible on a touch screen — and
must not depend on colour alone, so ownership of a small board is shown by
a mark as well as a tint.

Marks stay legible in both the light and dark palettes, and the game brings
in no new colours of its own.

## Testing

The match rules and the computer's move selection are the two pieces of
real logic here, and both should be covered by automated tests independent
of the on-screen game. The interactive wiring is thin by comparison, but
this game has one piece of it — which cells are playable right now — that
is genuinely easy to get wrong and invisible to a rules test, so it gets
coverage too. The cases below should all be verified, whether by an
automated test or by hand.

### Where the next move must go

- The position within a small board of the move just played names the small
  board for the next move, for all nine positions.
- A player sent to a small board that is already won gets a free move.
- A player sent to a small board that is already full and drawn gets a free
  move.
- A move that wins (or fills) the very small board it would have sent the
  opponent to grants a free move.
- On a free move, every undecided small board is playable and every decided
  one is not.
- The first move of a match may be played anywhere.

### Small boards

- Each of the 8 winning lines within a small board is detected as a win for
  whichever player holds all three cells.
- A small board is won the moment its line completes, without needing to be
  full.
- A small board that fills with no line is drawn, is owned by nobody, and
  stays that way.
- A decided small board accepts no further moves, whether won or drawn.

### Winning the match

- Each of the 8 winning lines of small boards is detected as a match win.
- A match win is detected the moment the line completes, without every
  small board being decided.
- A match win on the move that decides the final small board is a win, not
  a draw.
- Every small board decided with no line is a draw, including when one side
  owns more boards than the other.
- It is never possible to reach a position with no legal move while the
  match is still in progress.

### Turn order and input handling

- Whichever mark won the coin toss moves first in a fresh match.
- Turns strictly alternate — a player cannot move twice in a row.
- Clicking a marked cell does nothing: no overwrite, no turn consumed.
- Clicking a cell in a small board that isn't playable this turn does
  nothing.
- Clicking any cell after the match has ended does nothing, and repeated
  clicking does not change the result or corrupt the status line.
- In Player vs Computer, clicks are only accepted on the human's turn; the
  computer moves automatically once it is its turn.

### The computer opponent

- Every difficulty only ever returns a move that is legal in the current
  position — both when forced to a particular small board and when given a
  free move.
- Easy and above take a match win when one is available, take a small board
  when they can, and block the opponent from taking one when they must; a
  match-winning move is preferred over an ordinary board win.
- Medium prefers the centre board and centre cells among otherwise equal
  moves, avoids handing the opponent a free move, and avoids sending the
  opponent somewhere they have an immediate win.
- Hard is deterministic: the same position always produces the same move,
  and it takes a match win in one and blocks an immediate loss.
- Hard's thinking is bounded, so its reply always arrives promptly rather
  than freezing the screen — and bounded in a way that does not depend on
  how fast the machine is, so it behaves identically everywhere.
- A match between any two difficulties always reaches a legal finish within
  81 moves. This is the single most valuable test: it is what catches an
  opponent that returns an illegal move, a position where the playable
  board never advances, or any other way the game could hang.
- Hard beats or draws Very Easy in the overwhelming majority of matches.
  Not "Hard never loses" — that would be untrue of an opponent that only
  looks a few moves ahead.

### Status line and score

- While the match is in progress, the status line names the player whose
  turn it is and where they must play, and updates immediately after each
  move.
- The status line distinguishes being sent to a particular small board from
  having a free choice of board.
- Once a player wins, the status line names the winner and no longer
  mentions whose turn it is.
- A draw is announced distinctly from a win.
- The count of small boards won by each side is correct throughout, and is
  never presented as deciding the match.

### Screen reader and keyboard

- Each cell announces both which small board it is in and its position
  within that board, plus whether it is empty or marked — the position
  alone is ambiguous across 81 cells, and the mark alone says nothing about
  where it is.
- Each small board announces its position and its state: playable, won by
  whom, drawn, or how many cells are free.
- The end-of-match buttons are out of the keyboard order entirely while the
  match is in progress, rather than merely invisible.

### Layout/resizing

- All 81 cells remain visible, equally sized, and non-overlapping across
  the range of window sizes the app supports.
- No cell changes size when a mark is placed in it, and the board does not
  move when the end-of-match buttons appear.
- At the smallest supported window the board stays square and the screen
  does not scroll sideways.

## Open questions

1. Should there be a short rules-primer screen between choosing a mark and
   playing? This game is much less self-explanatory than Tic Tac Toe, and a
   player who has never met it will not guess the send-your-opponent rule
   from the board alone. Assumed **no** for now — the status line naming
   where to play next, plus the highlighting of the playable board, may
   teach it well enough in a move or two. Worth revisiting after playing
   it.
2. Should a player be able to abandon a match and return to the menu before
   it ends? Assumed **no**, matching Tic Tac Toe — but the case is weaker
   here, because a match of this game is several times longer, and being
   trapped in one is a more real complaint than it was there.
3. Is a plain draw the right outcome when every board is decided with no
   line? Resolved: **yes** — board counts are shown but never decide the
   match. Anything else would stop the arrangement of nine boards being a
   Tic Tac Toe board, and would push the computer towards collecting boards
   instead of building a line, which is a different game.
4. Should a decided small board keep showing the marks that were played in
   it, or collapse to just the owner's mark? Assumed **keep them** — they
   are the history of how the board was won, and collapsing them would also
   make the area change shape mid-match. Revisit if it proves too busy to
   read at small sizes.
