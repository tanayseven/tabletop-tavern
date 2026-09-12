# Tabletop Tavern

A collection of classic tabletop games, playable in a browser, on the desktop,
and (soon) on a phone — all from one codebase.

Built with Svelte 5 + TypeScript, packaged for the desktop with Tauri v2.

## Prerequisites

All tools are pinned with [mise](https://mise.jdx.dev). Once per clone:

```sh
mise install
pnpm install
```

Building the **desktop** app additionally needs Tauri's system dependencies —
see the [Tauri prerequisites](https://tauri.app/start/prerequisites/). On
Debian/Ubuntu:

```sh
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

## Running

```sh
pnpm dev              # in a browser, with hot reload
pnpm desktop          # as a desktop app
```

## What's here

- A splash screen, then a menu of ten games.
- **Tic Tac Toe** is playable: hot-seat or against a computer opponent at four
  difficulty levels, with a coin toss, mark choice and a session scoreboard.
- **Advanced Tic Tac Toe** is playable: the variant usually called Ultimate Tic
  Tac Toe, on nine small boards, where the cell you play inside a board decides
  which board your opponent must play in next. Same setup flow and four
  difficulty levels.
- The other eight are placeholders and show a "Coming soon" label.

## Development

```sh
pnpm lint             # Prettier + ESLint
pnpm check            # svelte-check + tsc
pnpm test             # Vitest unit and component tests
pnpm e2e              # Playwright, against a production build
pnpm build            # production build into dist/
pnpm desktop:build    # desktop bundles (deb/AppImage, msi, dmg)
```

### Adding a game

1. Create `src/games/<id>/` with a root `.svelte` component, keeping the rules
   in a plain `.ts` file beside it so they can be unit-tested directly.
2. Register it in `src/lib/games.ts`:

```ts
{
  id: 'chess',
  title: 'Chess',
  status: 'ready',
  load: () => import('../games/chess/Chess.svelte'),
}
```

The menu, the `#/game/chess` route and code splitting all follow from that
entry. Games left at `status: 'wip'` render as non-interactive placeholders.

## Project layout

```
src/
  lib/games.ts          the game registry — start here
  lib/router.svelte.ts  hash router
  lib/platform.ts       web / desktop / mobile differences
  routes/               Splash, Menu, GameHost
  components/           GameCard
  games/<id>/           one directory per game
src-tauri/              Tauri shell (Rust; not touched to add a game)
e2e/                    Playwright specs
```

## Releasing

Push a tag:

```sh
git tag v0.1.0 && git push origin v0.1.0
```

That builds desktop bundles for Linux, Windows and macOS (universal) plus a web
build, and publishes them to GitHub Releases.

To also publish to itch.io, set the repo variable `ITCH_TARGET` to your
`user/game` slug and the repo secret `BUTLER_API_KEY` to an
[itch.io API key](https://itch.io/user/settings/api-keys). Without both, the
itch step is skipped.

## History

This started as a [Bevy](https://bevyengine.org) (Rust) app. It was migrated to
TypeScript to make web, desktop and mobile a single build rather than four
cross-compilation targets. The Bevy version is preserved in git history at
commit `5992733`.
