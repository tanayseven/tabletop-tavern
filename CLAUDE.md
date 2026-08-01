# Tabletop Tavern

A Bevy (Rust) game. Currently: a splash screen ("Created using Bevy") that
transitions into a menu screen listing tabletop games as buttons.

## Toolchain

All tools (Rust, cargo, wasm-bindgen-cli, butler, binaryen) are pinned and
managed via `mise` — see `mise.toml` and `mise.lock`. Run `mise install` once
per clone. Don't rely on a system-wide `cargo`/`rustc`; prefix commands with
`mise x --` (e.g. `mise x -- cargo check`) or `mise run run` to use the pinned
toolchain.

## Structure

- `src/main.rs` — app entry point, `AppState` (`Splash` → `Menu`)
- `src/splash.rs` — splash screen plugin
- `src/menu.rs` — menu screen plugin (game buttons, tooltips, quit button)

## Conventions

- Games listed in `menu::GAMES` are placeholders; every game button shows a
  "Work in progress" tooltip on hover until it's actually wired up.
- Bevy UI here follows the modern (0.15+) ECS pattern: `Node` for layout,
  required-components (e.g. `Text` requires `Node`/`TextFont`/`TextColor`),
  and `OnEnter`/`OnExit` state-scoped spawn/despawn per screen.
- This project pins bevy 0.19; check API changes against the vendored source
  in `~/.cargo/registry/src/*/bevy_*-0.19.0` before assuming older-bevy docs
  apply (e.g. `TextFont.font_size` is a `FontSize` enum, not `f32`; events are
  now `Message`/`MessageWriter`, not `Event`/`EventWriter`).

## CI/CD

- `.github/workflows/ci.yml` — fmt/clippy/test/build on every push and PR,
  across Linux/macOS/Windows. Keep `cargo fmt --all` clean before pushing;
  CI fails on unformatted code.
- `.github/workflows/release.yml` — triggered by a `v*.*.*` tag. Cross-builds
  Linux/Windows/macOS-universal/web, publishes to GitHub Releases, and (if
  `ITCH_TARGET`/`BUTLER_API_KEY` are set) pushes each build to itch.io via
  `butler`.
- The web build's `wasm-bindgen-cli` version must exactly match the
  `wasm-bindgen` crate version in `Cargo.lock` (schema-version check). The
  release workflow re-installs a matching `wasm-bindgen-cli` in CI rather
  than trusting mise's pin, in case they drift after a `cargo update`. If you
  bump bevy/wasm-bindgen locally, update `mise.toml`'s
  `cargo:wasm-bindgen-cli` pin to match too.

## Git

- Never add a co-author trailer (e.g. "Co-Authored-By: Claude") to commits.
