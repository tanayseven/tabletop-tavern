use bevy::prelude::*;
use bevy::window::{PrimaryWindow, WindowResized};

use crate::AppState;
use crate::ui::square_button_size;

mod ai;
mod board;
mod setup;

use board::{Board, Player, Status};
use setup::{GameMode, TicTacToeSetup};

pub use setup::TicTacToeSetupPlugin;

const CELL_VMIN: f32 = 20.0;
const CELL_MIN_PX: f32 = 80.0;
const CELL_MAX_PX: f32 = 180.0;
const CELL_MARK_RATIO: f32 = 0.5;
const CELL_GAP_PX: f32 = 12.0;

const X_MARK_COLOR: Color = Color::srgb(0.9, 0.2, 0.2);
const O_MARK_COLOR: Color = Color::srgb(0.2, 0.75, 0.3);

const WIN_LINE_THICKNESS_PX: f32 = 8.0;
const WIN_LINE_COLOR: Color = Color::srgb(0.9, 0.75, 0.2);

const NORMAL_CELL: Color = Color::srgb(0.2, 0.2, 0.25);
const HOVERED_CELL: Color = Color::srgb(0.3, 0.3, 0.4);
const PRESSED_CELL: Color = Color::srgb(0.15, 0.5, 0.25);

const BACK_TO_MENU_BUTTON: Color = Color::srgb(0.2, 0.2, 0.25);
const BACK_TO_MENU_BUTTON_HOVERED: Color = Color::srgb(0.3, 0.3, 0.4);
const BACK_TO_MENU_BUTTON_PRESSED: Color = Color::srgb(0.15, 0.5, 0.25);

const PLAY_AGAIN_BUTTON: Color = Color::srgb(0.15, 0.3, 0.45);
const PLAY_AGAIN_BUTTON_HOVERED: Color = Color::srgb(0.2, 0.4, 0.55);
const PLAY_AGAIN_BUTTON_PRESSED: Color = Color::srgb(0.1, 0.5, 0.6);

pub struct TicTacToePlugin;

impl Plugin for TicTacToePlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(OnEnter(AppState::TicTacToe), spawn_tic_tac_toe)
            .add_systems(
                Update,
                (
                    cell_button_interaction,
                    cell_click,
                    computer_move,
                    record_round_result,
                    render_cells,
                    render_status_text,
                    render_session_score_text,
                    render_round_end_controls,
                    render_win_line,
                    play_again_button_interaction,
                    back_to_menu_button_interaction,
                    resize_cell_labels,
                )
                    .run_if(in_state(AppState::TicTacToe)),
            )
            .add_systems(OnExit(AppState::TicTacToe), despawn_tic_tac_toe);
    }
}

#[derive(Resource, Deref, DerefMut)]
struct GameBoard(Board);

/// Tallies results across every round played in this visit to the Play screen — reset (like
/// [`GameBoard`]) whenever the screen is entered, and persisted across "Play Again" resets since
/// it lives independently of [`GameBoard`].
#[derive(Resource, Default)]
struct TicTacToeSession {
    games_played: u32,
    /// Wins for "Player 1" in PvP, or the human "Player" in PvC.
    first_wins: u32,
    /// Wins for "Player 2" in PvP, or "Computer" in PvC.
    second_wins: u32,
    /// Whether the current round's outcome has already been tallied, so `record_round_result`
    /// (which runs every frame) counts each finished round exactly once.
    round_recorded: bool,
}

impl TicTacToeSession {
    fn first_label(setup: &TicTacToeSetup) -> &'static str {
        match setup.mode {
            Some(GameMode::Pvc(_)) => "Player",
            _ => "Player 1",
        }
    }

    fn second_label(setup: &TicTacToeSetup) -> &'static str {
        match setup.mode {
            Some(GameMode::Pvc(_)) => "Computer",
            _ => "Player 2",
        }
    }

    /// Whether `mark` belongs to the "first" role (`Player`/`Player 1`) for the current setup.
    fn is_first_player(setup: &TicTacToeSetup, mark: Player) -> bool {
        match setup.mode {
            Some(GameMode::Pvc(_)) => setup.computer_symbol != Some(mark),
            _ => setup.player_one_symbol == Some(mark),
        }
    }
}

