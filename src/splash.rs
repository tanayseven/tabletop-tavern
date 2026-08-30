use bevy::prelude::*;

use crate::AppState;

const FADE_IN_SECS: f32 = 3.0;
const HOLD_SECS: f32 = 2.0;
const FADE_OUT_SECS: f32 = 2.0;
const TOTAL_SECS: f32 = FADE_IN_SECS + HOLD_SECS + FADE_OUT_SECS;

pub struct SplashPlugin;

impl Plugin for SplashPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(OnEnter(AppState::Splash), spawn_splash)
            .add_systems(
                Update,
                (fade_and_advance, skip_on_input).run_if(in_state(AppState::Splash)),
            )
            .add_systems(OnExit(AppState::Splash), despawn_splash);
    }
}

#[derive(Component)]
struct OnSplashScreen;

/// Marks every splash element whose alpha should track the fade timeline, so
/// [`fade_and_advance`] can drive them all from one elapsed-time calculation instead of each
/// element (text, logo, ...) needing its own timer/animation bookkeeping.
#[derive(Component)]
struct Fadeable;

#[derive(Resource, Default)]
struct SplashElapsed(f32);

fn spawn_splash(mut commands: Commands, asset_server: Res<AssetServer>) {
    commands.insert_resource(SplashElapsed::default());

    // Bevy's asset loading is asynchronous: this handle is returned immediately and the image
    // pops in once the background load finishes, without blocking splash spawn. In practice the
    // 3-second fade-in gives it plenty of time to finish well before it's visible.
    let logo: Handle<Image> = asset_server.load("images/bevy_logo.png");

    commands
        .spawn((
            OnSplashScreen,
            Node {
                width: Val::Percent(100.0),
                height: Val::Percent(100.0),
                flex_direction: FlexDirection::Column,
                align_items: AlignItems::Center,
                justify_content: JustifyContent::Center,
                row_gap: Val::Px(24.0),
                ..default()
            },
            BackgroundColor(Color::BLACK),
        ))
        .with_children(|parent| {
            parent.spawn((
                Fadeable,
                Text::new("Created using"),
                TextFont {
                    font_size: FontSize::Px(32.0),
                    ..default()
                },
                TextColor(Color::WHITE),
            ));

            parent.spawn((
                Fadeable,
                ImageNode::new(logo),
                // The wordmark logo is a wide 4:1 image (800x200px source); an explicit
                // width/height pair matching that ratio keeps it from being stretched into a
                // square, which a naive equal width/height would do.
                Node {
                    width: Val::Px(320.0),
                    height: Val::Px(80.0),
                    ..default()
                },
            ));

            parent.spawn((
                Fadeable,
                Text::new("Game Engine"),
                TextFont {
                    font_size: FontSize::Px(32.0),
                    ..default()
                },
                TextColor(Color::WHITE),
            ));
        });
}

/// Alpha for the fade-in / hold / fade-out timeline at `elapsed` seconds into the splash screen,
/// as a fraction of each phase's own duration rather than of the whole timeline.
fn fade_alpha(elapsed: f32) -> f32 {
    if elapsed < FADE_IN_SECS {
        elapsed / FADE_IN_SECS
    } else if elapsed < FADE_IN_SECS + HOLD_SECS {
        1.0
    } else {
        let fade_out_elapsed = elapsed - FADE_IN_SECS - HOLD_SECS;
        (1.0 - fade_out_elapsed / FADE_OUT_SECS).max(0.0)
    }
}

fn fade_and_advance(
    time: Res<Time>,
    mut elapsed: ResMut<SplashElapsed>,
    mut next_state: ResMut<NextState<AppState>>,
    mut text_colors: Query<&mut TextColor, With<Fadeable>>,
    mut image_nodes: Query<&mut ImageNode, With<Fadeable>>,
) {
    elapsed.0 += time.delta_secs();
    let alpha = fade_alpha(elapsed.0);

    for mut text_color in &mut text_colors {
        text_color.0.set_alpha(alpha);
    }
    for mut image_node in &mut image_nodes {
        image_node.color.set_alpha(alpha);
    }

    if elapsed.0 >= TOTAL_SECS {
        next_state.set(AppState::Loading);
    }
}

/// Any key press or mouse click skips straight past the fade timeline to the next screen — a
/// returning player shouldn't have to sit through 7 seconds of splash every time.
fn skip_on_input(
    keys: Res<ButtonInput<KeyCode>>,
    mouse_buttons: Res<ButtonInput<MouseButton>>,
    mut next_state: ResMut<NextState<AppState>>,
) {
    if keys.get_just_pressed().next().is_some() || mouse_buttons.get_just_pressed().next().is_some()
    {
        next_state.set(AppState::Loading);
    }
}

fn despawn_splash(mut commands: Commands, query: Query<Entity, With<OnSplashScreen>>) {
    for entity in &query {
        commands.entity(entity).despawn();
    }
    commands.remove_resource::<SplashElapsed>();
}
