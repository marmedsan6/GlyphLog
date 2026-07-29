export interface APIRequestMessage {
  type: 'API_REQUEST';
  method: string;
  endpoint: string;
  body?: Record<string, unknown>;
  isFormData?: boolean;
}

export interface APIRequestResponse {
  ok: boolean;
  status?: number;
  data?: unknown;
  error?: string;
}

export function buildApiRequest(
  message: APIRequestMessage,
  apiBaseUrl: string,
  deviceToken?: string
): { url: string; options: RequestInit } {
  const normalizedBaseUrl = apiBaseUrl.replace(/\/+$/, '');
  const headers: Record<string, string> = {};

  if (deviceToken) {
    headers.Authorization = `Bearer ${deviceToken}`;
  }

  const options: RequestInit = {
    method: message.method,
    headers,
  };

  if (message.body) {
    if (message.isFormData) {
      const formData = new FormData();
      Object.entries(message.body).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      options.body = formData;
    } else {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(message.body);
    }
  }

  return {
    url: `${normalizedBaseUrl}/api/v1${message.endpoint}`,
    options,
  };
}

export function getApiErrorMessage(
  data: unknown,
  fallback: string
): string {
  if (!data || typeof data !== 'object') {
    return fallback;
  }

  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail.map((item) => {
      if (typeof item === 'string') {
        return item;
      }
      if (item && typeof item === 'object' && 'msg' in item) {
        return String((item as { msg: unknown }).msg);
      }
      return String(item);
    });
    return messages.join('; ') || fallback;
  }

  return fallback;
}
