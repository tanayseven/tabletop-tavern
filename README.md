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
```
