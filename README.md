# Tabletop Tavern

A tabletop game collection built with [Bevy](https://bevy.org).

## Prerequisites

This project uses [mise](https://mise.jdx.dev) to pin and install its
toolchain (Rust, `wasm-bindgen-cli`, itch.io's `butler`, and `binaryen`).

```sh
mise install
```

## Running

```sh
mise run run
```

or, equivalently:

```sh
mise x -- cargo run
```

## What's here

- A splash screen ("Created using Bevy")
- A menu screen listing available games as buttons (hover an unfinished game
  for a "Work in progress" tooltip)
- A Quit button

## Project layout

```
src/
  main.rs    # app entry point, screen states
  splash.rs  # splash screen
  menu.rs    # menu screen, game list, quit button
web/
  index.html # HTML shell for the wasm/web build
```

## CI/CD

- **CI** (`.github/workflows/ci.yml`) runs on every push to `main` and every
  PR: `cargo fmt --check`, `cargo clippy`, `cargo test`, and a release build,
  each on Linux, macOS, and Windows.
- **Release** (`.github/workflows/release.yml`) runs when a tag matching
  `v*.*.*` is pushed. It builds Linux (x86_64), Windows (x86_64), macOS
  (universal x86_64+arm64), and a web/wasm build; attaches all of them to a
  GitHub Release; and, if configured, pushes each build to itch.io via
  `butler`.

To enable the itch.io publish step, set in the repo's GitHub settings:

- Variable `ITCH_TARGET` — your `user/game` itch.io slug
- Secret `BUTLER_API_KEY` — an itch.io API key
  (https://itch.io/user/settings/api-keys)

Without both, the itch.io job is skipped automatically and only the GitHub
Release is published.

To cut a release:

```sh
git tag v0.1.0
git push origin v0.1.0
```
