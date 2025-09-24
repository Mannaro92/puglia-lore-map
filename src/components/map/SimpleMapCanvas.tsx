import React, { useRef, useEffect, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { supabase } from '@/integrations/supabase/client'
import { MapProvider } from '@/lib/MapContext'
import { configureMapPerformance, setBasemap, toggleOverlay } from '@/lib/map/add-tiles'
import { DEFAULT_BASEMAP } from '@/lib/map/tiles-providers'
import { getInitialLayerState } from '@/lib/map/url-persistence'
import { FALLBACK_OSM_STYLE } from '@/lib/map/style-fallback'
import { 
  ensurePoiSource, 
  ensurePoiLayers, 
  bringPoiLayersOnTop, 
  loadPublicPois, 
  countFeatures,
  setupPoiInteraction
} from '@/lib/map/poi-layers'

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

    map.on('load', async () => {
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
      
      // Load and setup POI data immediately
      await setupPOIs()
    })

    // Re-add POI layers after any style change (basemap switch)
    map.on('styledata', async () => {
      console.info('[MAP] Style changed, re-ensuring POI layers...');
      
      // Prevent infinite loops - only act if POI layers don't exist
      if (map.getLayer('poi-circles') && map.getLayer('poi-labels')) {
        console.log('[MAP] POI layers already exist, skipping re-add');
        return;
      }
      
      // Wait a bit for style to be fully loaded
      setTimeout(async () => {
        try {
          // Re-ensure POI layers after style change
          if (map.getSource('pois')) {
            ensurePoiLayers(map);
            bringPoiLayersOnTop(map);
            console.log('[MAP] ✅ POI layers restored after style change');
          } else {
            // Reload POIs if source was lost
            console.log('[MAP] POI source lost, reloading...');
            await setupPOIs();
          }
        } catch (e) {
          console.error('[MAP] Error restoring POI layers:', e);
        }
      }, 100);
    })

    // Setup POI function
    const setupPOIs = async () => {
      try {
        console.log('[MAP] 🔄 Loading POI data...');
        const poiData = await loadPublicPois();
        const featuresCount = countFeatures(poiData);
        
        ensurePoiSource(map, poiData);
        ensurePoiLayers(map);
        bringPoiLayersOnTop(map);
        setupPoiInteraction(map, onFeatureClick);
        
        console.log(`[MAP] ✅ POI setup complete: ${featuresCount} features`);
      } catch (e) {
        console.error('[MAP] ❌ POI setup failed:', e);
      }
    }

    // Error handling
    map.on('error', (e) => {
      console.error('[MAP] Error:', e?.error ?? e);
    })

    return () => {
      map.remove()
    }
  }, [])

  // Legacy function kept for compatibility (now uses new POI system)
  const loadPOIData = async () => {
    console.log('[MAP] Legacy loadPOIData called - using new POI system');
    // This now just triggers the new POI system
    if (mapRef.current) {
      try {
        const poiData = await loadPublicPois();
        ensurePoiSource(mapRef.current, poiData);
        ensurePoiLayers(mapRef.current);
        bringPoiLayersOnTop(mapRef.current);
      } catch (e) {
        console.error('[MAP] Legacy POI load failed:', e);
      }
    }
  };

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
          className="absolute inset-0 bg-gray-100"
          style={{ height: '100vh', minHeight: '100%' }}
        />
        {children}
      </div>
    </MapProvider>
  )
}