#[derive(Component)]
struct OnTicTacToeScreen;

#[derive(Component)]
struct CellButton(usize);

#[derive(Component)]
struct CellMarkText;

#[derive(Component)]
struct StatusText;

#[derive(Component)]
struct SessionScoreText;

#[derive(Component)]
struct RoundEndControls;

#[derive(Component)]
struct PlayAgainButton;

#[derive(Component)]
struct BackToMenuButton;

/// The strike-through line drawn across the three winning cells once a round is won.
#[derive(Component)]
struct WinLine;

fn spawn_tic_tac_toe(
    mut commands: Commands,
    setup: Res<TicTacToeSetup>,
    windows: Query<&Window, With<PrimaryWindow>>,
) {
    let starting_player = setup
        .starting_player
        .expect("every setup screen path sets starting_player before reaching AppState::TicTacToe");
    commands.insert_resource(GameBoard(Board::starting_with(starting_player)));
    commands.insert_resource(TicTacToeSession::default());

    let cell_size = windows
        .single()
        .map(|window| square_button_size(window, CELL_VMIN, CELL_MIN_PX, CELL_MAX_PX))
        .unwrap_or(CELL_MIN_PX);
    let mark_font_size = cell_size * CELL_MARK_RATIO;

    commands
        .spawn((
            OnTicTacToeScreen,
            Node {
                width: Val::Percent(100.0),
                height: Val::Percent(100.0),
                flex_direction: FlexDirection::Column,
                align_items: AlignItems::Center,
                justify_content: JustifyContent::Center,
                row_gap: Val::Px(24.0),
                padding: UiRect::all(Val::Px(16.0)),
                ..default()
            },
            BackgroundColor(Color::srgb(0.1, 0.1, 0.12)),
        ))
        .with_children(|parent| {
            parent.spawn((
                StatusText,
                Text::new(""),
                TextFont {
                    font_size: FontSize::Px(28.0),
                    ..default()
                },
                TextColor(Color::WHITE),
            ));

            parent.spawn((
                SessionScoreText,
                Text::new(""),
                TextFont {
                    font_size: FontSize::Px(18.0),
                    ..default()
                },
                TextColor(Color::srgb(0.75, 0.75, 0.75)),
            ));

            parent
                .spawn(Node {
                    flex_direction: FlexDirection::Column,
                    align_items: AlignItems::Center,
                    row_gap: Val::Px(CELL_GAP_PX),
                    ..default()
                })
                .with_children(|grid| {
                    for row in 0..3 {
                        grid.spawn(Node {
                            flex_direction: FlexDirection::Row,
                            justify_content: JustifyContent::Center,
                            column_gap: Val::Px(CELL_GAP_PX),
                            ..default()
                        })
                        .with_children(|row_node| {
                            for col in 0..3 {
                                let index = row * 3 + col;
                                row_node
                                    .spawn((
                                        CellButton(index),
                                        Button,
                                        Node {
                                            width: Val::VMin(CELL_VMIN),
                                            height: Val::VMin(CELL_VMIN),
                                            min_width: Val::Px(CELL_MIN_PX),
                                            min_height: Val::Px(CELL_MIN_PX),
                                            max_width: Val::Px(CELL_MAX_PX),
                                            max_height: Val::Px(CELL_MAX_PX),
                                            justify_content: JustifyContent::Center,
                                            align_items: AlignItems::Center,
                                            ..default()
                                        },
                                        BackgroundColor(NORMAL_CELL),
                                    ))
                                    .with_children(|button| {
                                        button.spawn((
                                            CellMarkText,
                                            Text::new(""),
                                            TextFont {
                                                font_size: FontSize::Px(mark_font_size),
                                                ..default()
                                            },
                                            TextColor(Color::WHITE),
                                        ));
                                    });
                            }
                        });
                    }

                    // Spawned last (rather than first) so it paints on top of the cell buttons
                    // — Bevy UI stacks same-`ZIndex` siblings in spawn order. Hidden until a
                    // round is won; `render_win_line` sizes, positions, and rotates it to strike
                    // through the three winning cells' centers. Absolutely positioned (relative
                    // to this grid container's own bounding box, which exactly matches the 3x3
                    // layout above) so it doesn't participate in the row/column flex layout.
                    grid.spawn((
                        WinLine,
                        Visibility::Hidden,
                        Node {
                            position_type: PositionType::Absolute,
                            ..default()
                        },
                        UiTransform::IDENTITY,
                        BackgroundColor(WIN_LINE_COLOR),
                    ));
                });

            parent
                .spawn((
                    RoundEndControls,
                    Visibility::Hidden,
                    Node {
                        flex_direction: FlexDirection::Row,
                        column_gap: Val::Px(16.0),
                        ..default()
                    },
                ))
                .with_children(|controls| {
                    controls
                        .spawn((
                            PlayAgainButton,
                            Button,
                            Node {
                                width: Val::Px(160.0),
                                padding: UiRect::all(Val::Px(12.0)),
                                justify_content: JustifyContent::Center,
                                align_items: AlignItems::Center,
                                ..default()
                            },
                            BackgroundColor(PLAY_AGAIN_BUTTON),
                        ))
                        .with_children(|button| {
                            button.spawn((
                                Text::new("Play Again"),
                                TextFont {
                                    font_size: FontSize::Px(20.0),
                                    ..default()
                                },
                                TextColor(Color::WHITE),
                            ));
                        });

                    controls
                        .spawn((
                            BackToMenuButton,
                            Button,
                            Node {
                                width: Val::Px(160.0),
                                padding: UiRect::all(Val::Px(12.0)),
                                justify_content: JustifyContent::Center,
                                align_items: AlignItems::Center,
                                ..default()
                            },
                            BackgroundColor(BACK_TO_MENU_BUTTON),
                        ))
                        .with_children(|button| {
                            button.spawn((
                                Text::new("Back to Menu"),
                                TextFont {
                                    font_size: FontSize::Px(20.0),
                                    ..default()
                                },
                                TextColor(Color::WHITE),
                            ));
                        });
                });
        });
}

