/**
 * GlyphLog Companion — Service Worker (Manifest V3)
 * Minimal background script required for Manifest V3.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('GlyphLog Companion instalado correctamente.');
});
