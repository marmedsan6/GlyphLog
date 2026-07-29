import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackgroundAPIClient } from './background-api';

describe('BackgroundAPIClient', () => {
  const sendMessage = vi.fn();

  beforeEach(() => {
    sendMessage.mockReset();
    Object.defineProperty(globalThis, 'chrome', {
      configurable: true,
      value: {
        runtime: {
          lastError: undefined,
          sendMessage,
        },
      },
    });
  });

  it('envía la creación como objeto plano marcado como FormData', async () => {
    sendMessage.mockImplementationOnce((_message, callback) => {
      callback({ ok: true, data: { id: 'entry-1' } });
    });

    const entry = await new BackgroundAPIClient().createEntry({
      title: 'One Piece',
      type: 'anime',
      status: 'watching',
      progress_total: undefined,
    });

    expect(entry.id).toBe('entry-1');
    expect(sendMessage).toHaveBeenCalledWith(
      {
        type: 'API_REQUEST',
        method: 'POST',
        endpoint: '/entries/',
        body: {
          title: 'One Piece',
          type: 'anime',
          status: 'watching',
        },
        isFormData: true,
      },
      expect.any(Function)
    );
  });

  it('informa cuando el service worker no devuelve respuesta', async () => {
    sendMessage.mockImplementationOnce((_message, callback) => {
      callback(undefined);
    });

    await expect(
      new BackgroundAPIClient().createEntry({
        title: 'One Piece',
        type: 'anime',
        status: 'watching',
      })
    ).rejects.toThrow('El service worker no devolvió respuesta');
  });

  it('llama al endpoint de búsqueda externa con la query codificada', async () => {
    sendMessage.mockImplementationOnce((_message, callback) => {
      callback({ ok: true, data: { results: [] } });
    });

    const result = await new BackgroundAPIClient().searchExternal('One Piece');

    expect(result.results).toEqual([]);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'API_REQUEST',
        method: 'GET',
        endpoint: '/external/search?q=One%20Piece',
      }),
      expect.any(Function)
    );
  });
});
