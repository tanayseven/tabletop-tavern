use bevy::prelude::*;

// The standard button color triple used across every screen's plain (non-square) buttons.
pub(crate) const NORMAL_BUTTON: Color = Color::srgb(0.2, 0.2, 0.25);
pub(crate) const HOVERED_BUTTON: Color = Color::srgb(0.3, 0.3, 0.4);
pub(crate) const PRESSED_BUTTON: Color = Color::srgb(0.15, 0.5, 0.25);

/// Size (in px) for a square UI element that scales with the smaller viewport dimension (vmin),
/// clamped to a min/max px range so it doesn't become unreadably small or comically large at
/// extreme window sizes/aspect ratios.
pub(crate) fn square_button_size(window: &Window, vmin: f32, min_px: f32, max_px: f32) -> f32 {
    (window.width().min(window.height()) * vmin / 100.0).clamp(min_px, max_px)
}
