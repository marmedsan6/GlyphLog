/**
 * GlyphLog Companion — Extension Popup JavaScript
 * Vanilla JS script using chrome.storage.local for storing device token and API URL.
 */

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  token: null,
  deviceName: null,
  apiBaseUrl: 'http://localhost:8000',
  currentEntry: null,
  searchTimeout: null,
};

// ── Elements ───────────────────────────────────────────────────────────────
const screens = {
  pairing: document.getElementById('screen-pairing'),
  main: document.getElementById('screen-main'),
  detail: document.getElementById('screen-detail'),
  settings: document.getElementById('screen-settings'),
};

const pairingCodeInput = document.getElementById('pairing-code-input');
const btnPair = document.getElementById('btn-pair');
const pairingError = document.getElementById('pairing-error');
const apiUrlInput = document.getElementById('api-url-input');

const searchInput = document.getElementById('search-input');
const entriesList = document.getElementById('entries-list');
const btnSettings = document.getElementById('btn-settings');

const btnBack = document.getElementById('btn-back');
const detailTitle = document.getElementById('detail-title');
const detailType = document.getElementById('detail-type');
const detailStatus = document.getElementById('detail-status');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const progressValueInput = document.getElementById('progress-value-input');
const btnIncrement = document.getElementById('btn-increment');
const btnDecrement = document.getElementById('btn-decrement');
const noteInput = document.getElementById('note-input');
const btnUpdate = document.getElementById('btn-update');
const detailError = document.getElementById('detail-error');

const btnBackSettings = document.getElementById('btn-back-settings');
const deviceNameEl = document.getElementById('device-name');
const settingsApiUrlInput = document.getElementById('settings-api-url');
const btnSaveSettings = document.getElementById('btn-save-settings');
const btnUnpair = document.getElementById('btn-unpair');
const toastEl = document.getElementById('toast');
const toastMessageEl = document.getElementById('toast-message');

// ── Storage Helpers ────────────────────────────────────────────────────────
function loadStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['device_token', 'device_name', 'api_base_url'], (res) => {
      state.token = res.device_token || null;
      state.deviceName = res.device_name || null;
      state.apiBaseUrl = res.api_base_url || 'http://localhost:8000';
      resolve();
    });
  });
}

function saveStorage(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

function clearStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['device_token', 'device_name'], resolve);
  });
}

// ── UI Navigation ──────────────────────────────────────────────────────────
function showScreen(screenName) {
  Object.keys(screens).forEach((name) => {
    screens[name].style.display = name === screenName ? 'flex' : 'none';
  });
}

function showToast(message) {
  toastMessageEl.textContent = message;
  toastEl.style.display = 'block';
  setTimeout(() => {
    toastEl.style.display = 'none';
  }, 2500);
}

// ── API Helpers ────────────────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const url = `${state.apiBaseUrl.replace(/\/+$/, '')}/api/v1${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
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

// ── Pairing Handler ────────────────────────────────────────────────────────
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
    pairingError.textContent = err.message;
    pairingError.style.display = 'block';
  } finally {
    btnPair.disabled = false;
    btnPair.textContent = 'Emparejar';
  }
});

// ── Search & Entries List ──────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  clearTimeout(state.searchTimeout);
  state.searchTimeout = setTimeout(() => {
    fetchEntries(searchInput.value.trim());
  }, 300);
});

async function fetchEntries(query = '') {
  entriesList.innerHTML = '<p class="empty-state">Cargando...</p>';

  try {
    const endpoint = query
      ? `/entries/?search=${encodeURIComponent(query)}&limit=10`
      : '/entries/?limit=10';
    const data = await apiFetch(endpoint);

    if (!data.entries || data.entries.length === 0) {
      entriesList.innerHTML = query
        ? '<p class="empty-state">No se encontraron entradas</p>'
        : '<p class="empty-state">Tu colección está vacía</p>';
      return;
    }

    renderEntries(data.entries);
  } catch (err) {
    entriesList.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
}

function renderEntries(entries) {
  entriesList.innerHTML = '';
  entries.forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'entry-card';

    const current = entry.current_progress ?? 0;
    const total = entry.progress_total !== null ? entry.progress_total : '—';
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

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, (tag) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[tag]));
}

// ── Detail & Progress Update ───────────────────────────────────────────────
function openDetail(entry) {
  state.currentEntry = entry;
  detailTitle.textContent = entry.title;
  detailType.textContent = entry.type;
  detailStatus.textContent = entry.status;

  const current = entry.current_progress ?? 0;
  const total = entry.progress_total;
  const unit = entry.progress_unit || '';

  progressValueInput.value = current;
  progressValueInput.max = total !== null ? total : '';
  noteInput.value = '';
  detailError.style.display = 'none';

  updateProgressDisplay(current, total, unit);
  showScreen('detail');
}

function updateProgressDisplay(current, total, unit) {
  const totalText = total !== null ? total : '—';
  progressText.textContent = `${current} / ${totalText} ${unit}`;

  if (total !== null && total > 0) {
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
    progressValueInput.value = val;
    updateProgressDisplay(val, max, state.currentEntry?.progress_unit || '');
  }
});

btnDecrement.addEventListener('click', () => {
  let val = parseInt(progressValueInput.value, 10) || 0;
  if (val > 0) {
    val -= 1;
    progressValueInput.value = val;
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
    const updatedEntry = await apiFetch(`/entries/${state.currentEntry.id}/progress`, {
      method: 'POST',
      body: JSON.stringify({
        new_value: newValue,
        note: note,
      }),
    });

    showToast('Progreso actualizado');
    openDetail(updatedEntry);
  } catch (err) {
    detailError.textContent = err.message;
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

// ── Settings & Unpair ──────────────────────────────────────────────────────
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

// ── Initialization ─────────────────────────────────────────────────────────
async function init() {
  await loadStorage();
  apiUrlInput.value = state.apiBaseUrl;

  if (state.token) {
    showScreen('main');
    fetchEntries();
  } else {
    showScreen('pairing');
  }
}

init();
