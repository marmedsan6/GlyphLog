/**
 * Cliente API tipado para la extensión.
 * Maneja autenticación con device tokens y comunicación con la API de GlyphLog.
 */

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export class GlyphLogAPIClient {
  private apiBaseUrl: string;
  private deviceToken: string | null = null;

  constructor(apiBaseUrl: string = 'http://localhost:8000') {
    this.apiBaseUrl = apiBaseUrl.replace(/\/+$/, '');
  }

  /**
   * Carga el device token desde chrome.storage.local
   *
   * En MV3 algunos contextos (especialmente content scripts en ciertos entornos)
   * no acceden directamente a chrome.storage. Usamos el service worker como
   * proxy vía runtime.sendMessage para garantizar disponibilidad.
   */
  async loadToken(): Promise<void> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_DEVICE_TOKEN' }, (response) => {
        if (chrome.runtime.lastError) {
          console.debug('[GlyphLog API] Error loading token:', chrome.runtime.lastError);
          this.deviceToken = null;
        } else {
          this.deviceToken = response?.device_token || null;
        }
        resolve();
      });
    });
  }

  /**
   * Realiza una request autenticada a la API.
   */
  private async fetch(endpoint: string, options: FetchOptions = {}): Promise<Response> {
    const url = `${this.apiBaseUrl}/api/v1${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.deviceToken) {
      headers['Authorization'] = `Bearer ${this.deviceToken}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      throw new Error('No autorizado. Vuelve a emparejar la extensión desde GlyphLog.');
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || `Error: ${response.statusText}`);
    }

    return response;
  }

  /**
   * Busca entradas en la colección por título.
   */
  async searchEntries(query: string): Promise<any> {
    const response = await this.fetch(
      `/entries/?search=${encodeURIComponent(query)}&limit=20`
    );
    return response.json();
  }

  /**
   * Obtiene una entrada específica por ID.
   */
  async getEntry(entryId: string): Promise<any> {
    const response = await this.fetch(`/entries/${entryId}`);
    return response.json();
  }

  /**
   * Crea una entrada nueva.
   */
  async createEntry(data: {
    title: string;
    type: string; // 'anime' | 'manga' | 'game'
    status: string; // 'watching' | 'completed' | etc.
    rating?: number;
    year?: number;
    notes?: string;
    progress_total?: number;
  }): Promise<any> {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    const response = await fetch(`${this.apiBaseUrl}/api/v1/entries/`, {
      method: 'POST',
      headers: {
        ...(this.deviceToken ? { Authorization: `Bearer ${this.deviceToken}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || 'Error al crear entrada');
    }

    return response.json();
  }

  /**
   * Actualiza el progreso de una entrada.
   */
  async updateProgress(entryId: string, newValue: number, note?: string): Promise<any> {
    const response = await this.fetch(`/entries/${entryId}/progress`, {
      method: 'POST',
      body: JSON.stringify({
        new_value: newValue,
        note: note || null,
      }),
    });
    return response.json();
  }

  /**
   * Busca en el catálogo externo (AniList, RAWG, etc.).
   */
  async searchExternal(query: string): Promise<any> {
    const response = await this.fetch(
      `/external/search?q=${encodeURIComponent(query)}`
    );
    return response.json();
  }

  /**
   * Obtiene detalles de un juego desde RAWG.
   */
  async getGameDetail(slug: string): Promise<any> {
    const response = await this.fetch(`/external/games/${slug}`);
    return response.json();
  }
}

/**
 * Instancia singleton del cliente API.
 */
let clientInstance: GlyphLogAPIClient | null = null;

/**
 * Obtiene o crea la instancia singleton del cliente.
 */
export async function getAPIClient(
  apiBaseUrl?: string
): Promise<GlyphLogAPIClient> {
  if (!clientInstance) {
    clientInstance = new GlyphLogAPIClient(apiBaseUrl);
    await clientInstance.loadToken();
  }
  return clientInstance;
}
