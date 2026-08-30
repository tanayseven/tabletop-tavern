use bevy::prelude::*;

use crate::AppState;
use crate::ui::{HOVERED_BUTTON, NORMAL_BUTTON, PRESSED_BUTTON};

use super::board::Player;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Difficulty {
    VeryEasy,
    Easy,
    Medium,
    Hard,
}

impl Difficulty {
    fn label(self) -> &'static str {
        match self {
            Difficulty::VeryEasy => "Very Easy",
            Difficulty::Easy => "Easy",
            Difficulty::Medium => "Medium",
            Difficulty::Hard => "Hard",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum GameMode {
    Pvp,
    Pvc(Difficulty),
}

/// Built up field-by-field across the Mode Select / Difficulty Select / Coin Toss / Symbol
/// Choice screens; fully populated (`starting_player` and, in PvC, `computer_symbol`) by the
/// time [`AppState::TicTacToe`] is reached. Inserted on entering Mode Select, removed on leaving
/// the Play screen.
#[derive(Resource, Default, Clone, Copy)]
pub struct TicTacToeSetup {
    pub mode: Option<GameMode>,
    /// Player 1 (the human, in both PvP and PvC) always calls the coin toss; `true` means their
    /// call won.
    pub caller_won_toss: Option<bool>,
    pub starting_player: Option<Player>,
    /// `Some(mark)` only in PvC — the mark the computer is playing.
    pub computer_symbol: Option<Player>,
    /// `Some(mark)` only in PvP — the mark assigned to Player 1 (the human who called the coin
    /// toss). Lets the scoreboard map a round's winning mark back to "Player 1" vs "Player 2".
    pub player_one_symbol: Option<Player>,
}

pub struct TicTacToeSetupPlugin;

impl Plugin for TicTacToeSetupPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(OnEnter(AppState::TicTacToeModeSelect), spawn_mode_select)
            .add_systems(
                Update,
                (mode_select_button_click, mode_select_back_click)
                    .run_if(in_state(AppState::TicTacToeModeSelect)),
            )
            .add_systems(OnExit(AppState::TicTacToeModeSelect), despawn_mode_select)
            .add_systems(
                OnEnter(AppState::TicTacToeDifficultySelect),
                spawn_difficulty_select,
            )
            .add_systems(
                Update,
                (difficulty_select_button_click, difficulty_select_back_click)
                    .run_if(in_state(AppState::TicTacToeDifficultySelect)),
            )
            .add_systems(
                OnExit(AppState::TicTacToeDifficultySelect),
                despawn_difficulty_select,
            )
            .add_systems(OnEnter(AppState::TicTacToeCoinToss), spawn_coin_toss)
            .add_systems(
                Update,
                (
                    coin_toss_call_click,
                    coin_toss_continue_click,
                    coin_toss_back_click,
                    render_coin_toss,
                )
                    .run_if(in_state(AppState::TicTacToeCoinToss)),
            )
            .add_systems(OnExit(AppState::TicTacToeCoinToss), despawn_coin_toss)
            .add_systems(
                OnEnter(AppState::TicTacToeSymbolChoice),
                spawn_symbol_choice,
            )
            .add_systems(
                Update,
                (symbol_choice_button_click, symbol_choice_back_click)
                    .run_if(in_state(AppState::TicTacToeSymbolChoice)),
            )
            .add_systems(
                OnExit(AppState::TicTacToeSymbolChoice),
                despawn_symbol_choice,
            );
    }
}

fn button_interaction_colors(interaction: &Interaction) -> Color {
    match interaction {
        Interaction::Pressed => PRESSED_BUTTON,
        Interaction::Hovered => HOVERED_BUTTON,
        Interaction::None => NORMAL_BUTTON,
    }
}

fn root_node() -> impl Bundle {
    (
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
    )
}

fn title_text(label: &str) -> impl Bundle {
    (
        Text::new(label.to_string()),
        TextFont {
            font_size: FontSize::Px(28.0),
            ..default()
        },
        TextColor(Color::WHITE),
    )
}

/// Marks the back button on a setup screen. Reused across all four screens rather than one
/// marker per screen since only one screen's entities (and thus one `BackButton`) ever exist at
/// a time — each screen's own click system is scoped to that screen's `AppState` by `run_if`.
#[derive(Component)]
struct BackButton;