#[allow(clippy::type_complexity)]
fn cell_button_interaction(
    mut buttons: Query<
        (&Interaction, &mut BackgroundColor),
        (Changed<Interaction>, With<CellButton>),
    >,
) {
    for (interaction, mut background) in &mut buttons {
        *background = match interaction {
            Interaction::Pressed => PRESSED_CELL.into(),
            Interaction::Hovered => HOVERED_CELL.into(),
            Interaction::None => NORMAL_CELL.into(),
        };
    }
}

fn cell_click(
    setup: Res<TicTacToeSetup>,
    mut board: ResMut<GameBoard>,
    buttons: Query<(&Interaction, &CellButton), Changed<Interaction>>,
) {
    if board.status() != Status::InProgress {
        return;
    }
    // The computer's mark is only ever placed by `computer_move`; ignore clicks landing on its
    // turn (e.g. a hover/press event queued just before it moved).
    if setup.computer_symbol == Some(board.current_player()) {
        return;
    }
    for (interaction, cell) in &buttons {
        if *interaction == Interaction::Pressed {
            let player = board.current_player();
            board.place(cell.0, player);
        }
    }
}

/// Makes the computer's move once it's its turn. Runs every frame while `AppState::TicTacToe`
/// is active, but only ever acts once per computer turn: placing a mark immediately flips
/// `current_player()` away from the computer, the same self-limiting pattern `cell_click` relies
/// on for human moves.
fn computer_move(setup: Res<TicTacToeSetup>, mut board: ResMut<GameBoard>) {
    let Some(GameMode::Pvc(difficulty)) = setup.mode else {
        return;
    };
    let Some(computer_symbol) = setup.computer_symbol else {
        return;
    };
    if board.status() != Status::InProgress || board.current_player() != computer_symbol {
        return;
    }
    let index = ai::choose_move(&board, computer_symbol, difficulty);
    board.place(index, computer_symbol);
}

