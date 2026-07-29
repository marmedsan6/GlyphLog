/**
 * Proxy de API a través del service worker.
 *
 * Los content scripts heredan el origin de la página web, por lo que no pueden
 * hacer fetch directo a la API de GlyphLog (CORS + mixed content). El service
 * worker tiene el origin `chrome-extension://` y los permisos de host, por lo
 * que sí puede realizar las peticiones. Este proxy centraliza esa comunicación.
 */

export interface ExtensionEntry {
  id: string;
  [key: string]: unknown;
}

export interface SearchEntriesResponse {
  entries: ExtensionEntry[];
  [key: string]: unknown;
}

export interface ExternalSearchResult {
  title: string;
  year: number | null;
  cover_image: string | null;
  type: string;
  source: string;
  progress_total: number | null;
  slug: string | null;
}

export interface ExternalSearchResponse {
  results: ExternalSearchResult[];
}

export interface BackgroundAPI {
  searchEntries(query: string): Promise<SearchEntriesResponse>;
  searchExternal(query: string): Promise<ExternalSearchResponse>;
  createEntry(data: Record<string, string | number | undefined>): Promise<ExtensionEntry>;
  updateProgress(entryId: string, newValue: number, note?: string): Promise<ExtensionEntry>;
}

interface APIRequestResponse {
  ok?: boolean;
  status?: number;
  data?: unknown;
  error?: string;
  device_token?: string;
  [key: string]: unknown;
}

export class BackgroundAPIClient implements BackgroundAPI {
  async searchEntries(query: string): Promise<SearchEntriesResponse> {
    return this.request<SearchEntriesResponse>(
      'GET',
      `/entries/?search=${encodeURIComponent(query)}&limit=20`
    );
  }

  async createEntry(
    data: Record<string, string | number | undefined>
  ): Promise<ExtensionEntry> {
    // El backend espera FormData para crear entradas (compatibilidad con file uploads).
    // chrome.runtime.sendMessage solo transporta datos serializables, por eso el
    // service worker reconstruye el FormData antes de hacer fetch.
    const formDataObject: Record<string, string> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formDataObject[key] = String(value);
      }
    });
    return this.request<ExtensionEntry>('POST', '/entries/', formDataObject, true);
  }

  async searchExternal(query: string): Promise<ExternalSearchResponse> {
    return this.request<ExternalSearchResponse>(
      'GET',
      `/external/search?q=${encodeURIComponent(query)}`
    );
  }

  async updateProgress(
    entryId: string,
    newValue: number,
    note?: string
  ): Promise<ExtensionEntry> {
    return this.request<ExtensionEntry>(`POST`, `/entries/${entryId}/progress`, {
      new_value: newValue,
      note: note || null,
    });
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>,
    isFormData = false
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'API_REQUEST', method, endpoint, body, isFormData },
        (response) => {
          const apiResponse = response as APIRequestResponse | undefined;
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!apiResponse) {
            reject(new Error('El service worker no devolvió respuesta'));
            return;
          }
          if (!apiResponse.ok) {
            reject(new Error(apiResponse.error || `Error ${apiResponse.status ?? 'desconocido'}`));
            return;
          }
          resolve(apiResponse.data as T);
        }
      );
    });
  }
}

export const backgroundAPI = new BackgroundAPIClient();
