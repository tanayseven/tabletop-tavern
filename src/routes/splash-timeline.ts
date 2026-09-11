/**
 * The splash fade timeline, carried over from the Bevy build's splash screen.
 *
 * Kept in its own module because Splash.svelte's CSS has to hardcode the
 * keyframe offsets -- `var()` is not allowed in a `@keyframes` selector -- so
 * these values and those percentages can drift apart silently. The test beside
 * this file pins them together.
 */
export const FADE_IN_MS = 3000
export const HOLD_MS = 2000
export const FADE_OUT_MS = 2000
export const TOTAL_MS = FADE_IN_MS + HOLD_MS + FADE_OUT_MS

/** Offset at which the fade-in completes, as a percentage of the timeline. */
export const FADE_IN_PCT = (FADE_IN_MS / TOTAL_MS) * 100

/** Offset at which the hold ends and the fade-out begins. */
export const HOLD_END_PCT = ((FADE_IN_MS + HOLD_MS) / TOTAL_MS) * 100
