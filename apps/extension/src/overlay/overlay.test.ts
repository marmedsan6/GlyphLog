import { beforeEach, describe, expect, it, vi } from 'vitest';

const backgroundApiMock = vi.hoisted(() => ({
  searchEntries: vi.fn(),
  searchExternal: vi.fn(),
  createEntry: vi.fn(),
  updateProgress: vi.fn(),
}));

vi.mock('~/background-api', () => ({
  backgroundAPI: backgroundApiMock,
}));

import { OverlayComponent, type OverlayData } from './overlay';

const animeData: OverlayData = {
  title: 'One Piece',
  episode: 12,
  mediaType: 'anime',
  pageUrl: 'https://www.crunchyroll.com/watch/example/episode-12',
};

function createOverlay(): { host: HTMLElement; overlay: OverlayComponent } {
  const host = document.createElement('glyphlog-overlay');
  document.body.appendChild(host);
  return { host, overlay: new OverlayComponent(host) };
}

async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const noExternalMeta = { results: [] };

describe('OverlayComponent', () => {
  beforeEach(() => {
    backgroundApiMock.searchEntries.mockReset();
    backgroundApiMock.searchExternal.mockReset();
    backgroundApiMock.createEntry.mockReset();
    backgroundApiMock.updateProgress.mockReset();
    backgroundApiMock.searchEntries.mockResolvedValue({ entries: [] });
    // Por defecto el catálogo externo no devuelve resultados
    backgroundApiMock.searchExternal.mockResolvedValue(noExternalMeta);
  });

  it('crea la entrada y actualiza el progreso inicial', async () => {
    backgroundApiMock.createEntry.mockResolvedValue({ id: 'entry-1' });
    backgroundApiMock.updateProgress.mockResolvedValue({ id: 'entry-1' });
    const { host, overlay } = createOverlay();

    await overlay.show(animeData);
    (host.shadowRoot?.querySelector('#gl-confirm') as HTMLButtonElement).click();
    await flushPromises();

    expect(backgroundApiMock.createEntry).toHaveBeenCalledWith({
      title: 'One Piece',
      type: 'anime',
      status: 'watching',
    });
    expect(backgroundApiMock.updateProgress).toHaveBeenCalledWith('entry-1', 12);
    expect(host.shadowRoot?.textContent).toContain('Agregado a tu lista');
    host.remove();
  });

  it('enriquece la entrada con datos del catálogo externo', async () => {
    backgroundApiMock.searchExternal.mockResolvedValue({
      results: [{ title: 'One Piece', year: 1999, cover_image: 'https://cdn.anilist.co/one-piece.jpg', type: 'anime', source: 'AniList', progress_total: 1100, slug: null }],
    });
    backgroundApiMock.createEntry.mockResolvedValue({ id: 'entry-2' });
    backgroundApiMock.updateProgress.mockResolvedValue({ id: 'entry-2' });
    const { host, overlay } = createOverlay();

    await overlay.show(animeData);
    (host.shadowRoot?.querySelector('#gl-confirm') as HTMLButtonElement).click();
    await flushPromises();

    expect(backgroundApiMock.createEntry).toHaveBeenCalledWith(expect.objectContaining({
      title: 'One Piece',
      type: 'anime',
      status: 'watching',
      year: 1999,
      progress_total: 1100,
      cover_image_url: 'https://cdn.anilist.co/one-piece.jpg',
    }));
    expect(backgroundApiMock.updateProgress).toHaveBeenCalledWith('entry-2', 12);
    expect(host.shadowRoot?.textContent).toContain('Agregado a tu lista');
    host.remove();
  });

  it('informa que la entrada existe si falla solo el progreso', async () => {
    backgroundApiMock.createEntry.mockResolvedValue({ id: 'entry-1' });
    backgroundApiMock.updateProgress.mockRejectedValue(new Error('Error 422'));
    const { host, overlay } = createOverlay();

    await overlay.show(animeData);
    (host.shadowRoot?.querySelector('#gl-confirm') as HTMLButtonElement).click();
    await flushPromises();

    expect(host.shadowRoot?.textContent).toContain('Entrada añadida');
    expect(host.shadowRoot?.textContent).toContain('Error 422');
    host.remove();
  });

  it('muestra el error de creación sin intentar actualizar progreso', async () => {
    backgroundApiMock.createEntry.mockRejectedValue(new Error('Field required'));
    const { host, overlay } = createOverlay();

    await overlay.show(animeData);
    (host.shadowRoot?.querySelector('#gl-confirm') as HTMLButtonElement).click();
    await flushPromises();

    expect(backgroundApiMock.updateProgress).not.toHaveBeenCalled();
    expect(host.shadowRoot?.textContent).toContain('Field required');
    host.remove();
  });
});
