import { describe, expect, it } from 'vitest';
import { classifyPopupError, popupErrorMessage, POPUP_COPY } from './popup-status';

describe('classifyPopupError', () => {
  it('marca un TypeError de red como API no disponible', () => {
    expect(classifyPopupError(new TypeError('Failed to fetch'))).toBe('unavailable');
  });

  it('marca Failed to fetch como API no disponible', () => {
    expect(classifyPopupError(new Error('Failed to fetch'))).toBe('unavailable');
  });

  it('marca un 401 de token como unauthorized', () => {
    expect(
      classifyPopupError(new Error('Sesión expirada o token revocado. Vuelve a emparejar.'))
    ).toBe('unauthorized');
  });

  it('deja el resto como other', () => {
    expect(classifyPopupError(new Error('Código de emparejamiento no encontrado'))).toBe(
      'other'
    );
  });
});

describe('popupErrorMessage', () => {
  it('no muestra Failed to fetch al usuario', () => {
    expect(popupErrorMessage(new TypeError('Failed to fetch'))).toBe(
      POPUP_COPY.apiUnavailable
    );
    expect(popupErrorMessage(new TypeError('Failed to fetch'))).not.toMatch(/Failed to fetch/i);
  });

  it('indica generar un código nuevo cuando el token ya no vale', () => {
    expect(popupErrorMessage(new Error('Device token inválido o revocado'))).toBe(
      POPUP_COPY.unauthorized
    );
  });
});
