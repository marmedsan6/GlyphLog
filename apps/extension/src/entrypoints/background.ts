/**
 * GlyphLog Companion — Background Service Worker (Manifest V3)
 * Minimal background script requerido para Manifest V3 en WXT.
 */

import { defineBackground } from 'wxt/sandbox';
import {
  buildApiRequest,
  getApiErrorMessage,
  type APIRequestMessage,
} from '~/background-request';
import { DEFAULT_API_BASE_URL } from '~/config';

export default defineBackground((): void => {
  chrome.runtime.onInstalled.addListener(() => {
    console.log('GlyphLog Companion instalado correctamente.');
  });

  chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'GLYPHLOG_PING') {
      chrome.storage.local.get(['device_token'], (result) => {
        sendResponse({
          version: chrome.runtime.getManifest().version,
          paired: Boolean(result.device_token),
        });
      });
      return true;
    }

    if (message?.type === 'GLYPHLOG_CLEAR_TOKEN') {
      chrome.storage.local.remove(['device_token', 'device_name'], () => {
        sendResponse({ ok: true });
      });
      return true;
    }

    sendResponse({ ok: false });
    return false;
  });

  // Listener adicional: logging para debugging
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'DEBUG_GET_STORAGE') {
      console.log('[Background] DEBUG_GET_STORAGE request');
      chrome.storage.local.get(null, (result) => {
        console.log('[Background] Storage:', result);
        sendResponse({ storage: result, timestamp: new Date().toISOString() });
      });
      return true; // async response
    }

    if (message.type === 'LOG') {
      console.log('[Content]', message.data);
      sendResponse({ received: true });
      return;
    }

    if (message.type === 'GET_DEVICE_TOKEN') {
      console.log('[Background] GET_DEVICE_TOKEN request from', sender.tab?.url);
      chrome.storage.local.get(['device_token'], (result) => {
        console.log('[Background] Token found:', !!result.device_token);
        sendResponse({ device_token: result.device_token || null });
      });
      return true; // async response
    }

    if (message.type === 'MEDIA_DETECTED') {
      console.log('[Background] MEDIA_DETECTED', message.data);
      sendResponse({ received: true });
      return;
    }

    if (message.type === 'API_REQUEST') {
      const apiMessage = message as unknown as APIRequestMessage;
      console.log('[Background] API_REQUEST', apiMessage.method, apiMessage.endpoint);
      chrome.storage.local.get(['device_token', 'api_base_url'], (result) => {
        const { url, options } = buildApiRequest(
          apiMessage,
          result.api_base_url || DEFAULT_API_BASE_URL,
          result.device_token
        );

        fetch(url, options)
          .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (response.status === 401) {
              sendResponse({
                ok: false,
                status: 401,
                error: 'No autorizado. Vuelve a emparejar la extensión desde GlyphLog.',
              });
              return;
            }
            if (!response.ok) {
              sendResponse({
                ok: false,
                status: response.status,
                error: getApiErrorMessage(data, response.statusText),
              });
              return;
            }
            sendResponse({ ok: true, data });
          })
          .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : 'Error de red';
            console.error('[Background] API_REQUEST error:', error);
            sendResponse({ ok: false, error: message });
          });
      });
      return true; // async response
    }
  });
});
