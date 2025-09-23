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
    
    console.log('🗺️ SimpleMapCanvas initializing...')
    
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
            paint: {
              "circle-radius": 6,
              "circle-color": "#e63946",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff"
            }
          },
          {
            id: "sites-labels",
            type: "symbol",
            source: "sites",
            layout: {
              "text-field": "{toponimo}",
              "text-font": ["Noto Sans Regular"],
              "text-size": [
                "interpolate",
                ["linear"],
                ["zoom"],
                8, 8,
                12, 12,
                16, 16,
                20, 20
              ],
              "text-offset": [0, 1.5],
              "text-anchor": "top"
            },
            paint: {
              "text-color": "#333",
              "text-halo-color": "#fff",
              "text-halo-width": 1
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
      console.log('✅ SimpleMapCanvas loaded successfully')
      setMapLoaded(true)

      // Performance tweaks and default layers
      try {
        configureMapPerformance(map)
        const init = getInitialLayerState(DEFAULT_BASEMAP)
        // Basemap
        if (init.basemap) {
          const ok = setBasemap(map as any, init.basemap)
          console.log('Basemap init', init.basemap, ok)
        }
        // Overlays
        if (init.overlays?.length) {
          init.overlays.forEach((id) => {
            const op = init.opacities?.[id] ?? 0.7
            toggleOverlay(map as any, id, true, op)
          })
        }
      } catch (e) {
        console.error('Errore init basemap/overlays:', e)
      }
      
      // Load POI data
      loadPOIData()
      
      // Resize map after load to ensure proper rendering
      setTimeout(() => map.resize(), 0)
    })

    // Handle clicks on POI features
    map.on('click', 'sites-circles', (e) => {
      if (e.features && e.features.length > 0) {
        onFeatureClick?.(e.features[0])
      }
    })

    map.on('mouseenter', 'sites-circles', () => {
      map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'sites-circles', () => {
      map.getCanvas().style.cursor = ''
    })

    map.on('error', (e) => {
      console.error('❌ SimpleMapCanvas error:', e)
    })

    return () => {
      map.remove()
    }
  }, [])

  // Load POI data using RPC function
  const loadPOIData = async () => {
    if (!mapRef.current) return
    
    try {
      console.log('📡 Loading POI data...')
      const { data: geojson, error } = await supabase.rpc('rpc_list_sites_bbox', {
        bbox_geom: null,
        include_drafts: false // Only published POIs for public view
      })
      
      if (error) {
        console.error('❌ Error loading POI data:', error)
        return
      }
      
      console.log('✅ Loaded POI data:', geojson)
      
      const source = mapRef.current.getSource('sites') as maplibregl.GeoJSONSource
      if (source && geojson && typeof geojson === 'object') {
        source.setData(geojson as any)
      }
      
    } catch (error) {
      console.error('❌ Error in loadPOIData:', error)
    }
  }

  // Focus on specific site
  useEffect(() => {
    if (!mapRef.current || !focusSiteId || !mapLoaded) return
    
    const loadAndFocusSite = async () => {
      try {
        const { data, error } = await supabase
          .from('sites')
          .select('geom_point')
          .eq('id', focusSiteId)
          .single()
          
        if (error || !data?.geom_point) return
        
        const coords = (data.geom_point as any)?.coordinates
        if (coords && Array.isArray(coords) && coords.length >= 2) {
          mapRef.current!.flyTo({
            center: [coords[0], coords[1]],
            zoom: 14,
            duration: 2000
          })
        }
      } catch (error) {
        console.error('Error focusing on site:', error)
      }
    }
    
    loadAndFocusSite()
  }, [focusSiteId, mapLoaded])

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