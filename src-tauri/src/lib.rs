#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default().setup(|app| {
    if cfg!(debug_assertions) {
      app.handle().plugin(
        tauri_plugin_log::Builder::default()
          .level(log::LevelFilter::Info)
          .build(),
      )?;
    }
    Ok(())
  });

  // Desktop only: mobile platforms manage app lifecycle themselves, and the UI
  // hides the Quit button there anyway (see src/lib/platform.ts).
  #[cfg(not(any(target_os = "android", target_os = "ios")))]
  let builder = builder.plugin(tauri_plugin_process::init());

  builder
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
