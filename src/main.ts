import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { initTheme } from './lib/theme.svelte'

// Before mounting, so the first thing the player sees is already in their
// chosen palette. Tauri's CSP rules out doing this from an inline script in
// index.html, which is the usual place for it.
initTheme()

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
