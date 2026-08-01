use bevy::prelude::*;

use crate::AppState;

const SPLASH_DURATION_SECS: f32 = 2.0;

pub struct SplashPlugin;

impl Plugin for SplashPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(OnEnter(AppState::Splash), spawn_splash)
            .add_systems(Update, countdown.run_if(in_state(AppState::Splash)))
            .add_systems(OnExit(AppState::Splash), despawn_splash);
    }
}

#[derive(Component)]
struct OnSplashScreen;

#[derive(Resource, Deref, DerefMut)]
struct SplashTimer(Timer);

fn spawn_splash(mut commands: Commands) {
    commands.insert_resource(SplashTimer(Timer::from_seconds(
        SPLASH_DURATION_SECS,
        TimerMode::Once,
    )));

    commands
        .spawn((
            OnSplashScreen,
            Node {
                width: Val::Percent(100.0),
                height: Val::Percent(100.0),
                align_items: AlignItems::Center,
                justify_content: JustifyContent::Center,
                ..default()
            },
            BackgroundColor(Color::BLACK),
        ))
        .with_children(|parent| {
            parent.spawn((
                Text::new("Created using Bevy"),
                TextFont {
                    font_size: FontSize::Px(48.0),
                    ..default()
                },
                TextColor(Color::WHITE),
            ));
        });
}

fn countdown(
    mut next_state: ResMut<NextState<AppState>>,
    time: Res<Time>,
    mut timer: ResMut<SplashTimer>,
) {
    if timer.tick(time.delta()).just_finished() {
        next_state.set(AppState::Menu);
    }
}

fn despawn_splash(mut commands: Commands, query: Query<Entity, With<OnSplashScreen>>) {
    for entity in &query {
        commands.entity(entity).despawn();
    }
    commands.remove_resource::<SplashTimer>();
}
