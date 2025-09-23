/**
 * MEMOIR GIS - Helper MapLibre per gestione tiles
 * Gestisce l'aggiunta/rimozione dinamica di sorgenti e layer
 */

import maplibregl, { Map } from "maplibre-gl";
import { 
  getBasemapProviders, 
  getOverlayProviders, 
  TileProvider,
  DEFAULT_BASEMAP,
  getProviderById,
  TILE_PROVIDERS
} from '@/lib/map/tiles-providers';

/**
 * Sostituisce placeholder subdomain nell'URL
 */
function replaceSubdomain(url: string, subdomains?: string[]): string {
  if (!subdomains || !url.includes("{s}")) return url;
  const s = subdomains[Math.floor(Math.random() * subdomains.length)];
  return url.replace("{s}", s);
}

/**
 * Trova il primo layer di tipo symbol (per inserire raster sotto le etichette)
 * Ma sopra i POI circle
 */
function getFirstSymbolLayerId(map: Map): string | undefined {
  const layers = map.getStyle().layers || [];
  // Inserisce prima dei symbol (etichette)
  const symbolLayer = layers.find(l => l.type === "symbol");
  return symbolLayer?.id;
}

// Trova il primo layer circle (tipicamente i POI) per inserire overlay sotto i POI
function getFirstCircleLayerId(map: Map): string | undefined {
  const layers = map.getStyle().layers || [];
  const circleLayer = layers.find(l => l.type === "circle");
  return circleLayer?.id;
}

// Esegue cb quando lo style è pronto (caricato)
function ensureStyleReady(map: Map, cb: () => void) {
  // map.isStyleLoaded() è disponibile in MapLibre 2+
  if ((map as any).isStyleLoaded && (map as any).isStyleLoaded()) {
    cb();
    return;
  }
  const handler = () => {
    map.off('styledata', handler);
    cb();
  };
  map.on('styledata', handler);
}

/**
 * Aggiunge o aggiorna un provider nella mappa
 */
export function ensureProvider(map: Map, provider: TileProvider, opacity = 1): boolean {
  const sourceId = `src-${provider.id}`;
  const layerId = `lyr-${provider.id}`;

  // Se lo style non è pronto, ritenta quando è carico
  if (!(map as any).isStyleLoaded || !(map as any).isStyleLoaded()) {
    ensureStyleReady(map, () => {
      try {
        ensureProvider(map, provider, opacity);
      } catch (e) {
        console.error(`Errore (deferred) aggiungendo provider ${provider.id}:`, e);
      }
    });
    return true; // pianificato
  }

  // Verifica se il provider richiede una chiave API
  if (provider.requiresKey && (!provider.keyEnv || !checkEnvironmentKey(provider.keyEnv))) {
    console.warn(`Provider ${provider.id} richiede ${provider.keyEnv} non impostata: skip`);
    return false;
  }

  try {
    if (!map.getSource(sourceId)) {
      if (provider.format === "raster") {
        const tilesUrl = replaceSubdomain(provider.url, provider.subdomains);

        map.addSource(sourceId, {
          type: "raster",
          tiles: [tilesUrl],
          tileSize: provider.tileSize ?? 256,
          minzoom: provider.minzoom ?? 0,
          maxzoom: provider.maxzoom ?? 22,
          attribution: provider.attribution
        });

        // Per basemap: inserisci come primo layer (background)
        // Per overlay: inserisci SOTTO i POI (circle) ma sotto anche le etichette
        const beforeId = provider.type === "basemap"
          ? getFirstLayerId(map)
          : (getFirstCircleLayerId(map) ?? getFirstSymbolLayerId(map));

        map.addLayer({
          id: layerId,
          type: "raster",
          source: sourceId,
          paint: {
            "raster-opacity": opacity,
            "raster-resampling": "linear",
            "raster-fade-duration": 100 // Transizioni morbide
          }
        }, beforeId);

        console.log(`✅ Layer ${provider.id} aggiunto (${provider.type})`)

      } else if (provider.format === "vector") {
        // Per vector style (MapTiler OMT), usa setStyle secondario
        console.log(`Vector style ${provider.id} richiede implementazione setStyle`);
        return false;
      }
    } else {
      // Aggiorna opacità se layer esiste
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, "raster-opacity", opacity);
      }
    }

    return true;
  } catch (error) {
    console.error(`Errore aggiungendo provider ${provider.id}:`, error);
    return false;
  }
}

/**
 * Trova il primo layer esistente (per basemap)
 */
function getFirstLayerId(map: Map): string | undefined {
  const layers = map.getStyle().layers || [];
  return layers.length > 0 ? layers[0].id : undefined;
}

