import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Fuentes self-host (Fontsource) — sin dependencia de CDN.
import '@fontsource-variable/fraunces'
import '@fontsource-variable/fraunces/wght-italic.css'
import '@fontsource-variable/inter'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import '@fontsource/ibm-plex-mono/700.css'
import { App } from './App'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('[GlyphLog] No se encontró el elemento #root en el DOM. Verifica index.html.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
