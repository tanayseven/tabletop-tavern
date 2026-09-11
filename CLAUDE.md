# Tabletop Tavern

A collection of tabletop games, built as a Svelte 5 + TypeScript SPA and shipped
to web, desktop (Tauri v2) and — eventually — mobile from one codebase.

Currently: a splash screen that transitions into a menu of game buttons. Tic Tac
Toe is playable; the other nine entries are placeholders.

This was a Bevy (Rust) app until the migration on the `ts-migration` branch. If
you need the original, it's at commit `5992733`.

## Toolchain

Node, pnpm, Rust and butler are pinned via `mise` — see `mise.toml` and
`mise.lock`. Run `mise install` once per clone. Don't rely on a system-wide
`node`/`pnpm`; prefix commands with `mise x --` (e.g. `mise x -- pnpm test`) or
use the `mise run` tasks.

Rust is still pinned because **Tauri's shell is Rust**. It is a build-time
dependency of packaging only — no application logic lives in `src-tauri/`, and
adding a game never means touching Rust.

## Commands

| Command              | What it does                                    |
| -------------------- | ----------------------------------------------- |
| `pnpm dev`           | Vite dev server with hot reload                 |
| `pnpm build`         | Production build into `dist/`                   |
| `pnpm lint`          | Prettier check + ESLint                         |
| `pnpm format`        | Prettier write                                  |
| `pnpm check`         | `svelte-check` + `tsc` (types inside templates) |
| `pnpm test`          | Vitest unit + component tests                   |
| `pnpm e2e`           | Playwright, against a real production build     |
| `pnpm desktop`       | `tauri dev` — the desktop app                   |
| `pnpm desktop:build` | `tauri build` — desktop bundles                 |

CI runs `lint`, `check`, `test`, `build` and `e2e`. Keep `pnpm lint` clean before
pushing; CI fails on unformatted code.

## Structure

- `src/main.ts`, `src/App.svelte` — entry point and route outlet
- `src/app.css` — design tokens (see below) and resets
- `src/lib/games.ts` — **the game registry**; single source of truth for the menu
  and for `/game/:id` routing
- `src/lib/router.svelte.ts` — hash router (`#/`, `#/menu`, `#/game/:id`)
- `src/lib/platform.ts` — `isDesktopApp` / `isWeb` / `quitApp()`
- `src/routes/` — `Splash`, `Menu`, `GameHost`
- `src/components/GameCard.svelte` — one menu button
- `src/games/<id>/` — one directory per game
- `src-tauri/` — the Tauri shell
- `e2e/` — Playwright specs

## Conventions

### Adding a game

1. Create `src/games/<id>/`, with the root component and any logic in plain `.ts`
   next to it (see `tic-tac-toe/logic.ts` — pure functions, easy to unit test).
2. Add an entry to `GAMES` in `src/lib/games.ts` with `status: 'ready'` and a
   `load: () => import(...)`.

Nothing else needs to change. The dynamic import is what keeps each game in its
own chunk, so the menu doesn't pay for games nobody opened. Games without a
`load` render as "Work in progress" and are non-interactive.

### Design tokens

All colours, spacing and font sizes live as custom properties in `src/app.css`
and are carried over from the Bevy build (its `Color::srgb()` values ×255).
Don't hardcode colours in a component — use the variables.

### Layout traps this codebase has already hit

- **Never centre a scrollable container with `justify-content: center`.**
  Overflow goes off the _top_, where scrolling can't reach it. `safe center` is
  the documented fix, but Vite's CSS minifier drops the `safe` keyword and
  silently restores the bug. Use `margin-block: auto` on the content instead —
  see `Menu.svelte`. There's a regression test in `e2e/app.spec.ts`.
- **Hover is not universal.** Hover-only affordances are invisible on a phone.
  Gate them on `@media (hover: hover) and (pointer: fine)` and provide an
  always-visible fallback, as `GameCard.svelte` does for the WIP note.
- **Text inside a button becomes part of its accessible name.** If a button
  carries supplementary text, give it an explicit `aria-label` so screen readers
  announce the name and the description separately.

### Platform differences

Quit exists only in the desktop app. That's gated in three places which must
stay in agreement: the `cfg` in `src-tauri/Cargo.toml`, `platforms` in
`src-tauri/capabilities/desktop.json`, and `isDesktopApp` in
`src/lib/platform.ts`. Web has no process to exit; mobile shouldn't self-quit.

### Tauri

`tauri.conf.json` sets a strict CSP. `style-src` allows `'unsafe-inline'`
because `index.html` carries an inline anti-flash background style; `script-src`
is `'self'` and should stay that way.

## CI/CD

- `.github/workflows/ci.yml` — a `web` job (lint/check/test/build/e2e on Linux)
  and a `desktop` job (`cargo check` of the Tauri shell across Linux/macOS/
  Windows).
- `.github/workflows/release.yml` — triggered by a `v*.*.*` tag. Creates a draft
  release, builds desktop bundles via `tauri-apps/tauri-action`, builds and zips
  the web app, undrafts, and pushes the web build to itch.io's `html5` channel
  if `ITCH_TARGET`/`BUTLER_API_KEY` are set.
- Mobile is not wired into CI. `tauri android init` / `tauri ios init` work
  locally, but signed release builds need an Android keystore and Apple
  certificates as repo secrets.

## Git

- Never add a co-author trailer (e.g. "Co-Authored-By: Claude") to commits.
