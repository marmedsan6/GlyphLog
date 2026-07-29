/**
 * Registry de adaptadores de sitios.
 * Carga y expone los adaptadores disponibles.
 */

import { SiteAdapter, SiteAdapterConstructor } from './types';
import { CrunchyrollAdapter } from './crunchyroll';
import { AnimeFlvAdapter } from './animeflv';
import { MangaDexAdapter } from './mangadex';

// Lista de adaptadores disponibles
const adapters: SiteAdapterConstructor[] = [
  CrunchyrollAdapter,
  AnimeFlvAdapter,
  MangaDexAdapter,
  // Futuros adaptadores (Netflix, etc.) irán aquí
];

// Instancias singleton
let adapterInstances: Map<string, SiteAdapter> | null = null;

/**
 * Obtiene la instancia singleton de los adaptadores.
 */
function getAdapterInstances(): Map<string, SiteAdapter> {
  if (!adapterInstances) {
    adapterInstances = new Map();
    adapters.forEach((AdapterClass, index) => {
      adapterInstances!.set(AdapterClass.name, new AdapterClass());
    });
  }
  return adapterInstances;
}

/**
 * Obtiene el adaptador apropiado para una URL, o null si no hay match.
 */
export function getAdapter(url: string): SiteAdapter | null {
  const instances = getAdapterInstances();

  for (const [, adapter] of instances) {
    if (adapter.matches(url)) {
      return adapter;
    }
  }

  return null;
}

/**
 * Detecta media en la página actual usando el adaptador apropiado.
 */
export async function detectMediaInPage(): Promise<any | null> {
  const url = window.location.href;
  const adapter = getAdapter(url);

  if (!adapter) {
    return null;
  }

  return adapter.detect(document, url);
}
