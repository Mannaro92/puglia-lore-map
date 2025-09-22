import { MapFilters } from './mapStyle'

/**
 * Build tile URL with filters
 */
export const buildTileUrl = (
  functionsBase: string,
  layer: string,
  filters: MapFilters = {}
): string => {
  const params = new URLSearchParams()
  params.set('layer', layer)
  
  if (filters.definizioni?.length) {
    params.set('definizioni', filters.definizioni.join(','))
  }
  if (filters.cronologie?.length) {
    params.set('cronologie', filters.cronologie.join(','))
  }
  if (filters.indicatori?.length) {
    params.set('indicatori', filters.indicatori.join(','))
  }
  if (filters.ambiti?.length) {
    params.set('ambiti', filters.ambiti.join(','))
  }
  
  return `${functionsBase}/tiles/{z}/{x}/{y}.mvt?${params.toString()}`
}

/**
 * Update map source tiles with new filters
 */
export const updateMapSources = (
  map: maplibregl.Map | null,
  functionsBase: string,
  filters: MapFilters
) => {
  if (!map) return
  
  const layers = ['sites', 'province', 'comuni']
  
  layers.forEach(layer => {
    const source = map.getSource(layer)
    if (source && 'setTiles' in source) {
      const newTiles = [buildTileUrl(functionsBase, layer, filters)]
      ;(source as any).setTiles(newTiles)
    }
  })
}

/**
 * Calculate appropriate zoom level for bbox
 */
export const calculateZoom = (bbox: [number, number, number, number]): number => {
  const [minLng, minLat, maxLng, maxLat] = bbox
  const lngDiff = maxLng - minLng
  const latDiff = maxLat - minLat
  const maxDiff = Math.max(lngDiff, latDiff)
  
  if (maxDiff > 10) return 6
  if (maxDiff > 5) return 8
  if (maxDiff > 2) return 10
  if (maxDiff > 1) return 12
  if (maxDiff > 0.5) return 14
  return 16
}

/**
 * Convert bbox string to array
 */
export const parseBbox = (bboxStr: string): [number, number, number, number] => {
  const coords = bboxStr.split(',').map(Number)
  if (coords.length !== 4) {
    throw new Error('Invalid bbox format. Expected: "minLng,minLat,maxLng,maxLat"')
  }
  return coords as [number, number, number, number]
}

/**
 * Format bbox array to string
 */
export const formatBbox = (bbox: [number, number, number, number]): string => {
  return bbox.map(n => n.toFixed(6)).join(',')
}