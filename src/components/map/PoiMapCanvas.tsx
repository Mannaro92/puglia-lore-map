import React, { useRef, useEffect, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { supabase } from '@/integrations/supabase/client'

interface PoiMapCanvasProps {
  onMapClick?: (lngLat: { lng: number; lat: number }) => void
  clickToPlaceMode?: boolean
  focusSiteId?: string | null
  initialCenter?: [number, number]
  initialZoom?: number
  coordinates?: { lon: number; lat: number } | null
}

export function PoiMapCanvas({ 
  onMapClick,
  clickToPlaceMode = false,
  focusSiteId = null,
  initialCenter = [16.6, 41.1],
  initialZoom = 8,
  coordinates
}: PoiMapCanvasProps) {
  const mapRef = useRef<maplibregl.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [clickMarker, setClickMarker] = useState<maplibregl.Marker | null>(null)

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return
    
    console.log('🗺️ PoiMapCanvas initializing...')
    
    // Create simple OSM style
    const osmStyle = {
      version: 8 as const,
      glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      sources: {
        osm: {
          type: "raster" as const,
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        },
        sites: {
          type: "geojson" as const,
          data: {
            type: "FeatureCollection",
            features: []
          } as any
        }
      },
      layers: [
        {
          id: "osm",
          type: "raster" as const,
          source: "osm"
        },
        {
          id: "sites-circles",
          type: "circle" as const,
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
          type: "symbol" as const,
          source: "sites",
          layout: {
            "text-field": "{toponimo}",
            "text-font": ["Noto Sans Regular"],
            "text-size": 12,
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
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: osmStyle as any, // Type cast for MapLibre compatibility
      center: initialCenter,
      zoom: initialZoom,
      maxZoom: 18,
      minZoom: 5
    })

    // Add controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left')

    mapRef.current = map

    map.on('load', () => {
      console.log('✅ PoiMapCanvas loaded successfully')
      setMapLoaded(true)
      
      // Load POI data
      loadPOIData()
      
      // Set cursor for click-to-place mode
      if (clickToPlaceMode) {
        map.getCanvas().style.cursor = 'crosshair'
      }
    })

    // Handle clicks on POI features
    map.on('click', 'sites-circles', (e) => {
      e.preventDefault()
      if (e.features && e.features.length > 0) {
        console.log('POI clicked:', e.features[0].properties)
      }
    })

    // Handle general map clicks for placement mode
    map.on('click', (e) => {
      if (clickToPlaceMode && onMapClick) {
        const features = map.queryRenderedFeatures(e.point, { layers: ['sites-circles'] })
        if (features.length === 0) {
          onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat })
        }
      }
    })

    map.on('mouseenter', 'sites-circles', () => {
      map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'sites-circles', () => {
      map.getCanvas().style.cursor = clickToPlaceMode ? 'crosshair' : ''
    })

    map.on('error', (e) => {
      console.error('❌ PoiMapCanvas error:', e)
    })

    return () => {
      clickMarker?.remove()
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
        include_drafts: true
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

  // Handle cursor change for click-to-place mode
  useEffect(() => {
    if (!mapRef.current) return
    
    const canvas = mapRef.current.getCanvas()
    canvas.style.cursor = clickToPlaceMode ? 'crosshair' : ''
  }, [clickToPlaceMode])

  // Handle coordinates marker
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    
    // If coordinates exist, update or create marker
    if (coordinates) {
      if (clickMarker) {
        // Update existing marker position
        clickMarker.setLngLat([coordinates.lon, coordinates.lat])
      } else {
        // Create new marker
        const marker = new maplibregl.Marker({
          color: '#e63946',
          draggable: true
        })
          .setLngLat([coordinates.lon, coordinates.lat])
          .addTo(mapRef.current)
        
        // Handle marker drag
        marker.on('dragend', () => {
          const lngLat = marker.getLngLat()
          console.log('🎯 Marker dragged to:', lngLat)
          onMapClick?.({ lng: lngLat.lng, lat: lngLat.lat })
        })
        
        // Handle marker drag during movement for real-time feedback
        marker.on('drag', () => {
          const lngLat = marker.getLngLat()
          // Optional: provide real-time feedback during drag
          // onMapClick?.({ lng: lngLat.lng, lat: lngLat.lat })
        })
        
        setClickMarker(marker)
      }
    } else {
      // Remove marker if no coordinates
      if (clickMarker) {
        clickMarker.remove()
        setClickMarker(null)
      }
    }
  }, [coordinates, mapLoaded, onMapClick])

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

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 bg-gray-100"
      style={{ minHeight: '100%' }}
    />
  )
}