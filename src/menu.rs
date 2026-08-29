use bevy::prelude::*;
use bevy::window::{PrimaryWindow, WindowResized};

use crate::{AppState, Scrollable};

/// Placeholder catalog of games shown on the menu. Swap this out once real
/// games are wired up behind each entry.
const GAMES: &[&str] = &[
    "Mini Sudoku",
    "Sudoku",
    "Tic Tac Toe",
    "Advanced Tic Tac Toe",
    "Ludo",
    "Snakes and Ladders",
    "Chess",
    "Minesweeper",
    "Checkers",
    "Solitaire",
];

const GAMES_PER_ROW: usize = 3;

// Game buttons are squares sized as a percentage of the smaller viewport dimension (vmin), so
// they scale with the window instead of overflowing a shrunk one or looking tiny on a large one.
// The min/max clamp keeps them from becoming unreadably small or comically large at extreme
// window sizes/aspect ratios.
const GAME_BUTTON_VMIN: f32 = 14.0;
const GAME_BUTTON_MIN_PX: f32 = 72.0;
const GAME_BUTTON_MAX_PX: f32 = 160.0;

// The label font scales as a fixed fraction of the (already clamped) button size, so it grows
// and shrinks in lockstep with the square instead of drifting out of proportion at the extremes
// where the button size is clamped but a plain vmin-based font size would keep changing.
const GAME_BUTTON_LABEL_RATIO: f32 = 0.12;

const NORMAL_BUTTON: Color = Color::srgb(0.2, 0.2, 0.25);
const HOVERED_BUTTON: Color = Color::srgb(0.3, 0.3, 0.4);
const PRESSED_BUTTON: Color = Color::srgb(0.15, 0.5, 0.25);

#[cfg(not(target_arch = "wasm32"))]
const QUIT_BUTTON: Color = Color::srgb(0.35, 0.15, 0.15);
#[cfg(not(target_arch = "wasm32"))]
const QUIT_BUTTON_HOVERED: Color = Color::srgb(0.5, 0.2, 0.2);
#[cfg(not(target_arch = "wasm32"))]
const QUIT_BUTTON_PRESSED: Color = Color::srgb(0.6, 0.1, 0.1);

pub struct MenuPlugin;

impl Plugin for MenuPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(OnEnter(AppState::Menu), spawn_menu)
            .add_systems(
                Update,
                (
                    game_button_interaction,
                    tooltip_visibility,
                    resize_game_button_labels,
                )
                    .run_if(in_state(AppState::Menu)),
            )
            .add_systems(OnExit(AppState::Menu), despawn_menu);

        // The web build has no process to quit; players just close the browser tab.
        #[cfg(not(target_arch = "wasm32"))]
        app.add_systems(
            Update,
            quit_button_interaction.run_if(in_state(AppState::Menu)),
        );
    }
}

#[derive(Component)]
struct OnMenuScreen;

#[derive(Component)]
struct GameButton;

#[cfg(not(target_arch = "wasm32"))]
#[derive(Component)]
struct QuitButton;

#[derive(Component)]
struct Tooltip;

#[derive(Component)]
struct GameButtonLabel;

fn game_button_size(window: &Window) -> f32 {
    (window.width().min(window.height()) * GAME_BUTTON_VMIN / 100.0)
        .clamp(GAME_BUTTON_MIN_PX, GAME_BUTTON_MAX_PX)
}

