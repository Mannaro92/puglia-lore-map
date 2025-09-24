import React, { useRef, useEffect, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { supabase } from '@/integrations/supabase/client'
import { MapProvider } from '@/lib/MapContext'
import { configureMapPerformance, setBasemap, toggleOverlay } from '@/lib/map/add-tiles'
import { DEFAULT_BASEMAP } from '@/lib/map/tiles-providers'
import { getInitialLayerState } from '@/lib/map/url-persistence'

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
    
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          sites: {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: []
            }
          }
        },
        layers: [
          {
            id: "sites-circles",
            type: "circle",
            source: "sites",
            layout: {
              "visibility": "visible"
            },
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                8, 8,
                12, 10,
                16, 12,
                20, 16
              ],
              "circle-color": "#339966",
              "circle-stroke-width": 3,
              "circle-stroke-color": "#ffffff",
              "circle-opacity": 1,
              "circle-stroke-opacity": 1
            }
          },
          {
            id: "sites-labels",
            type: "symbol",
            source: "sites",
            layout: {
              "visibility": "visible",
              "text-field": "{toponimo}",
              "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
              "text-size": [
                "interpolate",
                ["linear"],
                ["zoom"],
                8, 10,
                12, 12,
                16, 14,
                20, 18
              ],
              "text-offset": [0, 2],
              "text-anchor": "top",
              "text-allow-overlap": false,
              "text-ignore-placement": false
            },
            paint: {
              "text-color": "#339966",
              "text-halo-color": "#ffffff",
              "text-halo-width": 2,
              "text-opacity": 1,
              "text-halo-opacity": 1
            }
          }
        ]
      } as any,
      center: initialCenter,
      zoom: initialZoom,
      maxZoom: 18,  // Limite generale applicazione
      minZoom: 5
    })

    // Add controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left')

    mapRef.current = map

    map.on('load', () => {
      setMapLoaded(true)

      // Performance tweaks and default basemap only
      try {
        configureMapPerformance(map)
        const init = getInitialLayerState(DEFAULT_BASEMAP)
        // Solo basemap, niente overlay per ottimizzare velocità
        if (init.basemap) {
          const ok = setBasemap(map as any, init.basemap)
        }
      } catch (e) {
        console.error('Errore init basemap:', e)
      }
      
      // Load POI data AFTER basemap is ready  
      setTimeout(() => {
        console.log('⏰ Scheduled POI data loading...');
        loadPOIData()
      }, 800)
      
      // Ensure POI layers are always on top after basemap changes
      setTimeout(() => {
        try {
          console.log('🔝 Moving POI layers to top...');
          // Move POI layers to top with force
          if (map.getLayer('sites-circles')) {
            map.moveLayer('sites-circles');
            console.log('✅ Moved sites-circles layer to top');
          } else {
            console.error('❌ sites-circles layer not found');
          }
          if (map.getLayer('sites-labels')) {
            map.moveLayer('sites-labels');
            console.log('✅ Moved sites-labels layer to top');
          } else {
            console.error('❌ sites-labels layer not found');
          }
          
          // Force layer visibility
          map.setLayoutProperty('sites-circles', 'visibility', 'visible');
          map.setLayoutProperty('sites-labels', 'visibility', 'visible');
          console.log('🎯 Forced POI layer visibility');
          
        } catch (e) {
          console.error('❌ Layer reordering failed:', e);
        }
      }, 1500) // Increased delay to ensure basemap is fully loaded
      
      // Additional check to ensure POI data is loaded after everything settles
      setTimeout(() => {
        console.log('🔄 Final POI data check and reload...');
        loadPOIData()
      }, 2500)
    })

    // Handle clicks on POI features
    map.on('click', 'sites-circles', (e) => {
      console.log('🎯 POI circle clicked:', e.features?.[0]);
      if (e.features && e.features.length > 0) {
        onFeatureClick?.(e.features[0])
      }
    })

    map.on('mouseenter', 'sites-circles', () => {
      map.getCanvas().style.cursor = 'pointer'
      console.log('👆 Mouse entered POI circle');
    })

    map.on('mouseleave', 'sites-circles', () => {
      map.getCanvas().style.cursor = ''
    })

    map.on('error', (e) => {
      // Map errors handled silently in production
    })

    return () => {
      map.remove()
    }
  }, [])

  // Load POI data using RPC function
  const loadPOIData = async () => {
    if (!mapRef.current) {
      console.log('🗺️ Map not ready for POI loading');
      return;
    }
    
    console.log('🔄 Loading POI data...');
    
    try {
      const { data: geojson, error } = await supabase.rpc('rpc_list_sites_bbox', {
        bbox_geom: null,
        include_drafts: false // Only published POIs for public view
      });
      
      console.log('📊 POI RPC response:', { geojson, error });
      
      if (error) {
        console.error('❌ Error loading POI data:', error);
        return;
      }
      
      if (!geojson || typeof geojson !== 'object') {
        console.log('⚠️ No POI data received or invalid format');
        return;
      }

      const featuresCount = (geojson as any).features?.length || 0;
      console.log('✅ POI data loaded, features count:', featuresCount);
      
      if (featuresCount === 0) {
        console.warn('⚠️ No POI features found in response');
        return;
      }

      // Verifica che il source esista prima di impostare i dati
      const source = mapRef.current.getSource('sites') as maplibregl.GeoJSONSource;
      if (source) {
        source.setData(geojson as any);
        console.log('🎯 POI data set to map source');
        
        // Debug: verifica che i layer siano visibili
        setTimeout(() => {
          const circleLayer = mapRef.current?.getLayer('sites-circles');
          const labelLayer = mapRef.current?.getLayer('sites-labels');
          console.log('🔍 Layer visibility check:', {
            circleLayer: circleLayer ? 'exists' : 'missing',
            labelLayer: labelLayer ? 'exists' : 'missing',
            circleVisible: mapRef.current?.getLayoutProperty('sites-circles', 'visibility'),
            labelVisible: mapRef.current?.getLayoutProperty('sites-labels', 'visibility')
          });
        }, 1000);
        
      } else {
        console.error('❌ Sites source not found on map');
      }
      
    } catch (error) {
      console.error('❌ Error in loadPOIData:', error);
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
      <div className="relative h-full w-full">
        <div 
          ref={containerRef} 
          className="absolute inset-0 bg-gray-100"
          style={{ minHeight: '100%' }}
        />
        {children}
      </div>
    </MapProvider>
  )
}