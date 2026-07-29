/**
 * Componente Overlay (Shadow DOM)
 * Muestra un dialogo discreto en la esquina inferior derecha con dos acciones:
 * 1. Marcar episodio (si la entrada está en la colección)
 * 2. Agregar a la colección (si no está)
 */

import {
  backgroundAPI,
  type ExtensionEntry,
  type ExternalSearchResult,
} from '~/background-api';
import type { MediaType } from '~/adapters/types';
import styles from './overlay.css?inline';

export interface OverlayData {
  title: string;
  episode?: number;
  chapter?: number;
  mediaType: MediaType;
  pageUrl: string;
}

export class OverlayComponent {
  private host: HTMLElement;
  private root: ShadowRoot;
  private data: OverlayData | null = null;
  private isLoading = false;

  /**
   * El overlay usa un elemento host plano con Shadow Root en lugar de un
   * custom element registrado: `customElements` no está disponible en el
   * mundo aislado de algunos content scripts, y así no dependemos de ello.
   */
  constructor(host: HTMLElement) {
    this.host = host;
    this.root = host.attachShadow({ mode: 'open' });
    this.root.innerHTML = `<style>${styles}</style>`;
  }

  /**
   * Establece los datos del media detectado y abre el overlay.
   */
  async show(data: OverlayData): Promise<void> {
    console.log('[GlyphLog Overlay] Showing overlay for:', data.title);
    this.data = data;
    this.isLoading = true;

    // Mostrar estado de carga
    this.renderLoading(data);
    console.debug('[GlyphLog Overlay] Rendered loading state');

    try {
      // Buscar la entrada en la colección
      const normalizedTitle = this.normalizeTitle(data.title);
      console.debug('[GlyphLog Overlay] Searching for entry:', normalizedTitle);
      
      const searchResult = await backgroundAPI.searchEntries(normalizedTitle);
      console.debug('[GlyphLog Overlay] Search result:', searchResult);

      // Determinar si la entrada existe
      const entry = searchResult.entries?.[0];

      if (entry) {
        // Mostrar: "¿Marcar Ep. N?"
        console.log('[GlyphLog Overlay] Entry found! Rendering mark progress...');
        this.renderMarkProgress(data, entry);
      } else {
        // Mostrar: "¿Agregar a tu lista?"
        console.log('[GlyphLog Overlay] Entry not found! Rendering add entry...');
        this.renderAddEntry(data);
      }
    } catch (error) {
      console.error('[GlyphLog Overlay] Error:', error);
      this.renderError((error as Error).message);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Cierra el overlay.
   */
  hide(): void {
    this.host.remove();
  }

  private normalizeTitle(title: string): string {
    // Normalización fuzzy: lowercase, sin puntuación, sin (Sub)/(Dub)
    let normalized = title.toLowerCase();
    normalized = normalized.replace(/\s*\((sub|dub)\)\s*/gi, '');
    normalized = normalized.replace(/[^\w\s]/g, '');
    return normalized.trim();
  }

  private renderLoading(data: OverlayData): void {
    this.root.innerHTML = `
      <style>${styles}</style>
      <div class="gl-overlay">
        <div class="gl-overlay-container">
          <div class="gl-overlay-title">
            <span class="gl-spinner"></span>Detectando...
          </div>
          <div class="gl-overlay-subtitle">${this.escapeHtml(data.title)}</div>
        </div>
      </div>
    `;
  }

  private renderMarkProgress(data: OverlayData, entry: ExtensionEntry): void {
    const progressValue = data.chapter ?? data.episode ?? 1;
    const progressLabel = this.formatProgressLabel(data);
    this.root.innerHTML = `
      <style>${styles}</style>
      <div class="gl-overlay">
        <div class="gl-overlay-container">
          <div class="gl-overlay-title">¿Marcar ${progressLabel}?</div>
          <div class="gl-overlay-subtitle">${this.escapeHtml(data.title)}</div>
          <div class="gl-overlay-actions">
            <button class="gl-btn gl-btn-confirm" id="gl-confirm">Marcar</button>
            <button class="gl-btn gl-btn-dismiss" id="gl-dismiss">Descartar</button>
          </div>
        </div>
      </div>
    `;

    const confirmBtn = this.root.getElementById('gl-confirm') as HTMLButtonElement;
    const dismissBtn = this.root.getElementById('gl-dismiss') as HTMLButtonElement;

    confirmBtn.addEventListener('click', () =>
      this.handleMarkProgress(entry, progressValue)
    );
    dismissBtn.addEventListener('click', () => this.handleDismiss());
  }

  private renderAddEntry(data: OverlayData): void {
    const progressLabel = this.formatProgressLabel(data);
    this.root.innerHTML = `
      <style>${styles}</style>
      <div class="gl-overlay">
        <div class="gl-overlay-container">
          <div class="gl-overlay-title">¿Agregar a tu lista?</div>
          <div class="gl-overlay-subtitle">
            ${this.escapeHtml(data.title)}
            ${progressLabel ? `&bull; ${progressLabel}` : ''}
          </div>
          <div class="gl-overlay-actions">
            <button class="gl-btn gl-btn-confirm" id="gl-confirm">Agregar</button>
            <button class="gl-btn gl-btn-dismiss" id="gl-dismiss">Descartar</button>
          </div>
        </div>
      </div>
    `;

    const confirmBtn = this.root.getElementById('gl-confirm') as HTMLButtonElement;
    const dismissBtn = this.root.getElementById('gl-dismiss') as HTMLButtonElement;

    confirmBtn.addEventListener('click', () =>
      this.handleAddEntry(data)
    );
    dismissBtn.addEventListener('click', () => this.handleDismiss());
  }

  private renderError(message: string): void {
    this.root.innerHTML = `
      <style>${styles}</style>
      <div class="gl-overlay">
        <div class="gl-overlay-container">
          <div class="gl-error">Error: ${this.escapeHtml(message)}</div>
        </div>
      </div>
    `;

    // Auto-cerrar después de 3 segundos
    setTimeout(() => this.hide(), 3000);
  }

  private async handleMarkProgress(entry: ExtensionEntry, newValue: number): Promise<void> {
    const confirmBtn = this.root.querySelector('#gl-confirm') as HTMLButtonElement;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="gl-spinner"></span>Guardando...';

    try {
      await backgroundAPI.updateProgress(entry.id, newValue);

      // Mostrar confirmación
      const progressLabel = this.data ? this.formatProgressLabel(this.data) : '';
      this.root.innerHTML = `
        <style>${styles}</style>
        <div class="gl-overlay">
          <div class="gl-overlay-container">
            <div class="gl-overlay-title">✓ Progreso actualizado</div>
            <div class="gl-overlay-subtitle">${progressLabel} de ${this.data?.title}</div>
          </div>
        </div>
      `;

      // Auto-cerrar
      setTimeout(() => this.hide(), 2000);
    } catch (error) {
      this.renderError(this.getErrorMessage(error));
    }
  }

  private async handleAddEntry(data: OverlayData): Promise<void> {
    const confirmBtn = this.root.querySelector('#gl-confirm') as HTMLButtonElement;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="gl-spinner"></span>Buscando...';

    // Paso 1: búsqueda en catálogo externo para enriquecer la entrada.
    // Es no-bloqueante: si falla, creamos la entrada con los datos mínimos.
    let externalMeta: ExternalSearchResult | null = null;
    try {
      const searchResult = await backgroundAPI.searchExternal(data.title);
      const targetType = data.mediaType === 'manga' ? 'manga' : 'anime';
      // Primer resultado del tipo correcto
      externalMeta = searchResult.results?.find(r => r.type === targetType) ?? null;
      console.debug('[GlyphLog Overlay] External meta found:', externalMeta?.title ?? 'none');
    } catch (error) {
      console.debug('[GlyphLog Overlay] External search failed (non-blocking):', error);
    }

    confirmBtn.innerHTML = '<span class="gl-spinner"></span>Agregando...';

    try {
      const entryData: Record<string, string | number | undefined> = {
        title: data.title,
        type: data.mediaType === 'manga' ? 'manga' : 'anime',
        status: 'watching',
      };

      // Enriquecer con metadatos externos cuando están disponibles
      if (externalMeta) {
        if (externalMeta.year) {
          entryData.year = externalMeta.year;
        }
        if (externalMeta.progress_total !== null && externalMeta.progress_total !== undefined) {
          // El backend requiere enteros para episodios/capítulos; los juegos usan horas con decimales
          const total = data.mediaType === 'game'
            ? externalMeta.progress_total
            : Math.floor(externalMeta.progress_total);
          if (total > 0) {
            entryData.progress_total = total;
          }
        }
        if (externalMeta.cover_image) {
          // El frontend ya soporta URLs externas en cover_image (getCoverImageUrl)
          entryData.cover_image_url = externalMeta.cover_image;
        }
      }

      console.debug('[GlyphLog Overlay] Creating entry with:', entryData);
      const newEntry = await backgroundAPI.createEntry(entryData);
      console.log('[GlyphLog Overlay] Entry created:', newEntry.id);

      // Paso 2: actualizar el progreso (episodio/capítulo actual).
      // Se ejecuta después de crear la entrada; si falla no deshace la creación.
      const progressValue = data.chapter ?? data.episode;
      console.debug('[GlyphLog Overlay] Progress value to save:', progressValue);

      if (progressValue !== undefined && progressValue > 0) {
        // Validar que el progreso no supere el total si ya lo conocemos
        const knownTotal = externalMeta?.progress_total
          ? Math.floor(externalMeta.progress_total)
          : null;
        const clampedProgress = knownTotal && progressValue > knownTotal
          ? knownTotal
          : progressValue;

        try {
          await backgroundAPI.updateProgress(newEntry.id, clampedProgress);
          console.log('[GlyphLog Overlay] Progress saved:', clampedProgress);
        } catch (error) {
          console.error('[GlyphLog Overlay] Progress update failed:', error);
          this.renderPartialSuccess(data.title, externalMeta?.cover_image ?? null, error);
          return;
        }
      } else {
        console.debug('[GlyphLog Overlay] No episode/chapter detected — progress not updated');
      }

      this.renderSuccess(data.title, externalMeta?.cover_image ?? null, progressValue);
    } catch (error) {
      this.renderError(this.getErrorMessage(error));
    }
  }

  private renderSuccess(title: string, coverUrl: string | null = null, episode?: number): void {
    const episodeHtml = episode
      ? `<div class="gl-overlay-progress">Ep. ${episode} registrado</div>`
      : '';
    const coverHtml = coverUrl
      ? `<img class="gl-cover" src="${this.escapeHtml(coverUrl)}" alt="" />`
      : '';
    this.root.innerHTML = `
      <style>${styles}</style>
      <div class="gl-overlay">
        <div class="gl-overlay-container">
          ${coverHtml}
          <div class="gl-overlay-title">✓ Agregado a tu lista</div>
          <div class="gl-overlay-subtitle">${this.escapeHtml(title)}</div>
          ${episodeHtml}
        </div>
      </div>
    `;

    setTimeout(() => this.hide(), 2500);
  }

  private renderPartialSuccess(title: string, coverUrl: string | null, error: unknown): void {
    const coverHtml = coverUrl
      ? `<img class="gl-cover" src="${this.escapeHtml(coverUrl)}" alt="" />`
      : '';
    this.root.innerHTML = `
      <style>${styles}</style>
      <div class="gl-overlay">
        <div class="gl-overlay-container">
          ${coverHtml}
          <div class="gl-overlay-title">✓ Entrada añadida</div>
          <div class="gl-overlay-subtitle">${this.escapeHtml(title)}</div>
          <div class="gl-error">No se pudo guardar el progreso: ${this.escapeHtml(this.getErrorMessage(error))}</div>
        </div>
      </div>
    `;

    setTimeout(() => this.hide(), 5000);
  }

  /**
   * Formatea el número de progreso según el tipo de medio detectado.
   * Anime → "Ep. N", manga → "Cap. N".
   */
  private formatProgressLabel(data: OverlayData): string {
    const value = data.chapter ?? data.episode;
    if (value === undefined) {
      return '';
    }
    if (data.mediaType === 'manga') {
      return `Cap. ${value}`;
    }
    return `Ep. ${value}`;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Error desconocido';
  }

  private handleDismiss(): void {
    // Marcar URL como descartada en esta sesión
    if (this.data) {
      sessionStorage.setItem(`glyphlog-dismissed-${this.data.pageUrl}`, 'true');
    }
    this.hide();
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

/**
 * Factory para crear e inyectar el overlay.
 */
export async function createAndShowOverlay(data: OverlayData): Promise<void> {
  // Checar si ya fue descartado en esta sesión
  const dismissedKey = `glyphlog-dismissed-${data.pageUrl}`;
  if (sessionStorage.getItem(dismissedKey)) {
    console.debug('[GlyphLog] URL descartada en esta sesión');
    return;
  }

  // Host con nombre de custom element (válido para attachShadow aunque no se registre)
  const host = document.createElement('glyphlog-overlay');
  document.body.appendChild(host);

  // Crear el componente y mostrar datos
  const overlay = new OverlayComponent(host);
  await overlay.show(data);
}