/// A small "< Back" button pinned to the top-left corner. Absolutely positioned so it sits
/// outside each screen's centered column layout instead of taking a slot in it.
fn back_button_bundle() -> impl Bundle {
    (
        BackButton,
        Button,
        Node {
            position_type: PositionType::Absolute,
            top: Val::Px(16.0),
            left: Val::Px(16.0),
            padding: UiRect::axes(Val::Px(14.0), Val::Px(8.0)),
            justify_content: JustifyContent::Center,
            align_items: AlignItems::Center,
            ..default()
        },
        BackgroundColor(NORMAL_BUTTON),
    )
}

fn spawn_back_button(parent: &mut ChildSpawnerCommands) {
    parent.spawn(back_button_bundle()).with_children(|button| {
        button.spawn((
            Text::new("< Back"),
            TextFont {
                font_size: FontSize::Px(16.0),
                ..default()
            },
            TextColor(Color::WHITE),
        ));
    });
}

// ---------------------------------------------------------------------------------------------
// Mode Select
// ---------------------------------------------------------------------------------------------

#[derive(Component)]
struct OnModeSelectScreen;

#[derive(Component)]
struct ModeButton(GameMode);

fn spawn_mode_select(mut commands: Commands) {
    commands.insert_resource(TicTacToeSetup::default());

    commands
        .spawn((OnModeSelectScreen, root_node()))
        .with_children(|parent| {
            spawn_back_button(parent);
            parent.spawn(title_text("Choose a game mode"));
            parent
                .spawn(Node {
                    flex_direction: FlexDirection::Column,
                    align_items: AlignItems::Center,
                    row_gap: Val::Px(16.0),
                    ..default()
                })
                .with_children(|row| {
                    for (mode, label) in [
                        (GameMode::Pvp, "Player vs Player"),
                        // Difficulty is chosen on the next screen; this placeholder is
                        // overwritten before it's ever read.
                        (GameMode::Pvc(Difficulty::Easy), "Player vs Computer"),
                    ] {
                        row.spawn((
                            ModeButton(mode),
                            Button,
                            // Wide enough to fit "Player vs Computer" (the longer label) on a
                            // single line with room to spare, and a fixed height so the button
                            // stays a short, uniform box rather than growing to whatever its
                            // label needs.
                            Node {
                                width: Val::Px(260.0),
                                height: Val::Px(56.0),
                                padding: UiRect::all(Val::Px(12.0)),
                                justify_content: JustifyContent::Center,
                                align_items: AlignItems::Center,
                                ..default()
                            },
                            BackgroundColor(NORMAL_BUTTON),
                        ))
                        .with_children(|button| {
                            button.spawn((
                                Text::new(label),
                                TextFont {
                                    font_size: FontSize::Px(20.0),
                                    ..default()
                                },
                                TextColor(Color::WHITE),
                                TextLayout {
                                    linebreak: LineBreak::NoWrap,
                                    ..default()
                                },
                            ));
                        });
                    }
                });
        });
}

#[allow(clippy::type_complexity)]
fn mode_select_button_click(
    mut setup: ResMut<TicTacToeSetup>,
    mut next_state: ResMut<NextState<AppState>>,
    mut buttons: Query<(&Interaction, &ModeButton, &mut BackgroundColor), Changed<Interaction>>,
) {
    for (interaction, ModeButton(mode), mut background) in &mut buttons {
        *background = button_interaction_colors(interaction).into();
        if *interaction != Interaction::Pressed {
            continue;
        }
        match mode {
            GameMode::Pvp => {
                setup.mode = Some(GameMode::Pvp);
                next_state.set(AppState::TicTacToeCoinToss);
            }
            GameMode::Pvc(_) => next_state.set(AppState::TicTacToeDifficultySelect),
        }
    }
}

#[allow(clippy::type_complexity)]
fn mode_select_back_click(
    mut next_state: ResMut<NextState<AppState>>,
    mut buttons: Query<
        (&Interaction, &mut BackgroundColor),
        (Changed<Interaction>, With<BackButton>),
    >,
) {
    for (interaction, mut background) in &mut buttons {
        *background = button_interaction_colors(interaction).into();
        if *interaction == Interaction::Pressed {
            next_state.set(AppState::Menu);
        }
    }
}

fn despawn_mode_select(mut commands: Commands, query: Query<Entity, With<OnModeSelectScreen>>) {
    for entity in &query {
        commands.entity(entity).despawn();
    }
}

// ---------------------------------------------------------------------------------------------
// Difficulty Select (PvC only)
// ---------------------------------------------------------------------------------------------

#[derive(Component)]
struct OnDifficultySelectScreen;

#[derive(Component)]
struct DifficultyButton(Difficulty);

