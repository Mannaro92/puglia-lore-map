import React, { useState, useRef, useEffect } from 'react'
import { MapCanvas, MapCanvasRef } from '@/components/map/MapCanvas'
import { MapCanvasTest } from '@/components/map/MapCanvasTest'
import { MapCanvasPure } from '@/components/map/MapCanvasPure'
import { LayerPanel } from '@/components/map/LayerPanel'
import { SearchBox } from '@/components/map/SearchBox'
import { FUNCTIONS_BASE, DEFAULT_BBOX, supabase } from '@/lib/supabaseClient'
import { MapFilters, LayerOpacity } from '@/lib/mapStyle'
import { parseBbox } from '@/lib/tiles'
import { readUrlState, writeUrlState, parseLayerConfig, serializeLayerConfig, urlStateToFilters } from '@/lib/urlState'
import { useToast } from '@/hooks/use-toast'

export default function MapPage() {
  console.log('🗺️ MapPage component mounting')
  const mapRef = useRef<MapCanvasRef>(null)
  const { toast } = useToast()
  
  // Initialize state from URL
  const urlState = readUrlState()
  const initialBbox = parseBbox(DEFAULT_BBOX)
  const { visibility: initialVisibility, opacity: initialOpacity } = 
    parseLayerConfig(urlState.layers || '')
  
  // Assicura che i layer siano ON di default per demo
  const defaultVisibility = { 
    sites: true, 
    province: true, 
    comuni: true,
    ...initialVisibility
  }
  const defaultOpacity = { 
    sites: 0.6, 
    province: 0.7, 
    comuni: 0.5,
    ...initialOpacity
  }
  
  const [activeTab, setActiveTab] = useState<'layers' | 'info'>('layers')
  const [selectedFeature, setSelectedFeature] = useState<any>(null)
  const [filters, setFilters] = useState<MapFilters>(urlStateToFilters(urlState))
  const [layerVisibility, setLayerVisibility] = useState(defaultVisibility)
  const [layerOpacity, setLayerOpacity] = useState<LayerOpacity>(defaultOpacity)
  const [vocabularies, setVocabularies] = useState<any>(null)

  // Load vocabularies
  useEffect(() => {
    const loadVocabularies = async () => {
      try {
        const [
          { data: definizioni },
          { data: cronologie },
          { data: indicatori },
          { data: ambiti }
        ] = await Promise.all([
          supabase.from('ref_definizione').select('id, label').eq('is_active', true).order('sort_order'),
          supabase.from('ref_cronologia').select('id, label').eq('is_active', true).order('sort_order'),
          supabase.from('ref_indicatori_cultuali').select('id, label').eq('is_active', true).order('sort_order'),
          supabase.from('ref_ambito_cultuale').select('id, label').eq('is_active', true).order('sort_order')
        ])

        setVocabularies({
          definizioni: definizioni || [],
          cronologie: cronologie || [],
          indicatori: indicatori || [],
          ambiti: ambiti || []
        })
      } catch (error) {
        console.error('Error loading vocabularies:', error)
        toast({
          title: 'Errore',
          description: 'Impossibile caricare i vocabolari',
          variant: 'destructive'
        })
      }
    }

    loadVocabularies()
  }, [])

  // Update URL when state changes
  useEffect(() => {
    const view = mapRef.current?.getCurrentView()
    if (view) {
      writeUrlState({
        cx: view.lng,
        cy: view.lat,
        xz: view.zoom,
        defs: filters.definizioni,
        cron: filters.cronologie,
        ind: filters.indicatori,
        amb: filters.ambiti,
        layers: serializeLayerConfig(layerVisibility, layerOpacity)
      })
    }
  }, [filters, layerVisibility, layerOpacity])

  const handleFeatureClick = (feature: any) => {
    setSelectedFeature(feature)
    if (feature) {
      setActiveTab('info')
    }
  }

  const handleSearchSelect = (result: any) => {
    if ('lat' in result) {
      // Geocode result
      mapRef.current?.flyTo(parseFloat(result.lon), parseFloat(result.lat), 14)
    } else {
      // Site result
      if (result.bbox) {
        mapRef.current?.fitBounds(result.bbox)
      } else if (result.centroid) {
        mapRef.current?.flyTo(result.centroid[0], result.centroid[1], 14)
      }
    }
  }

  // Test mode - uncomment to test pure OSM
  // return <MapCanvasPure />

  return (
    <div className="h-screen w-full flex relative bg-[hsl(var(--map-bg))]">
      {/* Map Canvas */}
      <div className="flex-1 relative">
        <MapCanvas
          ref={mapRef}
          supabaseUrl={'https://qdjyzctflpywkblpkniz.supabase.co'}
          supabaseKey={'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkanl6Y3RmbHB5d2tibHBrbml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDA3MjQsImV4cCI6MjA3NDExNjcyNH0.QBBDluN-ixFeJuy8ZWVUBi6E-99kMb9Y8LicXy0f4t8'}
          initialCenter={urlState.cx && urlState.cy ? [urlState.cx, urlState.cy] : [initialBbox[0] + (initialBbox[2] - initialBbox[0]) / 2, initialBbox[1] + (initialBbox[3] - initialBbox[1]) / 2]}
          initialZoom={urlState.xz || 8}
          filters={filters}
          layerVisibility={layerVisibility}
          layerOpacity={layerOpacity}
          onFeatureClick={handleFeatureClick}
          onMoveEnd={(center, zoom) => {
            writeUrlState({
              cx: center[0],
              cy: center[1], 
              xz: zoom,
              defs: filters.definizioni,
              cron: filters.cronologie,
              ind: filters.indicatori,
              amb: filters.ambiti,
              layers: serializeLayerConfig(layerVisibility, layerOpacity)
            })
          }}
        >
          {/* Search Box */}
          <div className="absolute top-4 left-4 w-80 z-10">
            <SearchBox
              filters={filters}
              onResultSelect={handleSearchSelect}
              onGeocodeSelect={handleSearchSelect}
            />
          </div>
        </MapCanvas>
      </div>

      {/* Layer Panel */}
      <LayerPanel
        activeTab={activeTab}
        onTabChange={setActiveTab}
        layerVisibility={layerVisibility}
        layerOpacity={layerOpacity}
        onLayerToggle={(layerId) => {
          setLayerVisibility(prev => ({
            ...prev,
            [layerId]: !prev[layerId]
          }))
          mapRef.current?.toggleLayer(layerId)
        }}
        onOpacityChange={(layerId, opacity) => {
          setLayerOpacity(prev => ({
            ...prev,
            [layerId]: opacity
          }))
          mapRef.current?.setLayerOpacity(layerId, opacity)
        }}
        onFiltersChange={(newFilters) => {
          setFilters(newFilters)
          mapRef.current?.setFilters(newFilters)
        }}
        selectedFeature={selectedFeature}
        onFeatureClose={() => {
          setSelectedFeature(null)
          setActiveTab('layers')
        }}
        vocabularies={vocabularies}
      />
    </div>
  )
}