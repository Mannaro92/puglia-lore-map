import { StyleSpecification } from 'maplibre-gl'

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

  // Build PostgREST query for sites
  const buildSitesQuery = () => {
    let query = 'sites_public?select=*'
    const conditions: string[] = []
    
    if (filters.definizioni?.length) {
      conditions.push(`definizioni.cs.{${filters.definizioni.join(',')}}`)
    }
    if (filters.cronologie?.length) {
      conditions.push(`cronologie.cs.{${filters.cronologie.join(',')}}`)
    }
    if (filters.indicatori?.length) {
      conditions.push(`indicatori.cs.{${filters.indicatori.join(',')}}`)
    }
    if (filters.ambiti?.length) {
      conditions.push(`ambiti.cs.{${filters.ambiti.join(',')}}`)
    }
    
    if (conditions.length > 0) {
      query += '&' + conditions.join('&')
    }
    
    return query
  }

  return {
    version: 8,
    name: 'MEMOIR GIS',
    metadata: {
      'maplibre:type': 'memoir-archaeological'
    },
    sources: {
      'osm': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
      },
      'sites': {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      },
      'province': {
        type: 'geojson', 
        data: {
          type: 'FeatureCollection',
          features: []
        }
      },
      'comuni': {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      }
    },
    layers: [
      // Base layer
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
        filter: ['!=', ['geometry-type'], 'Point'],
        layout: {
          visibility: layerVisibility.sites ? 'visible' : 'none'
        },
        paint: {
          'line-color': 'hsl(345, 80%, 15%)', // MEMOIR ruby dark
          'line-width': 0.8,
          'line-opacity': layerOpacity.sites,
          'line-dasharray': [
            'case',
            ['==', ['get', 'ubicazione_confidenza'], 'incerta'],
            ['literal', [1, 1]], // Dashed for uncertain
            ['literal', [1, 0]]   // Solid for certain
          ]
        }
      },
      
      // Sites - points (colored by ambito cultuale)
      {
        id: 'sites-points',
        type: 'circle',
        source: 'sites',
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
}