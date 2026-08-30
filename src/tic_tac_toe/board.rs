#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Player {
    X,
    O,
}

impl Player {
    pub fn other(self) -> Player {
        match self {
            Player::X => Player::O,
            Player::O => Player::X,
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Player::X => "X",
            Player::O => "O",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Status {
    InProgress,
    Won(Player),
    Draw,
}

const WINNING_LINES: [[usize; 3]; 8] = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
];

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Board {
    cells: [Option<Player>; 9],
    starting_player: Player,
}

impl Default for Board {
    fn default() -> Self {
        Board::starting_with(Player::X)
    }
}

impl Board {
    /// A fresh, empty board where `starting_player` moves first.
    pub fn starting_with(starting_player: Player) -> Self {
        Board {
            cells: [None; 9],
            starting_player,
        }
    }

    pub fn cell(&self, index: usize) -> Option<Player> {
        self.cells[index]
    }

    /// Places `player`'s mark at `index`. Returns `false` (no-op) if the cell is already
    /// occupied or the round has already ended.
    pub fn place(&mut self, index: usize, player: Player) -> bool {
        if self.status() != Status::InProgress || self.cells[index].is_some() {
            return false;
        }
        self.cells[index] = Some(player);
        true
    }

    pub fn status(&self) -> Status {
        for line in WINNING_LINES {
            let marks = line.map(|i| self.cells[i]);
            if let [Some(a), Some(b), Some(c)] = marks
                && a == b
                && b == c
            {
                return Status::Won(a);
            }
        }
        if self.cells.iter().all(Option::is_some) {
            Status::Draw
        } else {
            Status::InProgress
        }
    }

    /// Whose turn it is, derived from mark counts (the board's `starting_player` moves first,
    /// turns strictly alternate) rather than stored separately, so it can never desync from the
    /// board. Meaningless once the round has ended.
    pub fn current_player(&self) -> Player {
        let x_count = self.cells.iter().filter(|c| **c == Some(Player::X)).count();
        let o_count = self.cells.iter().filter(|c| **c == Some(Player::O)).count();
        if x_count == o_count {
            self.starting_player
        } else {
            self.starting_player.other()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_board_is_in_progress() {
        assert_eq!(Board::default().status(), Status::InProgress);
    }

    #[test]
    fn x_moves_first_by_default() {
        assert_eq!(Board::default().current_player(), Player::X);
    }

    #[test]
    fn turns_alternate_after_each_placement() {
        let mut board = Board::default();
        assert_eq!(board.current_player(), Player::X);
        board.place(0, Player::X);
        assert_eq!(board.current_player(), Player::O);
        board.place(1, Player::O);
        assert_eq!(board.current_player(), Player::X);
    }

    #[test]
    fn placing_on_occupied_cell_is_a_no_op() {
        let mut board = Board::default();
        board.place(0, Player::X);
        let placed = board.place(0, Player::O);
        assert!(!placed);
        assert_eq!(board.cell(0), Some(Player::X));
        assert_eq!(board.current_player(), Player::O);
    }

    #[test]
    fn o_can_start_when_board_is_built_starting_with_o() {
        let mut board = Board::starting_with(Player::O);
        assert_eq!(board.current_player(), Player::O);
        board.place(0, Player::O);
        assert_eq!(board.current_player(), Player::X);
        board.place(1, Player::X);
        assert_eq!(board.current_player(), Player::O);
    }

    fn assert_line_wins_for(line: [usize; 3], winner: Player) {
        let loser = winner.other();
        let mut board = Board::default();
        // Fill the winning line with `winner`'s mark and scatter `loser`'s marks
        // elsewhere, alternating turns correctly (winner moves first here).
        let others: Vec<usize> = (0..9).filter(|i| !line.contains(i)).collect();
        for (i, &cell) in line.iter().enumerate() {
            board.place(cell, winner);
            if i < line.len() - 1 {
                board.place(others[i], loser);
            }
        }
        assert_eq!(board.status(), Status::Won(winner));
    }

    #[test]
    fn win_row_0() {
        assert_line_wins_for([0, 1, 2], Player::X);
    }

    #[test]
    fn win_row_1() {
        assert_line_wins_for([3, 4, 5], Player::O);
    }

    #[test]
    fn win_row_2() {
        assert_line_wins_for([6, 7, 8], Player::X);
    }

    #[test]
    fn win_col_0() {
        assert_line_wins_for([0, 3, 6], Player::O);
    }

    #[test]
    fn win_col_1() {
        assert_line_wins_for([1, 4, 7], Player::X);
    }

    #[test]
    fn win_col_2() {
        assert_line_wins_for([2, 5, 8], Player::O);
    }

    #[test]
    fn win_diagonal_main() {
        assert_line_wins_for([0, 4, 8], Player::X);
    }

    #[test]
    fn win_diagonal_anti() {
        assert_line_wins_for([2, 4, 6], Player::O);
    }

    #[test]
    fn win_detected_before_board_full() {
        let mut board = Board::default();
        board.place(0, Player::X); // X
        board.place(3, Player::O); // O
        board.place(1, Player::X); // X
        board.place(4, Player::O); // O
        board.place(2, Player::X); // X completes top row, 4 cells still empty
        assert_eq!(board.status(), Status::Won(Player::X));
    }

    #[test]
    fn win_on_last_move_is_a_win_not_a_draw() {
        // Board layout (X wins the main diagonal on the final move):
        // X O O
        // O X X
        // X O X
        let mut board = Board::default();
        let moves = [
            (0, Player::X),
            (1, Player::O),
            (4, Player::X),
            (2, Player::O),
            (5, Player::X),
            (3, Player::O),
            (6, Player::X),
            (7, Player::O),
            (8, Player::X), // completes the main diagonal on the 9th move
        ];
        for (index, player) in moves {
            assert!(board.place(index, player));
        }
        assert_eq!(board.status(), Status::Won(Player::X));
    }

    #[test]
    fn full_board_with_no_line_is_a_draw() {
        // X O X
        // X O O
        // O X X
        let mut board = Board::default();
        let moves = [
            (0, Player::X),
            (1, Player::O),
            (2, Player::X),
            (4, Player::O),
            (3, Player::X),
            (5, Player::O),
            (7, Player::X),
            (6, Player::O),
            (8, Player::O), // no line for either player
        ];
        for (index, player) in moves {
            board.place(index, player);
        }
        assert_eq!(board.status(), Status::Draw);
    }

    #[test]
    fn moves_after_round_end_are_rejected() {
        let mut board = Board::default();
        board.place(0, Player::X);
        board.place(3, Player::O);
        board.place(1, Player::X);
        board.place(4, Player::O);
        board.place(2, Player::X); // X wins
        let status_after_win = board.status();
        let placed = board.place(5, Player::O);
        assert!(!placed);
        assert_eq!(board.status(), status_after_win);
    }
}
