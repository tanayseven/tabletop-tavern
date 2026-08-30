use rand::Rng;
use rand::seq::IndexedRandom;

use super::board::{Board, Player, Status};
use super::setup::Difficulty;

fn empty_cells(board: &Board) -> Vec<usize> {
    (0..9).filter(|&i| board.cell(i).is_none()).collect()
}

/// A move that would complete one of `mark`'s winning lines right now, if any.
fn winning_move(board: &Board, mark: Player) -> Option<usize> {
    empty_cells(board).into_iter().find(|&index| {
        let mut trial = *board;
        trial.place(index, mark);
        trial.status() == Status::Won(mark)
    })
}

const CENTER: usize = 4;
const CORNERS: [usize; 4] = [0, 2, 6, 8];
const SIDES: [usize; 4] = [1, 3, 5, 7];
const OPPOSITE_CORNER: [(usize, usize); 4] = [(0, 8), (2, 6), (6, 2), (8, 0)];

fn medium_move(board: &Board, mark: Player, rng: &mut impl Rng) -> usize {
    if let Some(index) = winning_move(board, mark) {
        return index;
    }
    if let Some(index) = winning_move(board, mark.other()) {
        return index;
    }
    if board.cell(CENTER).is_none() {
        return CENTER;
    }
    let opposite_corners: Vec<usize> = OPPOSITE_CORNER
        .into_iter()
        .filter(|&(occupied, opposite)| {
            board.cell(occupied) == Some(mark.other()) && board.cell(opposite).is_none()
        })
        .map(|(_, opposite)| opposite)
        .collect();
    if let Some(&index) = opposite_corners.choose(rng) {
        return index;
    }
    let empty_corners: Vec<usize> = CORNERS
        .into_iter()
        .filter(|&i| board.cell(i).is_none())
        .collect();
    if let Some(&index) = empty_corners.choose(rng) {
        return index;
    }
    let empty_sides: Vec<usize> = SIDES
        .into_iter()
        .filter(|&i| board.cell(i).is_none())
        .collect();
    if let Some(&index) = empty_sides.choose(rng) {
        return index;
    }
    // Board is full; caller is expected not to ask for a move here.
    empty_cells(board)[0]
}

/// Score `board` from `mark`'s perspective, assuming both sides play optimally from here on:
/// positive favors `mark`, negative favors its opponent. `depth` biases toward faster wins and
/// slower losses so the AI doesn't stall a forced win or rush into a forced loss.
fn minimax(board: &Board, mark: Player, maximizing_for: Player, depth: i32) -> i32 {
    match board.status() {
        Status::Won(winner) if winner == maximizing_for => 10 - depth,
        Status::Won(_) => depth - 10,
        Status::Draw => 0,
        Status::InProgress => {
            let scores = empty_cells(board).into_iter().map(|index| {
                let mut trial = *board;
                trial.place(index, mark);
                minimax(&trial, mark.other(), maximizing_for, depth + 1)
            });
            if mark == maximizing_for {
                scores.max().unwrap()
            } else {
                scores.min().unwrap()
            }
        }
    }
}

fn hard_move(board: &Board, mark: Player, rng: &mut impl Rng) -> usize {
    let scored: Vec<(usize, i32)> = empty_cells(board)
        .into_iter()
        .map(|index| {
            let mut trial = *board;
            trial.place(index, mark);
            (index, minimax(&trial, mark.other(), mark, 1))
        })
        .collect();
    let best_score = scored.iter().map(|&(_, score)| score).max().unwrap();
    let best_moves: Vec<usize> = scored
        .into_iter()
        .filter(|&(_, score)| score == best_score)
        .map(|(index, _)| index)
        .collect();
    *best_moves.choose(rng).unwrap()
}

/// Picks `mark`'s next move on `board` at the given `difficulty`. Panics if the board has no
/// empty cells or the round has already ended — callers are expected to check
/// `Status::InProgress` first, same as `Board::place`'s own precondition.
pub fn choose_move(board: &Board, mark: Player, difficulty: Difficulty) -> usize {
    let mut rng = rand::rng();
    match difficulty {
        Difficulty::VeryEasy => *empty_cells(board).choose(&mut rng).unwrap(),
        Difficulty::Easy => winning_move(board, mark)
            .or_else(|| winning_move(board, mark.other()))
            .unwrap_or_else(|| *empty_cells(board).choose(&mut rng).unwrap()),
        Difficulty::Medium => medium_move(board, mark, &mut rng),
        Difficulty::Hard => hard_move(board, mark, &mut rng),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn board_from(moves: &[(usize, Player)]) -> Board {
        let mut board = Board::default();
        for &(index, player) in moves {
            board.place(index, player);
        }
        board
    }

    #[test]
    fn easy_takes_an_available_win() {
        // X X . / O O . / . . .  -- X can win at 2.
        let board = board_from(&[
            (0, Player::X),
            (3, Player::O),
            (1, Player::X),
            (4, Player::O),
        ]);
        assert_eq!(choose_move(&board, Player::X, Difficulty::Easy), 2);
    }

    #[test]
    fn easy_blocks_an_immediate_opponent_win() {
        // X X . / O . . / . . .  -- O must block at 2.
        let board = board_from(&[(0, Player::X), (3, Player::O), (1, Player::X)]);
        assert_eq!(choose_move(&board, Player::O, Difficulty::Easy), 2);
    }

    #[test]
    fn medium_prefers_center_on_an_empty_board() {
        let board = Board::default();
        assert_eq!(choose_move(&board, Player::X, Difficulty::Medium), CENTER);
    }

    #[test]
    fn medium_takes_the_opposite_corner_when_center_is_taken() {
        // O holds corner 0, X holds center; the classic reply is the opposite corner, 8.
        let board = board_from(&[(0, Player::O), (CENTER, Player::X)]);
        assert_eq!(choose_move(&board, Player::X, Difficulty::Medium), 8);
    }

    #[test]
    fn medium_still_takes_an_available_win_over_positional_play() {
        let board = board_from(&[
            (0, Player::X),
            (3, Player::O),
            (1, Player::X),
            (4, Player::O),
        ]);
        assert_eq!(choose_move(&board, Player::X, Difficulty::Medium), 2);
    }

    #[test]
    fn hard_blocks_a_forced_loss() {
        // X holds the 0/8 diagonal corners, but O sits on the center (4), so that diagonal is
        // already dead and X has no threat of its own. O has two in a row at 3,4 and must be
        // blocked at 5.
        let board = board_from(&[
            (0, Player::X),
            (3, Player::O),
            (8, Player::X),
            (4, Player::O),
        ]);
        assert_eq!(choose_move(&board, Player::X, Difficulty::Hard), 5);
    }

    #[test]
    fn hard_takes_an_available_win() {
        let board = board_from(&[
            (0, Player::X),
            (3, Player::O),
            (1, Player::X),
            (4, Player::O),
        ]);
        assert_eq!(choose_move(&board, Player::X, Difficulty::Hard), 2);
    }

    #[test]
    fn hard_vs_hard_always_draws() {
        let mut board = Board::default();
        while board.status() == Status::InProgress {
            let mark = board.current_player();
            let index = choose_move(&board, mark, Difficulty::Hard);
            assert!(board.place(index, mark));
        }
        assert_eq!(board.status(), Status::Draw);
    }
}
