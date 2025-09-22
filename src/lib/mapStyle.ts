import { StyleSpecification } from 'maplibre-gl'
import { safeStyle, assertStyle } from './safeStyle'

export interface MapFilters {
  definizioni?: string[]
  cronologie?: string[]
  indicatori?: string[]
  ambiti?: string[]
}

export interface LayerOpacity {
  sites: number
  province: number
  comuni: number
}

export const createMapStyle = (
  supabaseUrl: string,
  supabaseKey: string,
  filters: MapFilters = {},
  layerVisibility: Record<string, boolean> = { sites: true, province: true, comuni: true },
  layerOpacity: LayerOpacity = { sites: 0.6, province: 0.7, comuni: 0.5 }
): StyleSpecification => {
  console.log('🎨 Creating map style with Supabase URL:', supabaseUrl)
  console.log('🎨 Filters:', filters)
  console.log('🎨 Layer visibility:', layerVisibility)
  console.log('🎨 FUNCTIONS_BASE:', process.env.NEXT_PUBLIC_FUNCTIONS_BASE)

  // Fallback se non abbiamo functions base
  if (!process.env.NEXT_PUBLIC_FUNCTIONS_BASE) {
    console.warn('⚠️ No FUNCTIONS_BASE found, using safe OSM style')
    return assertStyle(safeStyle) as StyleSpecification
  }

  const functionsBase = process.env.NEXT_PUBLIC_FUNCTIONS_BASE
  
  // Helper per costruire URL tiles
  const buildTilesUrl = (layer: string) => {
    const baseUrl = `${functionsBase}/tiles/{z}/{x}/{y}.mvt?layer=${layer}`
    const queryParams: string[] = []
    
    if (filters.definizioni?.length) {
      queryParams.push(`definizioni=${filters.definizioni.join(',')}`)
    }
    if (filters.cronologie?.length) {
      queryParams.push(`cronologie=${filters.cronologie.join(',')}`)
    }
    if (filters.indicatori?.length) {
      queryParams.push(`indicatori=${filters.indicatori.join(',')}`)
    }
    if (filters.ambiti?.length) {
      queryParams.push(`ambiti=${filters.ambiti.join(',')}`)
    }
    
    return queryParams.length > 0 ? `${baseUrl}&${queryParams.join('&')}` : baseUrl
  }

  const style = {
    version: 8,
    name: 'MEMOIR GIS',
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    metadata: {
      'maplibre:type': 'memoir-archaeological'
    },
    sources: {
      // OSM sempre presente come base
      'osm': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
      },
      'sites': {
        type: 'vector',
        tiles: [buildTilesUrl('sites')],
        minzoom: 0,
        maxzoom: 22
      },
      'province': {
        type: 'vector',  
        tiles: [buildTilesUrl('province')],
        minzoom: 0,
        maxzoom: 22
      },
      'comuni': {
        type: 'vector',
        tiles: [buildTilesUrl('comuni')],
        minzoom: 0,
        maxzoom: 22
      }
    },
    layers: [
      // Base OSM layer - sempre visibile
      {
        id: 'osm',
        type: 'raster',
        source: 'osm',
        layout: {
          visibility: 'visible'
        }
      },
      
      // Province boundaries
      {
        id: 'province-fill',
        type: 'fill',
        source: 'province',
        'source-layer': 'province',
        layout: {
          visibility: layerVisibility.province ? 'visible' : 'none'
        },
        paint: {
          'fill-color': 'rgba(68, 68, 68, 0.1)',
          'fill-opacity': layerOpacity.province * 0.3
        }
      },
      {
        id: 'province-line',
        type: 'line',
        source: 'province',
        'source-layer': 'province',
        layout: {
          visibility: layerVisibility.province ? 'visible' : 'none'
        },
        paint: {
          'line-color': '#444444',
          'line-width': 1.0,
          'line-opacity': layerOpacity.province
        }
      },
      
      // Comuni boundaries
      {
        id: 'comuni-line',
        type: 'line',
        source: 'comuni',
        'source-layer': 'comuni',
        layout: {
          visibility: layerVisibility.comuni ? 'visible' : 'none'
        },
        paint: {
          'line-color': '#666666',
          'line-width': 0.6,
          'line-opacity': layerOpacity.comuni
        }
      },
      
      // Sites - polygonal areas
      {
        id: 'sites-fill',
        type: 'fill',
        source: 'sites',
        'source-layer': 'sites',
        filter: ['!=', ['geometry-type'], 'Point'],
        layout: {
          visibility: layerVisibility.sites ? 'visible' : 'none'
        },
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'ubicazione_confidenza'], 'incerta'],
            'hsl(345, 70%, 27%)', // More transparent for uncertain locations
            'hsl(345, 70%, 27%)' // MEMOIR ruby
          ],
          'fill-opacity': [
            'case',
            ['==', ['get', 'ubicazione_confidenza'], 'incerta'],
            layerOpacity.sites * 0.35,
            layerOpacity.sites * 0.6
          ]
        }
      },
      
      // Sites - outline
      {
        id: 'sites-outline',
        type: 'line',
        source: 'sites',
        'source-layer': 'sites',
        filter: ['!=', ['geometry-type'], 'Point'],
        layout: {
          visibility: layerVisibility.sites ? 'visible' : 'none'
        },
        paint: {
          'line-color': 'hsl(345, 80%, 15%)', // MEMOIR ruby dark
          'line-width': 0.8,
          'line-opacity': layerOpacity.sites
        }
      },
      
      // Sites - points (colored by ambito cultuale)
      {
        id: 'sites-points',
        type: 'circle',
        source: 'sites',
        'source-layer': 'sites',
        filter: ['==', ['geometry-type'], 'Point'],
        layout: {
          visibility: layerVisibility.sites ? 'visible' : 'none'
        },
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 4,
            12, 6,
            16, 8
          ],
          'circle-color': [
            'case',
            ['in', 'cristiano', ['downcase', ['to-string', ['get', 'ambiti']]]],
            'hsl(122, 42%, 25%)', // Green for Christian
            ['in', 'romano', ['downcase', ['to-string', ['get', 'ambiti']]]],
            'hsl(4, 82%, 58%)', // Red for Roman
            ['in', 'messapico', ['downcase', ['to-string', ['get', 'ambiti']]]],
            'hsl(207, 71%, 39%)', // Blue for Messapic
            'hsl(0, 0%, 53%)' // Gray for others
          ],
          'circle-opacity': [
            'case',
            ['==', ['get', 'ubicazione_confidenza'], 'incerta'],
            layerOpacity.sites * 0.35,
            layerOpacity.sites
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1
        }
      },
      
      // Highlight layer for hover/selection
      {
        id: 'sites-highlight',
        type: 'line',
        source: 'sites',
        'source-layer': 'sites',
        layout: {
          visibility: layerVisibility.sites ? 'visible' : 'none'
        },
        paint: {
          'line-color': 'hsl(43, 85%, 47%)', // MEMOIR gold
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            2.5,
            ['boolean', ['feature-state', 'selected'], false],
            3.0,
            0
          ],
          'line-opacity': 0.9
        }
      }
    ]
  }

  return assertStyle(style) as StyleSpecification
}