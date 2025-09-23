/**
 * MEMOIR GIS - Configurazione Provider di Tiles
 * 
 * NOTA LEGALE: Rispettare le Tile Usage Policy di ciascun fornitore
 * - Mantenere sempre "© OpenStreetMap contributors" e le attribution specifiche
 * - Rispettare rate limits, caching policies e requisiti delle chiavi API
 * - Per provider commerciali: consultare i termini di servizio
 */

export type TileProvider = {
  id: string;
  name: string;
  type: "basemap" | "overlay";
  format: "raster" | "vector";
  url: string;                 // template {z}/{x}/{y}
  minzoom?: number;
  maxzoom?: number;
  effectiveMaxZoom?: number;   // Zoom massimo di qualità (può essere diverso da maxzoom)
  tileSize?: number;           // 256 default
  rasterResampling?: 'linear' | 'nearest'; // qualità/definizione raster
  attribution: string;         // HTML safe
  requiresKey?: boolean;
  keyEnv?: string;             // nome env var se serve
  subdomains?: string[];       // es. ["a","b","c"]
  crossOrigin?: "anonymous" | "use-credentials";
  description?: string;        // Descrizione per UI
  enabled?: boolean;           // Se disponibile (dipende da chiavi)
};

// Leggi chiavi da environment variables (sostituisci con le tue)
const MAPTILER_KEY = typeof process !== 'undefined' 
  ? process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "" 
  : "";
const THUNDER_KEY = typeof process !== 'undefined' 
  ? process.env.NEXT_PUBLIC_THUNDERFOREST_KEY ?? "" 
  : "";

export const TILE_PROVIDERS: TileProvider[] = [
  // --- BASEMAPS ---
  {
    id: "osm-standard",
    name: "OSM Standard",
    description: "Mappa standard di OpenStreetMap",
    type: "basemap",
    format: "raster",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"],
    maxzoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    enabled: true
  },
  {
    id: "osm-hot",
    name: "Umanitario (HOT)",
    description: "Stile umanitario con enfasi su ospedali, scuole",
    type: "basemap",
    format: "raster",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"],
    maxzoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles: OSM France (HOT)',
    enabled: true
  },
  {
    id: "cyc-osm",
    name: "CyclOSM",
    description: "Mappa ottimizzata per ciclisti e percorsi",
    type: "basemap",
    format: "raster",
    url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"],
    maxzoom: 20,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases" title="CyclOSM - Open Bicycle render">CyclOSM</a>',
    enabled: true
  },
  {
    id: "transport",
    name: "Mappa dei trasporti",
    description: "Trasporti pubblici e infrastrutture (richiede API key)",
    type: "basemap",
    format: "raster",
    url: `https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=${THUNDER_KEY}`,
    requiresKey: true,
    keyEnv: "NEXT_PUBLIC_THUNDERFOREST_KEY",
    maxzoom: 22,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://www.thunderforest.com/">Thunderforest</a>',
    enabled: !!THUNDER_KEY
  },
  {
    id: "opentopomap",
    name: "OpenTopoMap",
    description: "Mappa topografica ad alta qualità",
    type: "basemap",
    format: "raster",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"],
    maxzoom: 17,
    effectiveMaxZoom: 16, // OpenTopoMap qualità fino a zoom 16
    tileSize: 256,
    rasterResampling: 'linear',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://opentopomap.org/">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    enabled: true
  },
  {
    id: "shortbread",
    name: "Shortbread",
    description: "CARTO Positron (chiaro)",
    type: "basemap",
    format: "raster",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c", "d"],
    maxzoom: 20,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions">CARTO</a>',
    enabled: true
  },
  {
    id: "maptiler-omt",
    name: "MapTiler OMT (vector)",
    description: "Stile vettoriale ad alta qualità (richiede API key)",
    type: "basemap",
    format: "vector",
    url: `https://api.maptiler.com/maps/bright/style.json?key=${MAPTILER_KEY}`,
    requiresKey: true,
    keyEnv: "NEXT_PUBLIC_MAPTILER_KEY",
    attribution: '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    enabled: !!MAPTILER_KEY
  },

  // --- OVERLAYS ---
  {
    id: "osm-notes",
    name: "Note OSM",
    description: "Note e commenti della comunità OpenStreetMap",
    type: "overlay",
    format: "raster",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"],
    maxzoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    enabled: false // Disabled for now as the original URL doesn't work
  },
  {
    id: "osm-data-overlay",
    name: "Dati della mappa",
    description: "Overlay con dati aggiuntivi della mappa",
    type: "overlay",
    format: "raster",
    url: "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"],
    maxzoom: 20,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © OSM France',
    enabled: true
  },
  {
    id: "osm-gps",
    name: "Tracciati GPS pubblici",  
    description: "Tracce GPS condivise dalla comunità",
    type: "overlay",
    format: "raster",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"],
    maxzoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    enabled: false // Disabled for now as the GPS tiles URL doesn't work
  }
];

// Helper functions
export const getBasemapProviders = (): TileProvider[] => 
  TILE_PROVIDERS.filter(p => p.type === "basemap" && p.enabled !== false);

export const getOverlayProviders = (): TileProvider[] => 
  TILE_PROVIDERS.filter(p => p.type === "overlay" && p.enabled !== false);

export const getProviderById = (id: string): TileProvider | undefined => 
  TILE_PROVIDERS.find(p => p.id === id);

export const DEFAULT_BASEMAP = "osm-standard";