fn spawn_difficulty_select(mut commands: Commands) {
    commands
        .spawn((OnDifficultySelectScreen, root_node()))
        .with_children(|parent| {
            spawn_back_button(parent);
            parent.spawn(title_text("Choose a difficulty"));
            parent
                .spawn(Node {
                    flex_direction: FlexDirection::Row,
                    column_gap: Val::Px(16.0),
                    ..default()
                })
                .with_children(|row| {
                    for difficulty in [
                        Difficulty::VeryEasy,
                        Difficulty::Easy,
                        Difficulty::Medium,
                        Difficulty::Hard,
                    ] {
                        row.spawn((
                            DifficultyButton(difficulty),
                            Button,
                            Node {
                                width: Val::Px(150.0),
                                padding: UiRect::all(Val::Px(12.0)),
                                justify_content: JustifyContent::Center,
                                align_items: AlignItems::Center,
                                ..default()
                            },
                            BackgroundColor(NORMAL_BUTTON),
                        ))
                        .with_children(|button| {
                            button.spawn((
                                Text::new(difficulty.label()),
                                TextFont {
                                    font_size: FontSize::Px(18.0),
                                    ..default()
                                },
                                TextColor(Color::WHITE),
                            ));
                        });
                    }
                });
        });
}

#[allow(clippy::type_complexity)]
fn difficulty_select_button_click(
    mut setup: ResMut<TicTacToeSetup>,
    mut next_state: ResMut<NextState<AppState>>,
    mut buttons: Query<
        (&Interaction, &DifficultyButton, &mut BackgroundColor),
        Changed<Interaction>,
    >,
) {
    for (interaction, DifficultyButton(difficulty), mut background) in &mut buttons {
        *background = button_interaction_colors(interaction).into();
        if *interaction == Interaction::Pressed {
            setup.mode = Some(GameMode::Pvc(*difficulty));
            next_state.set(AppState::TicTacToeCoinToss);
        }
    }
}

#[allow(clippy::type_complexity)]
fn difficulty_select_back_click(
    mut next_state: ResMut<NextState<AppState>>,
    mut buttons: Query<
        (&Interaction, &mut BackgroundColor),
        (Changed<Interaction>, With<BackButton>),
    >,
) {
    for (interaction, mut background) in &mut buttons {
        *background = button_interaction_colors(interaction).into();
        if *interaction == Interaction::Pressed {
            next_state.set(AppState::TicTacToeModeSelect);
        }
    }
}

fn despawn_difficulty_select(
    mut commands: Commands,
    query: Query<Entity, With<OnDifficultySelectScreen>>,
) {
    for entity in &query {
        commands.entity(entity).despawn();
    }
}

// ---------------------------------------------------------------------------------------------
// Coin Toss
// ---------------------------------------------------------------------------------------------

#[derive(Component)]
struct OnCoinTossScreen;

#[derive(Component)]
struct CallButton(bool); // true = heads

#[derive(Component)]
struct CallControls;

#[derive(Component)]
struct ResultControls;

#[derive(Component)]
struct ResultText;

#[derive(Component)]
struct ContinueButton;

