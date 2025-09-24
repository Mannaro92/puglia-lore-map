/**
 * MEMOIR GIS - POI Layers Robust Implementation
 * Sistema definitivo per gestione POI senza loop
 */

import type { Map } from 'maplibre-gl';
import type { GeoJSON } from 'geojson';
import {
  POI_SRC_ID, POI_CIRCLES_ID, POI_LABELS_ID,
  BRAND_GREEN, BRAND_AZURE, BRAND_WHITE
} from '@/components/map/poi-constants';
import { supabase } from '@/integrations/supabase/client';

/**
 * Source idempotente - mai re-add, solo aggiornamento dati
 */
export function ensurePoiSource(map: Map, data: string | GeoJSON.FeatureCollection | undefined) {
  if (!data) return;
  
  const src = map.getSource(POI_SRC_ID) as any;
  if (src) {
    // Aggiorna solo i dati se source già esiste
    try { 
      if (typeof data !== 'string') {
        src.setData(data); 
      }
    } catch (e) {
      console.warn('[POI] Failed to update source data:', e);
    }
    return;
  }
  
  // Crea source solo se non esiste
  map.addSource(POI_SRC_ID, {
    type: 'geojson',
    data,           // URL string o FeatureCollection
    generateId: true
  });
  console.log('[POI] Source created');
}

/**
 * Layer POI robusti + colori brand
 */
export function ensurePoiLayers(map: Map) {
  if (!map.getSource(POI_SRC_ID)) {
    console.warn('[POI] Cannot create layers: source missing');
    return;
  }

  const before = firstNonPoiSymbol(map) || undefined;
  console.log('[POI] Adding layers before:', before || 'end');

  // POI Circles con colori brand e hover
  if (!map.getLayer(POI_CIRCLES_ID)) {
    map.addLayer({
      id: POI_CIRCLES_ID,
      type: 'circle',
      source: POI_SRC_ID,
      minzoom: 4,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          5, 4, 
          10, 8, 
          14, 12, 
          18, 16
        ],
        'circle-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false], BRAND_AZURE,
          BRAND_GREEN
        ],
        'circle-stroke-width': 1,
        'circle-stroke-color': BRAND_WHITE,
        'circle-opacity': 1
      }
    }, before);
    console.log('[POI] Added poi-circles layer');
  }

  // POI Labels
  if (!map.getLayer(POI_LABELS_ID)) {
    map.addLayer({
      id: POI_LABELS_ID,
      type: 'symbol',
      source: POI_SRC_ID,
      minzoom: 8,
      layout: {
        'text-field': ['coalesce', ['get', 'toponimo'], ['get', 'title'], ['get', 'name']],
        'text-size': 12,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-offset': [0, 1.1],
        'text-anchor': 'top',
        'text-allow-overlap': false,   // niente collisioni eccessive
        'text-optional': true
      },
      paint: {
        'text-color': '#2B2B2B',
        'text-halo-color': BRAND_WHITE,
        'text-halo-width': 1
      }
    }, before);
    console.log('[POI] Added poi-labels layer');
  }
}

/**
 * Porta POI sempre in cima sopra basemap e overlay
 */
export function bringPoiLayersOnTop(map: Map) {
  // Muovi sempre in coda, sopra basemap e overlay
  [POI_CIRCLES_ID, POI_LABELS_ID].forEach(id => {
    if (map.getLayer(id)) {
      map.moveLayer(id);
    }
  });
  console.log('[POI] Layers moved to top');
}

/**
 * Cerca il primo SYMBOL che non sia dei POI
 */
function firstNonPoiSymbol(map: Map): string | null {
  try {
    const layers = map.getStyle()?.layers ?? [];
    for (const layer of layers) {
      if (layer.type === 'symbol' && 
          layer.id !== POI_LABELS_ID && 
          !layer.id.startsWith('poi-')) {
        return layer.id;
      }
    }
  } catch (e) {
    console.warn('[POI] Error finding symbol layers:', e);
  }
  return null;
}

/**
 * Caricamento dati POI una volta sola
 */
export async function loadPublicPois(): Promise<GeoJSON.FeatureCollection> {
  try {
    console.info('[POI] Loading via Supabase RPC...');
    
    const { data: geojson, error } = await supabase.rpc('rpc_list_sites_bbox', {
      bbox_geom: null,
      include_drafts: false // Only published POIs for public view
    });

    if (error) {
      console.warn('[POI] RPC error:', error);
      return createEmptyFeatureCollection();
    }

    if (!geojson || typeof geojson !== 'object') {
      console.warn('[POI] Invalid RPC response format');
      return createEmptyFeatureCollection();
    }

    const featuresCount = (geojson as any).features?.length || 0;
    console.info(`[POI] ✅ Loaded ${featuresCount} public POIs via RPC`);
    
    return (geojson as unknown) as GeoJSON.FeatureCollection;
    
  } catch (e) {
    console.error('[POI] Fetch failed:', e);
    return createEmptyFeatureCollection();
  }
}

/**
 * Create empty FeatureCollection as fallback
 */
function createEmptyFeatureCollection(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

/**
 * Setup POI hover interaction (azzurro al hover)
 */
export function setupPoiHoverInteraction(map: Map, onFeatureClick?: (feature: any) => void) {
  let hoverId: number | null = null;

  // Mouse move - azzurro hover
  map.on('mousemove', POI_CIRCLES_ID, (e) => {
    if (!e.features?.length) return;
    const id = e.features[0].id as number;
    
    if (hoverId !== null && hoverId !== id) {
      map.setFeatureState({ source: POI_SRC_ID, id: hoverId }, { hover: false });
    }
    hoverId = id;
    map.setFeatureState({ source: POI_SRC_ID, id }, { hover: true });
    map.getCanvas().style.cursor = 'pointer';
  });

  // Mouse leave - rimuovi hover
  map.on('mouseleave', POI_CIRCLES_ID, () => {
    if (hoverId !== null) {
      map.setFeatureState({ source: POI_SRC_ID, id: hoverId }, { hover: false });
      hoverId = null;
    }
    map.getCanvas().style.cursor = '';
  });

  // Click handler
  map.on('click', POI_CIRCLES_ID, (e) => {
    console.log('[POI] Circle clicked:', e.features?.[0]);
    if (e.features && e.features.length > 0) {
      onFeatureClick?.(e.features[0]);
    }
  });

  console.log('[POI] Hover interaction setup complete');
}