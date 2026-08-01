use bevy::prelude::*;

use crate::AppState;

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

const NORMAL_BUTTON: Color = Color::srgb(0.2, 0.2, 0.25);
const HOVERED_BUTTON: Color = Color::srgb(0.3, 0.3, 0.4);
const PRESSED_BUTTON: Color = Color::srgb(0.15, 0.5, 0.25);

const QUIT_BUTTON: Color = Color::srgb(0.35, 0.15, 0.15);
const QUIT_BUTTON_HOVERED: Color = Color::srgb(0.5, 0.2, 0.2);
const QUIT_BUTTON_PRESSED: Color = Color::srgb(0.6, 0.1, 0.1);

pub struct MenuPlugin;

impl Plugin for MenuPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(OnEnter(AppState::Menu), spawn_menu)
            .add_systems(
                Update,
                (
                    game_button_interaction,
                    quit_button_interaction,
                    tooltip_visibility,
                )
                    .run_if(in_state(AppState::Menu)),
            )
            .add_systems(OnExit(AppState::Menu), despawn_menu);
    }
}

#[derive(Component)]
struct OnMenuScreen;

#[derive(Component)]
struct GameButton;

#[derive(Component)]
struct QuitButton;

#[derive(Component)]
struct Tooltip;

fn spawn_menu(mut commands: Commands) {
    commands
        .spawn((
            OnMenuScreen,
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

            // Game buttons laid out side by side, wrapping to new rows as needed.
            parent
                .spawn(Node {
                    flex_direction: FlexDirection::Row,
                    flex_wrap: FlexWrap::Wrap,
                    justify_content: JustifyContent::Center,
                    column_gap: Val::Px(16.0),
                    row_gap: Val::Px(16.0),
                    width: Val::Percent(100.0),
                    max_width: Val::Px(700.0),
                    ..default()
                })
                .with_children(|row| {
                    for &game in GAMES {
                        row.spawn((
                            GameButton,
                            Button,
                            Node {
                                width: Val::Px(200.0),
                                padding: UiRect::all(Val::Px(12.0)),
                                justify_content: JustifyContent::Center,
                                align_items: AlignItems::Center,
                                ..default()
                            },
                            BackgroundColor(NORMAL_BUTTON),
                        ))
                        .with_children(|button| {
                            button.spawn((
                                Text::new(game),
                                TextFont {
                                    font_size: FontSize::Px(24.0),
                                    ..default()
                                },
                                TextColor(Color::WHITE),
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

fn despawn_menu(mut commands: Commands, query: Query<Entity, With<OnMenuScreen>>) {
    for entity in &query {
        commands.entity(entity).despawn();
    }
}
