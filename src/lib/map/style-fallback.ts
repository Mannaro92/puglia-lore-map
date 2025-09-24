/**
 * MEMOIR GIS - Style Fallback OSM
 * Garantisce mappa sempre visibile evitando schermo grigio
 */

import type { StyleSpecification } from 'maplibre-gl';

export const FALLBACK_OSM_STYLE: StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors'
    }
  },
  layers: [
    { 
      id: 'osm-tiles', 
      type: 'raster', 
      source: 'osm-tiles', 
      minzoom: 0, 
      maxzoom: 19 
    }
  ]
};