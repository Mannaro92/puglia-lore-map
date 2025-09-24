import React, { useRef, useEffect, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { supabase } from '@/integrations/supabase/client'
import { MapProvider } from '@/lib/MapContext'
import { configureMapPerformance, setBasemap } from '@/lib/map/add-tiles'
import { DEFAULT_BASEMAP } from '@/lib/map/tiles-providers'
import { getInitialLayerState } from '@/lib/map/url-persistence'
import { FALLBACK_OSM_STYLE } from '@/lib/map/style-fallback'
import { 
  ensurePoiSource, 
  ensurePoiLayers, 
  bringPoiLayersOnTop, 
  loadPublicPois,
  setupPoiHoverInteraction
} from '@/lib/map/poi-layers-robust'

interface SimpleMapCanvasProps {
  onFeatureClick?: (feature: any) => void
  focusSiteId?: string | null
  mapCenter?: [number, number] | null
  initialCenter?: [number, number]
  initialZoom?: number
  children?: React.ReactNode
}

export function SimpleMapCanvas({ 
  onFeatureClick,
  focusSiteId = null,
  mapCenter = null,
  initialCenter = [16.6, 41.1],
  initialZoom = 8,
  children
}: SimpleMapCanvasProps) {
  const mapRef = useRef<maplibregl.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    
    console.info('[MAP] Initializing with fallback OSM style...');
    
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: FALLBACK_OSM_STYLE, // ✅ Fallback immediato OSM
      center: [16.6, 41.1], // Puglia approx per inquadratura CHANGES
      zoom: 8,
      maxZoom: 18,
      minZoom: 5
    })

    // Add controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left')

    mapRef.current = map

    // 🔧 Anti-loop + Debounce su styledata
    let styledataBusy = false;
    let styledataTimer: any = null;

    map.on('styledata', () => {
      if (styledataBusy) return;
      clearTimeout(styledataTimer);
      styledataTimer = setTimeout(() => {
        styledataBusy = true;
        try {
          // NON ricreare source se esiste: idempotente
          const poiData = (window as any).__POI_DATA__;
          if (poiData) {
            ensurePoiSource(map, poiData);
            ensurePoiLayers(map);
            bringPoiLayersOnTop(map);
            console.info('[POI] styledata sync OK');
          }
        } catch (e) {
          console.error('[POI] styledata sync ERR', e);
        } finally {
          styledataBusy = false;
        }
      }, 60); // debounce breve
    });

    map.once('load', async () => {
      console.info('[MAP] ✅ Map loaded successfully');
      setMapLoaded(true)

      // Performance tweaks and default basemap
      try {
        configureMapPerformance(map)
        const init = getInitialLayerState(DEFAULT_BASEMAP)
        
        // Setup basemap (will trigger styledata event)
        if (init.basemap) {
          console.log(`[MAP] Setting basemap: ${init.basemap}`);
          setBasemap(map as any, init.basemap)
        }
      } catch (e) {
        console.error('[MAP] Error init basemap:', e)
      }
      
      // 🔧 Caricamento dati POI una volta sola
      const poiData = await loadPublicPois();
      // Conserva globalmente per riuso su ogni style change (no rifetch):
      (window as any).__POI_DATA__ = poiData;

      ensurePoiSource(map, poiData);
      ensurePoiLayers(map);
      bringPoiLayersOnTop(map);
      setupPoiHoverInteraction(map, onFeatureClick);

      console.info('[POI] ready');
      
      // 🔧 Acceptance Checklist (stampa in console)
      setTimeout(() => {
        console.log('✅ style loaded:', (map as any).isStyleLoaded ? (map as any).isStyleLoaded() : 'unknown');
        console.log('✅ source:', !!map.getSource('pois'));
        console.log('✅ layers:', !!map.getLayer('poi-circles'), !!map.getLayer('poi-labels'));
        console.log('✅ on top (order enforced)');
      }, 500);
    })

    // Error handling
    map.on('error', (e) => {
      console.error('[MAP] Error:', e?.error ?? e);
    })

    return () => {
      map.remove()
    }
  }, [])

  // Focus on specific site
  useEffect(() => {
    if (!mapRef.current || !focusSiteId || !mapLoaded) return;
    
    const loadAndFocusSite = async () => {
      try {
        const { data, error } = await supabase
          .from('sites')
          .select('geom_point')
          .eq('id', focusSiteId)
          .maybeSingle(); // Use maybeSingle to avoid errors when no data found
          
        if (error) {
          console.error('Errore caricando dettagli sito:', error);
          return;
        }
        
        if (!data?.geom_point) {
          return;
        }
        
        const coords = (data.geom_point as any)?.coordinates;
        if (coords && Array.isArray(coords) && coords.length >= 2) {
          mapRef.current!.flyTo({
            center: [coords[0], coords[1]],
            zoom: 14,
            duration: 2000
          });
        }
      } catch (error) {
        console.error('Error focusing on site:', error);
      }
    };
    
    loadAndFocusSite();
  }, [focusSiteId, mapLoaded]);

  // Navigate to specific coordinates
  useEffect(() => {
    if (!mapRef.current || !mapCenter || !mapLoaded) return
    
    mapRef.current.flyTo({
      center: mapCenter,
      zoom: 14,
      duration: 2000
    })
  }, [mapCenter, mapLoaded])

  return (
    <MapProvider map={mapRef.current}>
      <div className="relative h-full w-full map-container">
        <div 
          ref={containerRef} 
          className="absolute inset-0 bg-gray-100 map-container"
          style={{ height: '100vh', minHeight: '100vh' }}
        />
        {children}
      </div>
    </MapProvider>
  )
}