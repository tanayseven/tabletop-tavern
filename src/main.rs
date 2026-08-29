mod menu;
mod splash;

use bevy::input::mouse::{MouseScrollUnit, MouseWheel};
use bevy::prelude::*;

const APP_NAME: &str = "Tabletop Tavern";

/// Marks a scrollable `Node` (one with `Overflow::Scroll` on at least one axis) so
/// [`scroll_with_mouse_wheel`] knows to drive its `ScrollPosition` from wheel input. Without this,
/// `Overflow::Scroll` only clips overflowing content — nothing lets the player actually reach it,
/// which matters once a screen's content no longer fits a shrunk window.
#[derive(Component)]
pub(crate) struct Scrollable;

/// The high-level screen the app is currently showing.
#[derive(States, Debug, Clone, Copy, Eq, PartialEq, Hash, Default)]
pub(crate) enum AppState {
    #[default]
    Splash,
    Menu,
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
        .add_systems(Update, scroll_with_mouse_wheel)
        .add_plugins((splash::SplashPlugin, menu::MenuPlugin))
        .run();
}

fn spawn_camera(mut commands: Commands) {
    commands.spawn(Camera2d);
}

fn scroll_with_mouse_wheel(
    mut wheel_events: MessageReader<MouseWheel>,
    mut scrollables: Query<&mut ScrollPosition, With<Scrollable>>,
) {
    for event in wheel_events.read() {
        let delta = match event.unit {
            MouseScrollUnit::Line => Vec2::new(event.x, event.y) * 20.0,
            MouseScrollUnit::Pixel => Vec2::new(event.x, event.y),
        };
        for mut scroll_position in &mut scrollables {
            scroll_position.x -= delta.x;
            scroll_position.y -= delta.y;
        }
    }
}
