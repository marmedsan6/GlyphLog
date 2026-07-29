/**
 * GlyphLog Companion — Extension Popup (TypeScript con WXT)
 * Vanilla TypeScript con tipos en todos los elementos DOM y funciones API.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PopupState {
  token: string | null;
  deviceName: string | null;
  apiBaseUrl: string;
  currentEntry: EntryData | null;
  searchTimeout: NodeJS.Timeout | null;
}

interface EntryData {
  id: string;
  title: string;
  type: string;
  status: string;
  rating?: number;
  year?: number;
  cover_image?: string;
  progress_unit?: string;
  progress_total?: number;
  current_progress?: number;
}

interface PaginatedEntriesResponse {
  entries: EntryData[];
  total: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

const state: PopupState = {
  token: null,
  deviceName: null,
  apiBaseUrl: 'http://localhost:8000',
  currentEntry: null,
  searchTimeout: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// DOM Elements
// ─────────────────────────────────────────────────────────────────────────────

const screens = {
  pairing: document.getElementById('screen-pairing') as HTMLDivElement,
  main: document.getElementById('screen-main') as HTMLDivElement,
  detail: document.getElementById('screen-detail') as HTMLDivElement,
  settings: document.getElementById('screen-settings') as HTMLDivElement,
};

const pairingCodeInput = document.getElementById('pairing-code-input') as HTMLInputElement;
const btnPair = document.getElementById('btn-pair') as HTMLButtonElement;
const pairingError = document.getElementById('pairing-error') as HTMLParagraphElement;
const apiUrlInput = document.getElementById('api-url-input') as HTMLInputElement;

const searchInput = document.getElementById('search-input') as HTMLInputElement;
const entriesList = document.getElementById('entries-list') as HTMLDivElement;
const btnSettings = document.getElementById('btn-settings') as HTMLButtonElement;

const btnBack = document.getElementById('btn-back') as HTMLButtonElement;
const detailTitle = document.getElementById('detail-title') as HTMLSpanElement;
const detailType = document.getElementById('detail-type') as HTMLSpanElement;
const detailStatus = document.getElementById('detail-status') as HTMLSpanElement;
const progressBar = document.getElementById('progress-bar') as HTMLDivElement;
const progressText = document.getElementById('progress-text') as HTMLParagraphElement;
const progressValueInput = document.getElementById('progress-value-input') as HTMLInputElement;
const btnIncrement = document.getElementById('btn-increment') as HTMLButtonElement;
const btnDecrement = document.getElementById('btn-decrement') as HTMLButtonElement;
const noteInput = document.getElementById('note-input') as HTMLInputElement;
const btnUpdate = document.getElementById('btn-update') as HTMLButtonElement;
const detailError = document.getElementById('detail-error') as HTMLParagraphElement;

const btnBackSettings = document.getElementById('btn-back-settings') as HTMLButtonElement;
const deviceNameEl = document.getElementById('device-name') as HTMLParagraphElement;
const settingsApiUrlInput = document.getElementById('settings-api-url') as HTMLInputElement;
const btnSaveSettings = document.getElementById('btn-save-settings') as HTMLButtonElement;
const btnUnpair = document.getElementById('btn-unpair') as HTMLButtonElement;
const toastEl = document.getElementById('toast') as HTMLDivElement;
const toastMessageEl = document.getElementById('toast-message') as HTMLSpanElement;

// ─────────────────────────────────────────────────────────────────────────────
// Storage Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function loadStorage(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['device_token', 'device_name', 'api_base_url'], (res) => {
      state.token = res.device_token || null;
      state.deviceName = res.device_name || null;
      state.apiBaseUrl = res.api_base_url || 'http://localhost:8000';
      resolve();
    });
  });
}

async function saveStorage(data: Record<string, any>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

async function clearStorage(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['device_token', 'device_name'], resolve);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UI Navigation
// ─────────────────────────────────────────────────────────────────────────────

function showScreen(screenName: keyof typeof screens): void {
  Object.entries(screens).forEach(([name, el]) => {
    if (el) {
      el.style.display = name === screenName ? 'flex' : 'none';
    }
  });
}

function showToast(message: string): void {
  toastMessageEl.textContent = message;
  toastEl.style.display = 'block';
  setTimeout(() => {
    toastEl.style.display = 'none';
  }, 2500);
}

// ─────────────────────────────────────────────────────────────────────────────
// API Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${state.apiBaseUrl.replace(/\/+$/, '')}/api/v1${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    // Token revocado o inválido
    await clearStorage();
    state.token = null;
    showScreen('pairing');
    throw new Error('Sesión expirada o token revocado. Vuelve a emparejar.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Error (${res.status})`);
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pairing Handler
// ─────────────────────────────────────────────────────────────────────────────

pairingCodeInput.addEventListener('input', () => {
  const val = pairingCodeInput.value.trim();
  btnPair.disabled = val.length < 6;
});

btnPair.addEventListener('click', async () => {
  pairingError.style.display = 'none';
  btnPair.disabled = true;
  btnPair.textContent = 'Emparejando...';

  state.apiBaseUrl = apiUrlInput.value.trim() || 'http://localhost:8000';

  try {
    const res = await apiFetch('/devices/activate', {
      method: 'POST',
      body: JSON.stringify({
        pairing_code: pairingCodeInput.value.trim().toUpperCase(),
        device_name: 'Extensión Chrome',
      }),
    });

    state.token = res.device_token;
    state.deviceName = res.device_name;

    await saveStorage({
      device_token: res.device_token,
      device_name: res.device_name,
      api_base_url: state.apiBaseUrl,
    });

    showToast('¡Emparejado con éxito!');
    showScreen('main');
    fetchEntries();
  } catch (err) {
    pairingError.textContent = (err as Error).message;
    pairingError.style.display = 'block';
  } finally {
    btnPair.disabled = false;
    btnPair.textContent = 'Emparejar';
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Search & Entries List
// ─────────────────────────────────────────────────────────────────────────────

searchInput.addEventListener('input', () => {
  if (state.searchTimeout) {
    clearTimeout(state.searchTimeout);
  }
  state.searchTimeout = setTimeout(() => {
    fetchEntries(searchInput.value.trim());
  }, 300);
});

async function fetchEntries(query: string = ''): Promise<void> {
  entriesList.innerHTML = '<p class="empty-state">Cargando...</p>';

  try {
    const endpoint = query
      ? `/entries/?search=${encodeURIComponent(query)}&limit=10`
      : '/entries/?limit=10';
    const data = await apiFetch(endpoint) as PaginatedEntriesResponse;

    if (!data.entries || data.entries.length === 0) {
      entriesList.innerHTML = query
        ? '<p class="empty-state">No se encontraron entradas</p>'
        : '<p class="empty-state">Tu colección está vacía</p>';
      return;
    }

    renderEntries(data.entries);
  } catch (err) {
    entriesList.innerHTML = `<p class="error-text">${(err as Error).message}</p>`;
  }
}

function renderEntries(entries: EntryData[]): void {
  entriesList.innerHTML = '';
  entries.forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'entry-card';

    const current = entry.current_progress ?? 0;
    const total = entry.progress_total !== null && entry.progress_total !== undefined
      ? entry.progress_total
      : '—';
    const unit = entry.progress_unit || '';

    let coverHtml = `<div class="entry-cover-placeholder">📖</div>`;
    if (entry.cover_image) {
      const coverUrl = entry.cover_image.startsWith('http')
        ? entry.cover_image
        : `${state.apiBaseUrl.replace(/\/+$/, '')}/${entry.cover_image.replace(/^\/+/, '')}`;
      coverHtml = `<img class="entry-cover" src="${coverUrl}" alt="Portada" />`;
    }

    card.innerHTML = `
      ${coverHtml}
      <div class="entry-info">
        <div class="entry-title">${escapeHtml(entry.title)}</div>
        <div class="entry-sub">
          <span class="badge">${entry.type}</span>
          <span>${current} / ${total} ${unit}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => openDetail(entry));
    entriesList.appendChild(card);
  });
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>'"]/g, (tag) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[tag] || tag);
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail & Progress Update
// ─────────────────────────────────────────────────────────────────────────────

function openDetail(entry: EntryData): void {
  state.currentEntry = entry;
  detailTitle.textContent = entry.title;
  detailType.textContent = entry.type;
  detailStatus.textContent = entry.status;

  const current = entry.current_progress ?? 0;
  const total = entry.progress_total;
  const unit = entry.progress_unit || '';

  progressValueInput.value = String(current);
  if (total !== null && total !== undefined) {
    progressValueInput.max = String(total);
  }
  noteInput.value = '';
  detailError.style.display = 'none';

  updateProgressDisplay(current, total, unit);
  showScreen('detail');
}

function updateProgressDisplay(current: number, total: number | undefined, unit: string): void {
  const totalText = total !== null && total !== undefined ? total : '—';
  progressText.textContent = `${current} / ${totalText} ${unit}`;

  if (total !== null && total !== undefined && total > 0) {
    const pct = Math.min(100, Math.round((current / total) * 100));
    progressBar.style.width = `${pct}%`;
  } else {
    progressBar.style.width = '0%';
  }
}

btnIncrement.addEventListener('click', () => {
  let val = parseInt(progressValueInput.value, 10) || 0;
  const max = state.currentEntry?.progress_total;
  if (max === null || max === undefined || val < max) {
    val += 1;
    progressValueInput.value = String(val);
    updateProgressDisplay(val, max, state.currentEntry?.progress_unit || '');
  }
});

btnDecrement.addEventListener('click', () => {
  let val = parseInt(progressValueInput.value, 10) || 0;
  if (val > 0) {
    val -= 1;
    progressValueInput.value = String(val);
    updateProgressDisplay(val, state.currentEntry?.progress_total, state.currentEntry?.progress_unit || '');
  }
});

progressValueInput.addEventListener('input', () => {
  const val = parseInt(progressValueInput.value, 10) || 0;
  updateProgressDisplay(val, state.currentEntry?.progress_total, state.currentEntry?.progress_unit || '');
});

btnUpdate.addEventListener('click', async () => {
  if (!state.currentEntry) return;

  detailError.style.display = 'none';
  btnUpdate.disabled = true;
  btnUpdate.textContent = 'Guardando...';

  const newValue = parseInt(progressValueInput.value, 10) || 0;
  const note = noteInput.value.trim() || null;

  try {
    const updatedEntry = await apiFetch(
      `/entries/${state.currentEntry.id}/progress`,
      {
        method: 'POST',
        body: JSON.stringify({
          new_value: newValue,
          note: note,
        }),
      }
    );

    showToast('Progreso actualizado');
    openDetail(updatedEntry);
  } catch (err) {
    detailError.textContent = (err as Error).message;
    detailError.style.display = 'block';
  } finally {
    btnUpdate.disabled = false;
    btnUpdate.textContent = 'Actualizar progreso';
  }
});

btnBack.addEventListener('click', () => {
  showScreen('main');
  fetchEntries(searchInput.value.trim());
});

// ─────────────────────────────────────────────────────────────────────────────
// Settings & Unpair
// ─────────────────────────────────────────────────────────────────────────────

btnSettings.addEventListener('click', () => {
  deviceNameEl.textContent = state.deviceName || 'Extensión Chrome';
  settingsApiUrlInput.value = state.apiBaseUrl;
  showScreen('settings');
});

btnBackSettings.addEventListener('click', () => {
  showScreen('main');
});

btnSaveSettings.addEventListener('click', async () => {
  state.apiBaseUrl = settingsApiUrlInput.value.trim() || 'http://localhost:8000';
  await saveStorage({ api_base_url: state.apiBaseUrl });
  showToast('Configuración guardada');
  showScreen('main');
});

btnUnpair.addEventListener('click', async () => {
  if (confirm('¿Seguro que quieres desvincular esta extensión de GlyphLog?')) {
    await clearStorage();
    state.token = null;
    showToast('Dispositivo desvinculado');
    showScreen('pairing');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  await loadStorage();
  apiUrlInput.value = state.apiBaseUrl;

  if (state.token) {
    showScreen('main');
    fetchEntries();
  } else {
    // DEBUG MODE: Allow injecting a test token via localStorage flag
    const debugToken = localStorage.getItem('__glyphlog_debug_token');
    if (debugToken) {
      console.log('[DEBUG] Injecting test token from localStorage');
      state.token = debugToken;
      state.deviceName = 'Debug Device';
      await new Promise<void>((resolve) => {
        chrome.storage.local.set(
          {
            device_token: debugToken,
            device_name: 'Debug Device',
            api_base_url: state.apiBaseUrl,
          },
          () => {
            console.log('[DEBUG] Test token saved to storage');
            resolve();
          }
        );
      });
      showScreen('main');
      fetchEntries();
    } else {
      showScreen('pairing');
    }
  }
}

// Importar CSS
import './popup.css';

init().catch(console.error);
