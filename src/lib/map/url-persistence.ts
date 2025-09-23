/**
 * MEMOIR GIS - Persistenza stato layer su URL e localStorage
 * Gestisce il salvataggio e ripristino delle configurazioni basemap/overlay
 */

export interface LayerState {
  basemap: string;
  overlays: string[];
  opacities: Record<string, number>;
}

const STORAGE_KEYS = {
  basemap: 'memoir.basemap',
  overlays: 'memoir.overlays', 
  opacities: 'memoir.opacities'
};

/**
 * Legge stato layer da URL search params
 */
export function readLayerStateFromURL(): Partial<LayerState> {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  const state: Partial<LayerState> = {};
  
  // Basemap
  const basemap = params.get('basemap');
  if (basemap) {
    state.basemap = basemap;
  }
  
  // Overlays (formato: overlay1,overlay2,overlay3)
  const overlaysParam = params.get('overlays');
  if (overlaysParam) {
    state.overlays = overlaysParam.split(',').filter(Boolean);
  }
  
  // Opacità (formato: opacity.overlay1=0.7&opacity.overlay2=0.5)
  const opacities: Record<string, number> = {};
  params.forEach((value, key) => {
    if (key.startsWith('opacity.')) {
      const layerId = key.replace('opacity.', '');
      const opacity = parseFloat(value);
      if (!isNaN(opacity) && opacity >= 0 && opacity <= 1) {
        opacities[layerId] = opacity;
      }
    }
  });
  
  if (Object.keys(opacities).length > 0) {
    state.opacities = opacities;
  }
  
  return state;
}

/**
 * Scrive stato layer su URL (senza reload pagina)
 */
export function writeLayerStateToURL(state: LayerState): void {
  if (typeof window === 'undefined') return;
  
  const params = new URLSearchParams(window.location.search);
  
  // Pulisci parametri esistenti
  params.delete('basemap');
  params.delete('overlays');
  
  // Rimuovi vecchi parametri opacità
  const keysToDelete: string[] = [];
  params.forEach((_, key) => {
    if (key.startsWith('opacity.')) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => params.delete(key));
  
  // Aggiungi nuovi parametri
  if (state.basemap) {
    params.set('basemap', state.basemap);
  }
  
  if (state.overlays && state.overlays.length > 0) {
    params.set('overlays', state.overlays.join(','));
  }
  
  if (state.opacities) {
    Object.entries(state.opacities).forEach(([layerId, opacity]) => {
      params.set(`opacity.${layerId}`, opacity.toFixed(2));
    });
  }
  
  // Aggiorna URL senza reload
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
}

/**
 * Legge stato layer da localStorage
 */
export function readLayerStateFromStorage(): Partial<LayerState> {
  if (typeof window === 'undefined') return {};
  
  try {
    const state: Partial<LayerState> = {};
    
    // Basemap
    const basemap = localStorage.getItem(STORAGE_KEYS.basemap);
    if (basemap) {
      state.basemap = basemap;
    }
    
    // Overlays
    const overlaysJson = localStorage.getItem(STORAGE_KEYS.overlays);
    if (overlaysJson) {
      const overlays = JSON.parse(overlaysJson);
      if (Array.isArray(overlays)) {
        state.overlays = overlays;
      }
    }
    
    // Opacità
    const opacitiesJson = localStorage.getItem(STORAGE_KEYS.opacities);
    if (opacitiesJson) {
      const opacities = JSON.parse(opacitiesJson);
      if (typeof opacities === 'object' && opacities !== null) {
        state.opacities = opacities;
      }
    }
    
    return state;
  } catch (error) {
    console.error('Errore leggendo stato da localStorage:', error);
    return {};
  }
}

/**
 * Scrive stato layer su localStorage
 */
export function writeLayerStateToStorage(state: LayerState): void {
  if (typeof window === 'undefined') return;
  
  try {
    if (state.basemap) {
      localStorage.setItem(STORAGE_KEYS.basemap, state.basemap);
    }
    
    if (state.overlays) {
      localStorage.setItem(STORAGE_KEYS.overlays, JSON.stringify(state.overlays));
    }
    
    if (state.opacities) {
      localStorage.setItem(STORAGE_KEYS.opacities, JSON.stringify(state.opacities));
    }
  } catch (error) {
    console.error('Errore scrivendo stato su localStorage:', error);
  }
}

/**
 * Combina stato da URL e localStorage (URL ha priorità)
 */
export function getInitialLayerState(defaultBasemap = 'osm-standard'): LayerState {
  const urlState = readLayerStateFromURL();
  const storageState = readLayerStateFromStorage();
  
  // Verifica che il basemap richiesto esista ancora
  let selectedBasemap = urlState.basemap || storageState.basemap || defaultBasemap;
  
  // Importa dinamicamente per evitare circular imports
  try {
    const { getBasemapProviders } = require('@/lib/map/tiles-providers');
    const availableBasemaps = getBasemapProviders();
    const basemapExists = availableBasemaps.find(p => p.id === selectedBasemap && p.enabled !== false);
    
    if (!basemapExists) {
      console.warn(`Basemap ${selectedBasemap} non disponibile, fallback a ${defaultBasemap}`);
      selectedBasemap = defaultBasemap;
    }
  } catch (e) {
    console.warn('Errore verifica basemap, uso default:', e);
    selectedBasemap = defaultBasemap;
  }
  
  return {
    basemap: selectedBasemap,
    overlays: urlState.overlays || storageState.overlays || [],
    opacities: { ...storageState.opacities, ...urlState.opacities }
  };
}

/**
 * Persiste stato su entrambi URL e localStorage
 */
export function persistLayerState(state: LayerState): void {
  writeLayerStateToURL(state);
  writeLayerStateToStorage(state);
}

/**
 * Genera URL condivisibile con stato layer
 */
export function generateShareUrl(state: LayerState): string {
  if (typeof window === 'undefined') return '';
  
  const params = new URLSearchParams();
  
  if (state.basemap) {
    params.set('basemap', state.basemap);
  }
  
  if (state.overlays && state.overlays.length > 0) {
    params.set('overlays', state.overlays.join(','));
  }
  
  if (state.opacities) {
    Object.entries(state.opacities).forEach(([layerId, opacity]) => {
      params.set(`opacity.${layerId}`, opacity.toFixed(2));
    });
  }
  
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

/**
 * Hook per debounce delle operazioni di persistenza
 */
let persistenceTimeout: NodeJS.Timeout | null = null;

export function debouncePersistence(state: LayerState, delay = 200): void {
  if (persistenceTimeout) {
    clearTimeout(persistenceTimeout);
  }
  
  persistenceTimeout = setTimeout(() => {
    persistLayerState(state);
  }, delay);
}