fn render_cells(
    board: Res<GameBoard>,
    cells: Query<(&CellButton, &Children)>,
    mut marks: Query<(&mut Text, &mut TextColor), With<CellMarkText>>,
) {
    for (cell, children) in &cells {
        let (label, color) = match board.cell(cell.0) {
            Some(Player::X) => ("X", X_MARK_COLOR),
            Some(Player::O) => ("O", O_MARK_COLOR),
            None => ("", Color::WHITE),
        };
        for &child in children {
            if let Ok((mut text, mut text_color)) = marks.get_mut(child)
                && text.0 != label
            {
                text.0 = label.to_string();
                *text_color = TextColor(color);
            }
        }
    }
}

fn render_status_text(board: Res<GameBoard>, mut status: Query<&mut Text, With<StatusText>>) {
    let Ok(mut text) = status.single_mut() else {
        return;
    };
    let message = match board.status() {
        Status::InProgress => format!("{}'s turn", board.current_player().label()),
        Status::Won(player) => format!("{} wins!", player.label()),
        Status::Draw => "It's a draw!".to_string(),
    };
    if text.0 != message {
        text.0 = message;
    }
}

/// Tallies each round's outcome into [`TicTacToeSession`] exactly once, the moment it ends.
/// Guarded by `round_recorded` since this runs every frame the round stays finished (e.g. while
/// the round-end buttons sit on screen waiting for a click).
fn record_round_result(
    setup: Res<TicTacToeSetup>,
    board: Res<GameBoard>,
    mut session: ResMut<TicTacToeSession>,
) {
    if session.round_recorded {
        return;
    }
    match board.status() {
        Status::InProgress => {}
        Status::Draw => {
            session.games_played += 1;
            session.round_recorded = true;
        }
        Status::Won(mark) => {
            session.games_played += 1;
            if TicTacToeSession::is_first_player(&setup, mark) {
                session.first_wins += 1;
            } else {
                session.second_wins += 1;
            }
            session.round_recorded = true;
        }
    }
}

fn render_session_score_text(
    setup: Res<TicTacToeSetup>,
    session: Res<TicTacToeSession>,
    mut text: Query<&mut Text, With<SessionScoreText>>,
) {
    let Ok(mut text) = text.single_mut() else {
        return;
    };
    let message = format!(
        "Games played: {} — {}: {}, {}: {}",
        session.games_played,
        TicTacToeSession::first_label(&setup),
        session.first_wins,
        TicTacToeSession::second_label(&setup),
        session.second_wins,
    );
    if text.0 != message {
        text.0 = message;
    }
}

fn render_round_end_controls(
    board: Res<GameBoard>,
    mut controls: Query<&mut Visibility, With<RoundEndControls>>,
) {
    let Ok(mut visibility) = controls.single_mut() else {
        return;
    };
    let target = if board.status() == Status::InProgress {
        Visibility::Hidden
    } else {
        Visibility::Visible
    };
    if *visibility != target {
        *visibility = target;
    }
}

