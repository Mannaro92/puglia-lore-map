import { MapFilters, LayerOpacity } from './mapStyle'

export interface UrlMapState {
  cx?: number  // center longitude
  cy?: number  // center latitude  
  xz?: number  // zoom level
  defs?: string[]  // definizioni filter
  cron?: string[]  // cronologie filter
  ind?: string[]   // indicatori filter
  amb?: string[]   // ambiti filter
  layers?: string  // layer visibility and opacity: "sites:1:0.6,prov:1:0.3,com:0:0.2"
  threed?: boolean // 3D mode
}

/**
 * Read state from URL search params
 */
export const readUrlState = (): UrlMapState => {
  if (typeof window === 'undefined') return {}
  
  const params = new URLSearchParams(window.location.search)
  const state: UrlMapState = {}
  
  // Map center and zoom
  const cx = params.get('cx')
  const cy = params.get('cy') 
  const xz = params.get('xz')
  
  if (cx && !isNaN(Number(cx))) state.cx = Number(cx)
  if (cy && !isNaN(Number(cy))) state.cy = Number(cy)
  if (xz && !isNaN(Number(xz))) state.xz = Number(xz)
  
  // Filters
  const defs = params.get('defs')
  const cron = params.get('cron')
  const ind = params.get('ind')
  const amb = params.get('amb')
  
  if (defs) state.defs = defs.split(',').filter(Boolean)
  if (cron) state.cron = cron.split(',').filter(Boolean)
  if (ind) state.ind = ind.split(',').filter(Boolean)
  if (amb) state.amb = amb.split(',').filter(Boolean)
  
  // Layer configuration
  const layers = params.get('layers')
  if (layers) state.layers = layers
  
  // 3D mode
  const threed = params.get('3d')
  if (threed === 'true') state.threed = true
  
  return state
}

/**
 * Write state to URL search params
 */
export const writeUrlState = (state: UrlMapState): void => {
  if (typeof window === 'undefined') return
  
  const params = new URLSearchParams(window.location.search)
  
  // Map center and zoom
  if (state.cx !== undefined) {
    params.set('cx', state.cx.toFixed(6))
  }
  if (state.cy !== undefined) {
    params.set('cy', state.cy.toFixed(6))
  }
  if (state.xz !== undefined) {
    params.set('xz', state.xz.toFixed(2))
  }
  
  // Filters
  if (state.defs?.length) {
    params.set('defs', state.defs.join(','))
  } else {
    params.delete('defs')
  }
  
  if (state.cron?.length) {
    params.set('cron', state.cron.join(','))
  } else {
    params.delete('cron')
  }
  
  if (state.ind?.length) {
    params.set('ind', state.ind.join(','))
  } else {
    params.delete('ind')
  }
  
  if (state.amb?.length) {
    params.set('amb', state.amb.join(','))
  } else {
    params.delete('amb')
  }
  
  // Layer configuration
  if (state.layers) {
    params.set('layers', state.layers)
  } else {
    params.delete('layers')
  }
  
  // 3D mode
  if (state.threed) {
    params.set('3d', 'true')
  } else {
    params.delete('3d')
  }
  
  // Update URL without reload
  const newUrl = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState({}, '', newUrl)
}

/**
 * Parse layer configuration string
 * Format: "sites:1:0.6,prov:1:0.3,com:0:0.2"
 */
export const parseLayerConfig = (layersStr: string): {
  visibility: Record<string, boolean>
  opacity: LayerOpacity
} => {
  const visibility: Record<string, boolean> = {
    sites: true,
    province: true,
    comuni: true
  }
  
  const opacity: LayerOpacity = {
    sites: 0.6,
    province: 0.7,
    comuni: 0.5
  }
  
  if (!layersStr) return { visibility, opacity }
  
  const layers = layersStr.split(',')
  
  layers.forEach(layerStr => {
    const [name, visible, opac] = layerStr.split(':')
    
    if (name === 'sites' || name === 'prov' || name === 'com') {
      const layerName = name === 'prov' ? 'province' : name === 'com' ? 'comuni' : name
      
      if (visible !== undefined) {
        visibility[layerName] = visible === '1'
      }
      
      if (opac !== undefined && !isNaN(Number(opac))) {
        (opacity as any)[layerName] = Math.max(0.1, Math.min(1.0, Number(opac)))
      }
    }
  })
  
  return { visibility, opacity }
}

/**
 * Serialize layer configuration to string
 */
export const serializeLayerConfig = (
  visibility: Record<string, boolean>,
  opacity: LayerOpacity
): string => {
  const configs = [
    `sites:${visibility.sites ? '1' : '0'}:${opacity.sites.toFixed(1)}`,
    `prov:${visibility.province ? '1' : '0'}:${opacity.province.toFixed(1)}`,
    `com:${visibility.comuni ? '1' : '0'}:${opacity.comuni.toFixed(1)}`
  ]
  
  return configs.join(',')
}

/**
 * Convert URL state to MapFilters
 */
export const urlStateToFilters = (state: UrlMapState): MapFilters => {
  return {
    definizioni: state.defs,
    cronologie: state.cron,
    indicatori: state.ind,
    ambiti: state.amb
  }
}

/**
 * Generate shareable URL
 */
export const generateShareUrl = (state: UrlMapState): string => {
  const params = new URLSearchParams()
  
  Object.entries(state).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          params.set(key, value.join(','))
        }
      } else {
        params.set(key, String(value))
      }
    }
  })
  
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`
}