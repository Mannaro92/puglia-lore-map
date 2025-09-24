/**
 * MEMOIR GIS - POI Layers Management
 * Funzioni robuste e idempotenti per gestire source e layer POI
 */

import type { Map as MapLibreMap } from 'maplibre-gl';
import type { GeoJSON } from 'geojson';
import { supabase } from '@/integrations/supabase/client';

export type MapInstance = MapLibreMap;

/**
 * Ensure POI source exists (idempotent)
 */
export function ensurePoiSource(map: MapInstance, data: string | GeoJSON.FeatureCollection) {
  const id = 'pois';
  if (map.getSource(id)) {
    console.log('[POI] Source already exists, updating data');
    const source = map.getSource(id) as any;
    if (source && typeof source.setData === 'function') {
      source.setData(data);
    }
    return;
  }
  
  console.log('[POI] Adding new source');
  map.addSource(id, {
    type: 'geojson',
    data,
    generateId: true
  });
}

/**
 * Ensure POI layers exist (idempotent)
 */
export function ensurePoiLayers(map: MapInstance) {
  const src = 'pois';
  if (!map.getSource(src)) {
    console.warn('[POI] Cannot add layers: source "pois" not found');
    return;
  }

  const beforeLayer = firstSymbolLayerId(map) || undefined;
  console.log(`[POI] Adding layers before: ${beforeLayer || 'end'}`);

  // POI Circles - Brand colors: verde #1FA380
  if (!map.getLayer('poi-circles')) {
    map.addLayer({
      id: 'poi-circles',
      type: 'circle',
      source: src,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          5, 4,
          8, 6, 
          10, 8, 
          12, 10,
          14, 12,
          16, 14
        ],
        'circle-color': '#1FA380', // Verde CHANGES
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FFFFFF', // Bianco
        'circle-opacity': 1,
        'circle-stroke-opacity': 1
      }
    }, beforeLayer);
    console.log('[POI] Added poi-circles layer');
  }

  // POI Labels
  if (!map.getLayer('poi-labels')) {
    map.addLayer({
      id: 'poi-labels',
      type: 'symbol',
      source: src,
      layout: {
        'text-field': ['coalesce', ['get', 'toponimo'], ['get', 'title'], ['get', 'name']],
        'text-size': [
          'interpolate', ['linear'], ['zoom'],
          8, 10,
          10, 12,
          12, 13,
          14, 14,
          16, 16
        ],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
        'text-allow-overlap': false,
        'text-ignore-placement': false
      },
      paint: {
        'text-color': '#1FA380', // Verde CHANGES per coerenza
        'text-halo-color': '#FFFFFF', // Bianco
        'text-halo-width': 2,
        'text-opacity': 1
      }
    }, beforeLayer);
    console.log('[POI] Added poi-labels layer');
  }
}

/**
 * Bring POI layers to top (after basemap changes)
 */
export function bringPoiLayersOnTop(map: MapInstance) {
  console.log('[POI] Bringing layers to top');
  ['poi-circles', 'poi-labels'].forEach((id) => {
    if (map.getLayer(id)) {
      map.moveLayer(id);
      console.log(`[POI] Moved ${id} to top`);
    }
  });
}

/**
 * Find first symbol layer for proper ordering (excluding our own POI layers)
 */
function firstSymbolLayerId(map: MapInstance): string | null {
  try {
    const layers = map.getStyle()?.layers ?? [];
    for (const layer of layers) {
      if (layer.type === 'symbol' && 
          layer.id !== 'poi-labels' && 
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
 * Load public POI data with robust fallback
 */
export async function loadPublicPois(): Promise<GeoJSON.FeatureCollection> {
  try {
    console.log('[POI] Loading via Supabase RPC...');
    
    const { data: geojson, error } = await supabase.rpc('rpc_list_sites_bbox', {
      bbox_geom: null,
      include_drafts: false // Only published POIs for public view
    });

    if (error) {
      console.error('[POI] RPC error:', error);
      return createEmptyFeatureCollection();
    }

    if (!geojson || typeof geojson !== 'object') {
      console.warn('[POI] Invalid RPC response format');
      return createEmptyFeatureCollection();
    }

    const featuresCount = (geojson as any).features?.length || 0;
    console.log(`[POI] ✅ Loaded ${featuresCount} public POIs via RPC`);
    
    // Safe casting via unknown
    return (geojson as unknown) as GeoJSON.FeatureCollection;
    
  } catch (e) {
    console.error('[POI] RPC failed:', e);
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
 * Count features for logging
 */
export function countFeatures(data: GeoJSON.FeatureCollection | string): string {
  if (typeof data === 'string') return 'URL';
  return String(data?.features?.length ?? 0);
}

/**
 * Setup POI click handlers
 */
export function setupPoiInteraction(map: MapInstance, onFeatureClick?: (feature: any) => void) {
  // Click handler
  map.on('click', 'poi-circles', (e) => {
    console.log('[POI] Circle clicked:', e.features?.[0]);
    if (e.features && e.features.length > 0) {
      onFeatureClick?.(e.features[0]);
    }
  });

  // Cursor changes
  map.on('mouseenter', 'poi-circles', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'poi-circles', () => {
    map.getCanvas().style.cursor = '';
  });

  console.log('[POI] Interaction handlers setup');
}