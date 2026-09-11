/**
 * Which shell the app is running inside.
 *
 * This replaces the Bevy build's `#[cfg(not(target_arch = "wasm32"))]` gates.
 * There, "not wasm" meant "native desktop"; here the same distinction has to be
 * made at runtime, because one bundle runs in all three places.
 */

/** Tauri v2 injects this before any app code runs. */
const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/**
 * Detected from the webview's user agent rather than `@tauri-apps/plugin-os`,
 * which would pull in another plugin and an async call just to decide whether
 * to render one button.
 */
const mobileWebview =
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

/** True only in the desktop app: the one place a Quit button makes sense. */
export const isDesktopApp = inTauri && !mobileWebview

/** True in a browser tab, where closing is the tab's job, not the app's. */
export const isWeb = !inTauri

/**
 * Exit the desktop app. No-op anywhere else: a browser tab has no process to
 * end, and mobile platforms expect the OS to manage app lifecycle (iOS's HIG
 * explicitly discourages a self-quit control).
 */
export async function quitApp(): Promise<void> {
  if (!isDesktopApp) return
  const { exit } = await import('@tauri-apps/plugin-process')
  await exit(0)
}