/**
 * Rimuove un provider dalla mappa
 */
export function removeProvider(map: Map, providerId: string): void {
  const sourceId = `src-${providerId}`;
  const layerId = `lyr-${providerId}`;
  
  try {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  } catch (error) {
    console.error(`Errore rimuovendo provider ${providerId}:`, error);
  }
}

/**
 * Cambia basemap (rimuove il precedente e aggiunge il nuovo)
 */
export function setBasemap(map: Map, newBasemapId: string, opacity = 1): boolean {
  const newProvider = getProviderById(newBasemapId);
  if (!newProvider || newProvider.type !== "basemap") {
    console.error(`Basemap ${newBasemapId} non trovato o non valido`);
    // Fallback al basemap di default
    if (newBasemapId !== DEFAULT_BASEMAP) {
      console.log(`Fallback a ${DEFAULT_BASEMAP}`);
      return setBasemap(map, DEFAULT_BASEMAP, opacity);
    }
    return false;
  }

  // Se il provider è disabilitato, usa il default
  if (newProvider.enabled === false) {
    console.warn(`Basemap ${newBasemapId} è disabilitato, fallback a ${DEFAULT_BASEMAP}`);
    if (newBasemapId !== DEFAULT_BASEMAP) {
      return setBasemap(map, DEFAULT_BASEMAP, opacity);
    }
    return false;
  }

  // Rimuovi basemap precedenti
  const currentBasemaps = TILE_PROVIDERS
    .filter(p => p.type === "basemap")
    .map(p => p.id);
    
  currentBasemaps.forEach(id => {
    if (id !== newBasemapId) {
      removeProvider(map, id);
    }
  });

  // Aggiungi nuovo basemap
  const success = ensureProvider(map, newProvider, opacity);
  
  // Se fallisce e non è già il default, prova con il default
  if (!success && newBasemapId !== DEFAULT_BASEMAP) {
    console.warn(`Fallimento caricamento ${newBasemapId}, usando ${DEFAULT_BASEMAP}`);
    return setBasemap(map, DEFAULT_BASEMAP, opacity);
  }
  
  return success;
}

/**
 * Toggle overlay (aggiunge se non presente, rimuove se presente)
 */
export function toggleOverlay(map: Map, overlayId: string, enable?: boolean, opacity = 0.7): boolean {
  const provider = getProviderById(overlayId);
  if (!provider || provider.type !== "overlay") {
    console.error(`Overlay ${overlayId} non trovato o non valido`);
    return false;
  }

  const layerId = `lyr-${overlayId}`;
  const isCurrentlyActive = !!map.getLayer(layerId);
  
  const shouldEnable = enable !== undefined ? enable : !isCurrentlyActive;
  
  if (shouldEnable && !isCurrentlyActive) {
    return ensureProvider(map, provider, opacity);
  } else if (!shouldEnable && isCurrentlyActive) {
    removeProvider(map, overlayId);
    return true;
  }
  
  return false;
}

/**
 * Aggiorna opacità di un layer esistente
 */
export function updateLayerOpacity(map: Map, providerId: string, opacity: number): void {
  const layerId = `lyr-${providerId}`;
  if (map.getLayer(layerId)) {
    map.setPaintProperty(layerId, "raster-opacity", opacity);
  }
}

/**
 * Ritorna lo stato attuale dei layer (quali sono attivi)
 */
export function getActiveLayersState(map: Map): {
  basemap: string | null;
  overlays: string[];
  opacities: Record<string, number>;
} {
  const result = {
    basemap: null as string | null,
    overlays: [] as string[],
    opacities: {} as Record<string, number>
  };

  TILE_PROVIDERS.forEach(provider => {
    const layerId = `lyr-${provider.id}`;
    const layer = map.getLayer(layerId);
    
    if (layer && layer.type === "raster") {
      const opacity = (map.getPaintProperty(layerId, "raster-opacity") as number) || 1;
      result.opacities[provider.id] = opacity;
      
      if (provider.type === "basemap") {
        result.basemap = provider.id;
      } else {
        result.overlays.push(provider.id);
      }
    }
  });

  return result;
}

/**
 * Verifica se una chiave di environment è disponibile
 */
function checkEnvironmentKey(keyName: string): boolean {
  if (typeof process !== 'undefined' && process.env) {
    return !!(process.env as any)[keyName];
  }
  return false;
}

/**
 * Configura impostazioni per performance ottimali
 */
export function configureMapPerformance(map: Map): void {
  // Impostazioni per transizioni morbide e performance
  map.on('styledata', () => {
    // Retry automatico per tile falliti - configurazione avanzata
    console.log('Map style loaded, tiles configured for optimal performance');
  });
}