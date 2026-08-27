export type PopupApiFailure = 'unauthorized' | 'unavailable' | 'other';

export const POPUP_COPY = {
  apiUnavailable:
    'No se puede contactar con GlyphLog. Comprueba tu conexión o la URL de la API.',
  unauthorized:
    'Este dispositivo ya no tiene acceso. Genera un código nuevo en GlyphLog → Perfil → Dispositivos.',
  pairingHint:
    'Genera un código desde GlyphLog → Perfil → Dispositivos e introdúcelo aquí. Nunca copies el token de sesión.',
} as const;

export function classifyPopupError(error: unknown): PopupApiFailure {
  if (error instanceof TypeError) {
    return 'unavailable';
  }

  const message = error instanceof Error ? error.message : String(error);
  if (/failed to fetch|networkerror|load failed|error de red/i.test(message)) {
    return 'unavailable';
  }
  if (/401|sesión expirada|token revocado|ya no tiene acceso|device token/i.test(message)) {
    return 'unauthorized';
  }
  return 'other';
}

export function popupErrorMessage(error: unknown): string {
  const kind = classifyPopupError(error);
  if (kind === 'unavailable') {
    return POPUP_COPY.apiUnavailable;
  }
  if (kind === 'unauthorized') {
    return POPUP_COPY.unauthorized;
  }
  return error instanceof Error ? error.message : 'Ha ocurrido un error.';
}