/// Sizes, positions, and rotates [`WinLine`] to strike through the centers of the three winning
/// cells, hiding it otherwise. Cell centers are computed analytically from the current cell size
/// and gap (rather than read back from layout) since the grid's geometry is fully determined by
/// those two numbers — same values `spawn_tic_tac_toe` and `resize_cell_labels` already use.
fn render_win_line(
    board: Res<GameBoard>,
    windows: Query<&Window, With<PrimaryWindow>>,
    mut line: Query<(&mut Node, &mut UiTransform, &mut Visibility), With<WinLine>>,
) {
    let Ok((mut node, mut transform, mut visibility)) = line.single_mut() else {
        return;
    };
    let Some(winning_line) = board.winning_line() else {
        *visibility = Visibility::Hidden;
        return;
    };
    let Ok(window) = windows.single() else {
        return;
    };

    let cell_size = square_button_size(window, CELL_VMIN, CELL_MIN_PX, CELL_MAX_PX);
    let step = cell_size + CELL_GAP_PX;
    let cell_center = |index: usize| -> Vec2 {
        let (row, col) = (index / 3, index % 3);
        Vec2::new(
            col as f32 * step + cell_size / 2.0,
            row as f32 * step + cell_size / 2.0,
        )
    };

    let start = cell_center(winning_line[0]);
    let end = cell_center(winning_line[2]);
    let delta = end - start;
    // Extend a half-cell past each end cell's center so the line spans the full width of the
    // outer two cells, not just the gap between their centers.
    let length = delta.length() + cell_size;
    let midpoint = (start + end) / 2.0;

    node.width = Val::Px(length);
    node.height = Val::Px(WIN_LINE_THICKNESS_PX);
    node.left = Val::Px(midpoint.x - length / 2.0);
    node.top = Val::Px(midpoint.y - WIN_LINE_THICKNESS_PX / 2.0);
    transform.rotation = Rot2::radians(delta.y.atan2(delta.x));
    *visibility = Visibility::Visible;
}

#[allow(clippy::type_complexity)]
fn play_again_button_interaction(
    setup: Res<TicTacToeSetup>,
    mut board: ResMut<GameBoard>,
    mut session: ResMut<TicTacToeSession>,
    mut buttons: Query<
        (&Interaction, &mut BackgroundColor),
        (Changed<Interaction>, With<PlayAgainButton>),
    >,
) {
    for (interaction, mut background) in &mut buttons {
        *background = match interaction {
            Interaction::Pressed => {
                if board.status() != Status::InProgress {
                    let starting_player = setup
                        .starting_player
                        .expect("starting_player is set before the Play screen is ever reachable");
                    *board = GameBoard(Board::starting_with(starting_player));
                    session.round_recorded = false;
                }
                PLAY_AGAIN_BUTTON_PRESSED.into()
            }
            Interaction::Hovered => PLAY_AGAIN_BUTTON_HOVERED.into(),
            Interaction::None => PLAY_AGAIN_BUTTON.into(),
        };
    }
}

#[allow(clippy::type_complexity)]
fn back_to_menu_button_interaction(
    mut next_state: ResMut<NextState<AppState>>,
    board: Res<GameBoard>,
    mut buttons: Query<
        (&Interaction, &mut BackgroundColor),
        (Changed<Interaction>, With<BackToMenuButton>),
    >,
) {
    for (interaction, mut background) in &mut buttons {
        *background = match interaction {
            Interaction::Pressed => {
                if board.status() != Status::InProgress {
                    next_state.set(AppState::Menu);
                }
                BACK_TO_MENU_BUTTON_PRESSED.into()
            }
            Interaction::Hovered => BACK_TO_MENU_BUTTON_HOVERED.into(),
            Interaction::None => BACK_TO_MENU_BUTTON.into(),
        };
    }
}

fn resize_cell_labels(
    mut resize_events: MessageReader<WindowResized>,
    windows: Query<&Window, With<PrimaryWindow>>,
    mut labels: Query<&mut TextFont, With<CellMarkText>>,
) {
    if resize_events.read().count() == 0 {
        return;
    }
    let Ok(window) = windows.single() else {
        return;
    };
    let font_size =
        square_button_size(window, CELL_VMIN, CELL_MIN_PX, CELL_MAX_PX) * CELL_MARK_RATIO;
    for mut text_font in &mut labels {
        text_font.font_size = FontSize::Px(font_size);
    }
}

fn despawn_tic_tac_toe(mut commands: Commands, query: Query<Entity, With<OnTicTacToeScreen>>) {
    for entity in &query {
        commands.entity(entity).despawn();
    }
    commands.remove_resource::<GameBoard>();
    commands.remove_resource::<TicTacToeSetup>();
    commands.remove_resource::<TicTacToeSession>();
}
