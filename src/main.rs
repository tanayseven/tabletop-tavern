mod menu;
mod splash;
mod tic_tac_toe;
mod ui;

use bevy::input::mouse::MouseMotion;
use bevy::prelude::*;

const APP_NAME: &str = "Tabletop Tavern";

/// Marks a scrollable `Node` (one with `Overflow::Scroll` on at least one axis) so
/// [`scroll_by_dragging`] knows to drive its `ScrollPosition` from a click-and-drag gesture.
/// Mouse-wheel scrolling is handled separately by Bevy's own `ui_widgets::ScrollArea`. Without
/// either, `Overflow::Scroll` only clips overflowing content — nothing lets the player actually
/// reach it, which matters once a screen's content no longer fits a shrunk window.
#[derive(Component)]
pub(crate) struct Scrollable;

/// The high-level screen the app is currently showing.
#[derive(States, Debug, Clone, Copy, Eq, PartialEq, Hash, Default)]
pub(crate) enum AppState {
    #[default]
    Splash,
    Menu,
    TicTacToeModeSelect,
    TicTacToeDifficultySelect,
    TicTacToeCoinToss,
    TicTacToeSymbolChoice,
    TicTacToe,
}

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: APP_NAME.to_string(),
                resolution: (960, 640).into(),
                resizable: true,
                ..default()
            }),
            ..default()
        }))
        .init_state::<AppState>()
        .add_systems(Startup, spawn_camera)
        .add_systems(Update, scroll_by_dragging)
        .add_plugins((
            splash::SplashPlugin,
            menu::MenuPlugin,
            tic_tac_toe::TicTacToeSetupPlugin,
            tic_tac_toe::TicTacToePlugin,
        ))
        .run();
}

fn spawn_camera(mut commands: Commands) {
    commands.spawn(Camera2d);
}

/// Click-and-drag scrolling: while the left mouse button is held, the content tracks the cursor
/// (drag down to reveal what's above, drag up to reveal what's below), the same feel as touch
/// scrolling. Motion events are drained every frame regardless of button state so a drag that
/// starts later doesn't inherit a backlog of stale motion.
fn scroll_by_dragging(
    mouse_buttons: Res<ButtonInput<MouseButton>>,
    mut motion_events: MessageReader<MouseMotion>,
    mut scrollables: Query<&mut ScrollPosition, With<Scrollable>>,
) {
    let mut delta = Vec2::ZERO;
    for event in motion_events.read() {
        delta += event.delta;
    }
    if !mouse_buttons.pressed(MouseButton::Left) || delta == Vec2::ZERO {
        return;
    }
    for mut scroll_position in &mut scrollables {
        scroll_position.x -= delta.x;
        scroll_position.y -= delta.y;
    }
}