fn spawn_coin_toss(mut commands: Commands) {
    commands
        .spawn((OnCoinTossScreen, root_node()))
        .with_children(|parent| {
            spawn_back_button(parent);
            parent.spawn(title_text("Coin toss: call it in the air"));

            parent
                .spawn((
                    CallControls,
                    Node {
                        flex_direction: FlexDirection::Column,
                        align_items: AlignItems::Center,
                        row_gap: Val::Px(16.0),
                        ..default()
                    },
                ))
                .with_children(|row| {
                    for (heads, label) in [(true, "Call Heads"), (false, "Call Tails")] {
                        row.spawn((
                            CallButton(heads),
                            Button,
                            Node {
                                width: Val::Px(180.0),
                                padding: UiRect::all(Val::Px(12.0)),
                                justify_content: JustifyContent::Center,
                                align_items: AlignItems::Center,
                                ..default()
                            },
                            BackgroundColor(NORMAL_BUTTON),
                        ))
                        .with_children(|button| {
                            button.spawn((
                                Text::new(label),
                                TextFont {
                                    font_size: FontSize::Px(20.0),
                                    ..default()
                                },
                                TextColor(Color::WHITE),
                            ));
                        });
                    }
                });

            parent
                .spawn((
                    ResultControls,
                    Visibility::Hidden,
                    Node {
                        flex_direction: FlexDirection::Column,
                        align_items: AlignItems::Center,
                        row_gap: Val::Px(16.0),
                        ..default()
                    },
                ))
                .with_children(|column| {
                    column.spawn((
                        ResultText,
                        Text::new(""),
                        TextFont {
                            font_size: FontSize::Px(22.0),
                            ..default()
                        },
                        TextColor(Color::WHITE),
                    ));
                    column
                        .spawn((
                            ContinueButton,
                            Button,
                            Node {
                                width: Val::Px(160.0),
                                padding: UiRect::all(Val::Px(12.0)),
                                justify_content: JustifyContent::Center,
                                align_items: AlignItems::Center,
                                ..default()
                            },
                            BackgroundColor(NORMAL_BUTTON),
                        ))
                        .with_children(|button| {
                            button.spawn((
                                Text::new("Continue"),
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
fn coin_toss_call_click(
    mut setup: ResMut<TicTacToeSetup>,
    mut buttons: Query<(&Interaction, &CallButton, &mut BackgroundColor), Changed<Interaction>>,
) {
    // Once a call has been made, these buttons are hidden (see `render_coin_toss`), so this
    // only ever fires once per visit to this screen.
    for (interaction, CallButton(called_heads), mut background) in &mut buttons {
        *background = button_interaction_colors(interaction).into();
        if *interaction != Interaction::Pressed {
            continue;
        }
        let flipped_heads = rand::random::<bool>();
        let caller_won = flipped_heads == *called_heads;
        setup.caller_won_toss = Some(caller_won);

        if let Some(GameMode::Pvc(_)) = setup.mode
            && !caller_won
        {
            // The computer won the toss: it picks its own mark and goes first, with no
            // Symbol Choice screen needed.
            let computer_symbol = if rand::random::<bool>() {
                Player::X
            } else {
                Player::O
            };
            setup.computer_symbol = Some(computer_symbol);
            setup.starting_player = Some(computer_symbol);
        }
    }
}

fn coin_toss_result_message(setup: &TicTacToeSetup) -> Option<String> {
    let caller_won = setup.caller_won_toss?;
    let is_pvc = matches!(setup.mode, Some(GameMode::Pvc(_)));
    Some(match (is_pvc, caller_won) {
        (true, true) => "You won the toss! Choose your mark.".to_string(),
        (true, false) => format!(
            "Computer won the toss and goes first, playing {}.",
            setup
                .starting_player
                .expect("computer's mark is chosen immediately when it wins the toss")
                .label()
        ),
        (false, true) => "Player 1 won the toss! Choose your mark.".to_string(),
        (false, false) => "Player 2 won the toss! Choose your mark.".to_string(),
    })
}

fn render_coin_toss(
    setup: Res<TicTacToeSetup>,
    mut call_controls: Query<&mut Visibility, (With<CallControls>, Without<ResultControls>)>,
    mut result_controls: Query<&mut Visibility, (With<ResultControls>, Without<CallControls>)>,
    mut result_text: Query<&mut Text, With<ResultText>>,
) {
    let toss_made = setup.caller_won_toss.is_some();
    if let Ok(mut visibility) = call_controls.single_mut() {
        *visibility = if toss_made {
            Visibility::Hidden
        } else {
            Visibility::Visible
        };
    }
    if let Ok(mut visibility) = result_controls.single_mut() {
        *visibility = if toss_made {
            Visibility::Visible
        } else {
            Visibility::Hidden
        };
    }
    if let Some(message) = coin_toss_result_message(&setup)
        && let Ok(mut text) = result_text.single_mut()
        && text.0 != message
    {
        text.0 = message;
    }
}

#[allow(clippy::type_complexity)]
fn coin_toss_continue_click(
    setup: Res<TicTacToeSetup>,
    mut next_state: ResMut<NextState<AppState>>,
    mut buttons: Query<
        (&Interaction, &mut BackgroundColor),
        (Changed<Interaction>, With<ContinueButton>),
    >,
) {
    for (interaction, mut background) in &mut buttons {
        *background = button_interaction_colors(interaction).into();
        if *interaction != Interaction::Pressed {
            continue;
        }
        // The computer auto-picks its mark and skips Symbol Choice only when it wins the toss
        // in PvC; every other combination still needs a human to choose X or O.
        let computer_already_chose =
            matches!(setup.mode, Some(GameMode::Pvc(_))) && setup.caller_won_toss == Some(false);
        if computer_already_chose {
            next_state.set(AppState::TicTacToe);
        } else {
            next_state.set(AppState::TicTacToeSymbolChoice);
        }
    }
}

#[allow(clippy::type_complexity)]
fn coin_toss_back_click(
    mut setup: ResMut<TicTacToeSetup>,
    mut next_state: ResMut<NextState<AppState>>,
    mut buttons: Query<
        (&Interaction, &mut BackgroundColor),
        (Changed<Interaction>, With<BackButton>),
    >,
) {
    for (interaction, mut background) in &mut buttons {
        *background = button_interaction_colors(interaction).into();
        if *interaction != Interaction::Pressed {
            continue;
        }
        // Neither destination screen resets the toss for us (only Mode Select's own OnEnter
        // does a full reset), so undo it here to leave a clean slate for the next toss.
        setup.caller_won_toss = None;
        setup.starting_player = None;
        setup.computer_symbol = None;
        setup.player_one_symbol = None;
        let target = match setup.mode {
            Some(GameMode::Pvc(_)) => AppState::TicTacToeDifficultySelect,
            _ => AppState::TicTacToeModeSelect,
        };
        next_state.set(target);
    }
}

fn despawn_coin_toss(mut commands: Commands, query: Query<Entity, With<OnCoinTossScreen>>) {
    for entity in &query {
        commands.entity(entity).despawn();
    }
}

// ---------------------------------------------------------------------------------------------
// Symbol Choice
// ---------------------------------------------------------------------------------------------

#[derive(Component)]
struct OnSymbolChoiceScreen;

#[derive(Component)]
struct SymbolButton(Player);

fn spawn_symbol_choice(mut commands: Commands) {
    commands
        .spawn((OnSymbolChoiceScreen, root_node()))
        .with_children(|parent| {
            spawn_back_button(parent);
            parent.spawn(title_text("You won the toss! Choose your mark"));
            parent
                .spawn(Node {
                    flex_direction: FlexDirection::Column,
                    align_items: AlignItems::Center,
                    row_gap: Val::Px(16.0),
                    ..default()
                })
                .with_children(|row| {
                    for player in [Player::X, Player::O] {
                        row.spawn((
                            SymbolButton(player),
                            Button,
                            Node {
                                width: Val::Px(140.0),
                                padding: UiRect::all(Val::Px(12.0)),
                                justify_content: JustifyContent::Center,
                                align_items: AlignItems::Center,
                                ..default()
                            },
                            BackgroundColor(NORMAL_BUTTON),
                        ))
                        .with_children(|button| {
                            button.spawn((
                                Text::new(format!("Play {}", player.label())),
                                TextFont {
                                    font_size: FontSize::Px(22.0),
                                    ..default()
                                },
                                TextColor(Color::WHITE),
                            ));
                        });
                    }
                });
        });
}

#[allow(clippy::type_complexity)]
fn symbol_choice_button_click(
    mut setup: ResMut<TicTacToeSetup>,
    mut next_state: ResMut<NextState<AppState>>,
    mut buttons: Query<(&Interaction, &SymbolButton, &mut BackgroundColor), Changed<Interaction>>,
) {
    for (interaction, SymbolButton(player), mut background) in &mut buttons {
        *background = button_interaction_colors(interaction).into();
        if *interaction != Interaction::Pressed {
            continue;
        }
        setup.starting_player = Some(*player);
        if matches!(setup.mode, Some(GameMode::Pvc(_))) {
            setup.computer_symbol = Some(player.other());
        } else {
            // In PvP, whoever won the coin toss is the one choosing here: Player 1 if they
            // called it, Player 2 if the caller lost. So Player 1's mark is the chosen one only
            // when the caller won; otherwise it's the mark the caller's opponent didn't pick.
            let caller_won = setup
                .caller_won_toss
                .expect("the toss is always called before Symbol Choice is reachable");
            setup.player_one_symbol = Some(if caller_won { *player } else { player.other() });
        }
        next_state.set(AppState::TicTacToe);
    }
}

#[allow(clippy::type_complexity)]
fn symbol_choice_back_click(
    mut setup: ResMut<TicTacToeSetup>,
    mut next_state: ResMut<NextState<AppState>>,
    mut buttons: Query<
        (&Interaction, &mut BackgroundColor),
        (Changed<Interaction>, With<BackButton>),
    >,
) {
    for (interaction, mut background) in &mut buttons {
        *background = button_interaction_colors(interaction).into();
        if *interaction != Interaction::Pressed {
            continue;
        }
        // Undo the toss so Coin Toss shows fresh call buttons rather than the old result.
        setup.caller_won_toss = None;
        setup.starting_player = None;
        setup.computer_symbol = None;
        setup.player_one_symbol = None;
        next_state.set(AppState::TicTacToeCoinToss);
    }
}

fn despawn_symbol_choice(mut commands: Commands, query: Query<Entity, With<OnSymbolChoiceScreen>>) {
    for entity in &query {
        commands.entity(entity).despawn();
    }
}
