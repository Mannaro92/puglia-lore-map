import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import maplibregl from 'maplibre-gl'
import { createMapStyle, MapFilters, LayerOpacity } from '@/lib/mapStyle'
import { updateMapSources } from '@/lib/tiles'

export interface MapCanvasRef {
  getMap: () => maplibregl.Map | null
  setFilters: (filters: MapFilters) => void
  setLayerOpacity: (layer: keyof LayerOpacity, opacity: number) => void
  toggleLayer: (layer: string) => void
  fitBounds: (bbox: [number, number, number, number]) => void
  flyTo: (lng: number, lat: number, zoom?: number) => void
  getCurrentView: () => { lng: number, lat: number, zoom: number }
}

interface MapCanvasProps {
  functionsBase: string
  initialCenter?: [number, number]
  initialZoom?: number
  filters?: MapFilters
  layerVisibility?: Record<string, boolean>
  layerOpacity?: LayerOpacity
  onMapLoad?: () => void
  onMoveEnd?: (center: [number, number], zoom: number) => void
  onFeatureClick?: (feature: any) => void
  onFeatureHover?: (feature: any | null) => void
}

export const MapCanvas = forwardRef<MapCanvasRef, MapCanvasProps>(({
  functionsBase,
  initialCenter = [16.8, 41.1],
  initialZoom = 8,
  filters = {},
  layerVisibility = { sites: true, province: true, comuni: true },
  layerOpacity = { sites: 0.6, province: 0.7, comuni: 0.5 },
  onMapLoad,
  onMoveEnd,
  onFeatureClick,
  onFeatureHover
}, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const hoveredFeatureId = useRef<string | null>(null)

  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
    
    setFilters: (newFilters: MapFilters) => {
      if (mapRef.current) {
        updateMapSources(mapRef.current, functionsBase, newFilters)
      }
    },
    
    setLayerOpacity: (layer: keyof LayerOpacity, opacity: number) => {
      if (!mapRef.current) return
      
      const map = mapRef.current
      
      switch (layer) {
        case 'sites':
          if (map.getLayer('sites-fill')) {
            map.setPaintProperty('sites-fill', 'fill-opacity', [
              'case',
              ['==', ['get', 'ubicazione_confidenza'], 'incerta'],
              opacity * 0.35,
              opacity * 0.6
            ])
          }
          if (map.getLayer('sites-outline')) {
            map.setPaintProperty('sites-outline', 'line-opacity', opacity)
          }
          if (map.getLayer('sites-points')) {
            map.setPaintProperty('sites-points', 'circle-opacity', [
              'case',
              ['==', ['get', 'ubicazione_confidenza'], 'incerta'],
              opacity * 0.35,
              opacity
            ])
          }
          break
          
        case 'province':
          if (map.getLayer('province-line')) {
            map.setPaintProperty('province-line', 'line-opacity', opacity)
          }
          if (map.getLayer('province-fill')) {
            map.setPaintProperty('province-fill', 'fill-opacity', opacity * 0.3)
          }
          break
          
        case 'comuni':
          if (map.getLayer('comuni-line')) {
            map.setPaintProperty('comuni-line', 'line-opacity', opacity)
          }
          break
      }
    },
    
    toggleLayer: (layer: string) => {
      if (!mapRef.current) return
      
      const map = mapRef.current
      const layerIds = getLayerIds(layer)
      
      layerIds.forEach(layerId => {
        if (map.getLayer(layerId)) {
          const visibility = map.getLayoutProperty(layerId, 'visibility')
          map.setLayoutProperty(
            layerId,
            'visibility',
            visibility === 'visible' ? 'none' : 'visible'
          )
        }
      })
    },
    
    fitBounds: (bbox: [number, number, number, number]) => {
      if (!mapRef.current) return
      
      mapRef.current.fitBounds(bbox, {
        padding: { top: 50, bottom: 50, left: 50, right: 400 }, // Account for panel
        maxZoom: 16
      })
    },
    
    flyTo: (lng: number, lat: number, zoom = 14) => {
      if (!mapRef.current) return
      
      mapRef.current.flyTo({
        center: [lng, lat],
        zoom,
        duration: 1500
      })
    },
    
    getCurrentView: () => {
      if (!mapRef.current) return { lng: 0, lat: 0, zoom: 8 }
      
      const center = mapRef.current.getCenter()
      return {
        lng: center.lng,
        lat: center.lat,
        zoom: mapRef.current.getZoom()
      }
    }
  }))

  const getLayerIds = (layer: string): string[] => {
    switch (layer) {
      case 'sites':
        return ['sites-fill', 'sites-outline', 'sites-points', 'sites-highlight']
      case 'province':
        return ['province-fill', 'province-line']
      case 'comuni':
        return ['comuni-line']
      default:
        return []
    }
  }

  useEffect(() => {
    console.log('🗺️ MapCanvas useEffect - creating map')
    if (!mapContainer.current) {
      console.log('❌ MapCanvas container not found')
      return
    }

    console.log('✅ Creating MapLibre map with functionsBase:', functionsBase)
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: createMapStyle(functionsBase, filters, layerVisibility, layerOpacity),
      center: initialCenter,
      zoom: initialZoom,
      maxZoom: 18,
      minZoom: 5
    })

    // Add controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left')
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: 'MEMOIR GIS © 2024'
      }),
      'bottom-right'
    )

    // Add geolocation control
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true
      }),
      'top-right'
    )

    mapRef.current = map

    map.on('load', () => {
      console.log('✅ Map loaded successfully')
      onMapLoad?.()
      
      // Set up interaction handlers
      setupInteractionHandlers(map)
    })

    map.on('error', (e) => {
      console.error('❌ Map error:', e)
    })

    map.on('moveend', () => {
      const center = map.getCenter()
      const zoom = map.getZoom()
      onMoveEnd?.([center.lng, center.lat], zoom)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [functionsBase]) // Only recreate if functionsBase changes

  const setupInteractionHandlers = (map: maplibregl.Map) => {
    const interactiveLayers = ['sites-fill', 'sites-points']

    // Click handler
    interactiveLayers.forEach(layerId => {
      map.on('click', layerId, (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0]
          
          // Set selected state
          if (hoveredFeatureId.current) {
            map.setFeatureState(
              { source: 'sites', sourceLayer: 'sites', id: hoveredFeatureId.current },
              { selected: false }
            )
          }
          
          map.setFeatureState(
            { source: 'sites', sourceLayer: 'sites', id: feature.id },
            { selected: true }
          )
          
          onFeatureClick?.(feature)
        }
      })
    })

    // Hover handlers
    interactiveLayers.forEach(layerId => {
      map.on('mouseenter', layerId, (e) => {
        map.getCanvas().style.cursor = 'pointer'
        
        if (e.features && e.features.length > 0) {
          const feature = e.features[0]
          
          // Remove hover from previous feature
          if (hoveredFeatureId.current) {
            map.setFeatureState(
              { source: 'sites', sourceLayer: 'sites', id: hoveredFeatureId.current },
              { hover: false }
            )
          }
          
          // Add hover to current feature
          hoveredFeatureId.current = String(feature.id)
          map.setFeatureState(
            { source: 'sites', sourceLayer: 'sites', id: hoveredFeatureId.current },
            { hover: true }
          )
          
          onFeatureHover?.(feature)
        }
      })

      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = ''
        
        if (hoveredFeatureId.current) {
          map.setFeatureState(
            { source: 'sites', sourceLayer: 'sites', id: hoveredFeatureId.current },
            { hover: false }
          )
          hoveredFeatureId.current = null
        }
        
        onFeatureHover?.(null)
      })
    })

    // General map click (deselect)
    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: interactiveLayers
      })
      
      if (features.length === 0) {
        // Clicked on empty area - clear selection
        if (hoveredFeatureId.current) {
          map.setFeatureState(
            { source: 'sites', sourceLayer: 'sites', id: hoveredFeatureId.current },
            { selected: false }
          )
        }
        onFeatureClick?.(null)
      }
    })
  }

  return (
    <div 
      ref={mapContainer} 
      className="w-full h-full"
      role="application"
      aria-label="Mappa interattiva MEMOIR GIS"
    />
  )
})

MapCanvas.displayName = 'MapCanvas'