fn spawn_menu(mut commands: Commands, windows: Query<&Window, With<PrimaryWindow>>) {
    let label_font_size = windows
        .single()
        .map(game_button_size)
        .unwrap_or(GAME_BUTTON_MIN_PX)
        * GAME_BUTTON_LABEL_RATIO;

    commands
        .spawn((
            OnMenuScreen,
            Scrollable,
            Node {
                width: Val::Percent(100.0),
                height: Val::Percent(100.0),
                flex_direction: FlexDirection::Column,
                align_items: AlignItems::Center,
                justify_content: JustifyContent::Center,
                row_gap: Val::Px(24.0),
                padding: UiRect::all(Val::Px(16.0)),
                overflow: Overflow {
                    x: OverflowAxis::Visible,
                    y: OverflowAxis::Scroll,
                },
                ..default()
            },
            BackgroundColor(Color::srgb(0.1, 0.1, 0.12)),
        ))
        .with_children(|parent| {
            parent.spawn((
                Text::new("Tabletop Tavern"),
                TextFont {
                    font_size: FontSize::Px(40.0),
                    ..default()
                },
                TextColor(Color::WHITE),
            ));

            // Game buttons laid out in fixed-size rows of 3. Explicit rows (rather than a
            // single `flex_wrap: Wrap` container) sidestep a taffy/bevy_ui layout bug where a
            // wrapped container's reported height doesn't include its later wrapped lines,
            // which made the Quit button overlap whatever row happened to be last measured.
            parent
                .spawn(Node {
                    flex_direction: FlexDirection::Column,
                    align_items: AlignItems::Center,
                    row_gap: Val::Px(16.0),
                    width: Val::Percent(100.0),
                    max_width: Val::Px(700.0),
                    ..default()
                })
                .with_children(|grid| {
                    for row_games in GAMES.chunks(GAMES_PER_ROW) {
                        grid.spawn(Node {
                            flex_direction: FlexDirection::Row,
                            justify_content: JustifyContent::Center,
                            column_gap: Val::Px(16.0),
                            width: Val::Percent(100.0),
                            ..default()
                        })
                        .with_children(|row| {
                            for &game in row_games {
                                row.spawn((
                                    GameButton,
                                    Button,
                                    Node {
                                        width: Val::VMin(GAME_BUTTON_VMIN),
                                        height: Val::VMin(GAME_BUTTON_VMIN),
                                        min_width: Val::Px(GAME_BUTTON_MIN_PX),
                                        min_height: Val::Px(GAME_BUTTON_MIN_PX),
                                        max_width: Val::Px(GAME_BUTTON_MAX_PX),
                                        max_height: Val::Px(GAME_BUTTON_MAX_PX),
                                        padding: UiRect::all(Val::Px(12.0)),
                                        justify_content: JustifyContent::Center,
                                        align_items: AlignItems::Center,
                                        ..default()
                                    },
                                    BackgroundColor(NORMAL_BUTTON),
                                ))
                                .with_children(|button| {
                                    button.spawn((
                                        GameButtonLabel,
                                        Text::new(game),
                                        TextFont {
                                            font_size: FontSize::Px(label_font_size),
                                            ..default()
                                        },
                                        TextColor(Color::WHITE),
                                        TextLayout::justify(Justify::Center),
                                    ));

                                    // Hidden until the button is hovered; every game is a
                                    // placeholder for now, so the tooltip text is fixed.
                                    button.spawn((
                                        Tooltip,
                                        Visibility::Hidden,
                                        Text::new("Work in progress"),
                                        TextFont {
                                            font_size: FontSize::Px(16.0),
                                            ..default()
                                        },
                                        TextColor(Color::WHITE),
                                        Node {
                                            position_type: PositionType::Absolute,
                                            top: Val::Px(-28.0),
                                            padding: UiRect::axes(Val::Px(8.0), Val::Px(4.0)),
                                            ..default()
                                        },
                                        BackgroundColor(Color::BLACK.with_alpha(0.85)),
                                    ));
                                });
                            }
                        });
                    }
                });

            #[cfg(not(target_arch = "wasm32"))]
            parent
                .spawn((
                    QuitButton,
                    Button,
                    Node {
                        width: Val::Px(200.0),
                        padding: UiRect::all(Val::Px(12.0)),
                        justify_content: JustifyContent::Center,
                        align_items: AlignItems::Center,
                        margin: UiRect::top(Val::Px(16.0)),
                        ..default()
                    },
                    BackgroundColor(QUIT_BUTTON),
                ))
                .with_children(|button| {
                    button.spawn((
                        Text::new("Quit"),
                        TextFont {
                            font_size: FontSize::Px(24.0),
                            ..default()
                        },
                        TextColor(Color::WHITE),
                    ));
                });
        });
}

#[allow(clippy::type_complexity)]
fn game_button_interaction(
    mut buttons: Query<
        (&Interaction, &mut BackgroundColor),
        (Changed<Interaction>, With<GameButton>),
    >,
) {
    for (interaction, mut background) in &mut buttons {
        *background = match interaction {
            Interaction::Pressed => PRESSED_BUTTON.into(),
            Interaction::Hovered => HOVERED_BUTTON.into(),
            Interaction::None => NORMAL_BUTTON.into(),
        };
    }
}

#[cfg(not(target_arch = "wasm32"))]
#[allow(clippy::type_complexity)]
fn quit_button_interaction(
    mut buttons: Query<
        (&Interaction, &mut BackgroundColor),
        (Changed<Interaction>, With<QuitButton>),
    >,
    mut exit: MessageWriter<AppExit>,
) {
    for (interaction, mut background) in &mut buttons {
        *background = match interaction {
            Interaction::Pressed => {
                exit.write(AppExit::Success);
                QUIT_BUTTON_PRESSED.into()
            }
            Interaction::Hovered => QUIT_BUTTON_HOVERED.into(),
            Interaction::None => QUIT_BUTTON.into(),
        };
    }
}

#[allow(clippy::type_complexity)]
fn tooltip_visibility(
    buttons: Query<(&Interaction, &Children), (Changed<Interaction>, With<GameButton>)>,
    mut tooltips: Query<&mut Visibility, With<Tooltip>>,
) {
    for (interaction, children) in &buttons {
        let visibility = match interaction {
            Interaction::Hovered | Interaction::Pressed => Visibility::Visible,
            Interaction::None => Visibility::Hidden,
        };
        for &child in children {
            if let Ok(mut tooltip_visibility) = tooltips.get_mut(child) {
                *tooltip_visibility = visibility;
            }
        }
    }
}

fn resize_game_button_labels(
    mut resize_events: MessageReader<WindowResized>,
    windows: Query<&Window, With<PrimaryWindow>>,
    mut labels: Query<&mut TextFont, With<GameButtonLabel>>,
) {
    if resize_events.read().count() == 0 {
        return;
    }
    let Ok(window) = windows.single() else {
        return;
    };
    let font_size = game_button_size(window) * GAME_BUTTON_LABEL_RATIO;
    for mut text_font in &mut labels {
        text_font.font_size = FontSize::Px(font_size);
    }
}

fn despawn_menu(mut commands: Commands, query: Query<Entity, With<OnMenuScreen>>) {
    for entity in &query {
        commands.entity(entity).despawn();
    }
}
