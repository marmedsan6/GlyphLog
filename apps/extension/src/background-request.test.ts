import { describe, expect, it } from 'vitest';
import {
  buildApiRequest,
  getApiErrorMessage,
  type APIRequestMessage,
} from './background-request';

describe('buildApiRequest', () => {
  it('reconstruye FormData sin fijar manualmente Content-Type', () => {
    const message: APIRequestMessage = {
      type: 'API_REQUEST',
      method: 'POST',
      endpoint: '/entries/',
      body: {
        title: 'Jujutsu Kaisen',
        type: 'anime',
        status: 'watching',
        ignored: undefined,
      },
      isFormData: true,
    };

    const { url, options } = buildApiRequest(
      message,
      'http://localhost:8000/',
      'dt_test'
    );

    expect(url).toBe('http://localhost:8000/api/v1/entries/');
    expect(options.headers).toEqual({ Authorization: 'Bearer dt_test' });
    expect(options.body).toBeInstanceOf(FormData);

    const formData = options.body as FormData;
    expect(formData.get('title')).toBe('Jujutsu Kaisen');
    expect(formData.get('type')).toBe('anime');
    expect(formData.get('status')).toBe('watching');
    expect(formData.get('ignored')).toBeNull();
  });

  it('serializa las peticiones JSON con Content-Type', () => {
    const message: APIRequestMessage = {
      type: 'API_REQUEST',
      method: 'POST',
      endpoint: '/entries/entry-id/progress',
      body: { new_value: 3 },
    };

    const { options } = buildApiRequest(message, 'https://glyphlog.qzz.io', 'dt_test');

    expect(options.headers).toEqual({
      Authorization: 'Bearer dt_test',
      'Content-Type': 'application/json',
    });
    expect(options.body).toBe(JSON.stringify({ new_value: 3 }));
  });
});

describe('getApiErrorMessage', () => {
  it('convierte errores de validación de FastAPI en un mensaje legible', () => {
    expect(
      getApiErrorMessage(
        { detail: [{ msg: 'Field required' }, { msg: 'Invalid type' }] },
        'Error 422'
      )
    ).toBe('Field required; Invalid type');
  });

  it('usa el fallback cuando la respuesta no contiene detail', () => {
    expect(getApiErrorMessage({}, 'Error 500')).toBe('Error 500');
  });
});
