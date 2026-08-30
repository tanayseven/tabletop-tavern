use bevy::prelude::*;

use crate::AppState;

/// Image assets to preload, given as paths relative to the `assets/` directory. Add an entry
/// here for every image a screen needs at spawn time (board art, piece sprites, icons, ...) —
/// [`start_loading`] queues each one with the [`AssetServer`] and [`check_loading`] holds the
/// game on this screen until every handle finishes, so no screen ever spawns with a
/// still-downloading (and therefore invisible) image.
const IMAGE_ASSETS: &[&str] = &[
    // "images/board_wood.png",
];

pub struct LoadingPlugin;

impl Plugin for LoadingPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(
            OnEnter(AppState::Loading),
            (spawn_loading_screen, start_loading),
        )
        .add_systems(Update, check_loading.run_if(in_state(AppState::Loading)))
        .add_systems(OnExit(AppState::Loading), despawn_loading_screen);
    }
}

/// Handles for every asset queued by [`start_loading`]. Holding the handles (rather than just
/// firing off `asset_server.load` and discarding the result) is what keeps Bevy's asset server
/// from dropping the assets as unused before a screen gets a chance to reference them.
#[derive(Resource, Default)]
struct GameAssets {
    images: Vec<Handle<Image>>,
}

#[derive(Component)]
struct OnLoadingScreen;

#[derive(Component)]
struct ProgressBarFill;

fn start_loading(mut commands: Commands, asset_server: Res<AssetServer>) {
    let images = IMAGE_ASSETS
        .iter()
        .map(|path| asset_server.load(*path))
        .collect();
    commands.insert_resource(GameAssets { images });
}

fn spawn_loading_screen(mut commands: Commands) {
    commands
        .spawn((
            OnLoadingScreen,
            Node {
                width: Val::Percent(100.0),
                height: Val::Percent(100.0),
                flex_direction: FlexDirection::Column,
                align_items: AlignItems::Center,
                justify_content: JustifyContent::Center,
                row_gap: Val::Px(16.0),
                ..default()
            },
            BackgroundColor(Color::BLACK),
        ))
        .with_children(|parent| {
            parent.spawn((
                Text::new("Loading..."),
                TextFont {
                    font_size: FontSize::Px(28.0),
                    ..default()
                },
                TextColor(Color::WHITE),
            ));

            parent
                .spawn((
                    Node {
                        width: Val::Px(300.0),
                        height: Val::Px(20.0),
                        ..default()
                    },
                    BackgroundColor(Color::srgb(0.2, 0.2, 0.25)),
                ))
                .with_children(|track| {
                    track.spawn((
                        ProgressBarFill,
                        Node {
                            width: Val::Percent(0.0),
                            height: Val::Percent(100.0),
                            ..default()
                        },
                        BackgroundColor(Color::srgb(0.15, 0.5, 0.25)),
                    ));
                });
        });
}

fn check_loading(
    asset_server: Res<AssetServer>,
    assets: Res<GameAssets>,
    mut next_state: ResMut<NextState<AppState>>,
    mut fills: Query<&mut Node, With<ProgressBarFill>>,
) {
    let total = assets.images.len();
    // No assets queued yet (the common case until real artwork lands): skip straight through
    // rather than getting stuck showing a loading screen for nothing to load.
    if total == 0 {
        next_state.set(AppState::Menu);
        return;
    }

    let loaded = assets
        .images
        .iter()
        .filter(|handle| asset_server.is_loaded_with_dependencies(handle.id()))
        .count();

    let fraction = loaded as f32 / total as f32;
    for mut node in &mut fills {
        node.width = Val::Percent(fraction * 100.0);
    }

    if loaded == total {
        next_state.set(AppState::Menu);
    }
}

fn despawn_loading_screen(mut commands: Commands, query: Query<Entity, With<OnLoadingScreen>>) {
    for entity in &query {
        commands.entity(entity).despawn();
    }
    commands.remove_resource::<GameAssets>();
}
