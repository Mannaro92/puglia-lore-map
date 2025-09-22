import { getFunctionUrl } from './supabaseClient'

export interface SearchParams {
  q?: string
  definizioni?: string[]
  cronologie?: string[]
  indicatori?: string[]
  ambiti?: string[]
  bbox?: string
  limit?: number
}

export interface SearchResult {
  id: string
  toponimo: string
  descrizione?: string
  comune?: string
  provincia?: string
  definizioni?: string[]
  cronologie?: string[]
  indicatori?: string[]
  ambiti?: string[]
  centroid?: [number, number]
  bbox?: [number, number, number, number]
}

export interface SearchResponse {
  success: boolean
  results: SearchResult[]
  total: number
  error?: string
}

/**
 * Search archaeological sites
 */
export const searchSites = async (params: SearchParams): Promise<SearchResponse> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
  
  try {
    const response = await fetch(getFunctionUrl('/search'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        limit: params.limit || 10
      }),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    return data
    
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          results: [],
          total: 0,
          error: 'Ricerca interrotta per timeout'
        }
      }
      
      return {
        success: false,
        results: [],
        total: 0,
        error: error.message
      }
    }
    
    return {
      success: false,
      results: [],
      total: 0,
      error: 'Errore sconosciuto nella ricerca'
    }
  }
}

/**
 * Geocode address using Nominatim
 */
export interface GeocodeResult {
  display_name: string
  lat: string
  lon: string
  bbox?: [string, string, string, string]
  type: string
}

export interface GeocodeResponse {
  success: boolean
  results: GeocodeResult[]
  error?: string
}

export const geocodeAddress = async (query: string): Promise<GeocodeResponse> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout
  
  try {
    // Try internal geocode function first
    const response = await fetch(getFunctionUrl('/geocode'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    })
    
    if (response.ok) {
      const data = await response.json()
      clearTimeout(timeoutId)
      return data
    }
    
    // Fallback to direct Nominatim
    const nominatimResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?` + 
      new URLSearchParams({
        q: query,
        format: 'json',
        limit: '5',
        countrycodes: 'it',
        bounded: '1',
        viewbox: '14.5,39.5,19.5,42.5', // Puglia + margins
        'accept-language': 'it,en'
      }),
      { signal: controller.signal }
    )
    
    clearTimeout(timeoutId)
    
    if (!nominatimResponse.ok) {
      throw new Error(`Geocoding failed: ${nominatimResponse.status}`)
    }
    
    const results = await nominatimResponse.json()
    
    return {
      success: true,
      results: results.map((r: any) => ({
        display_name: r.display_name,
        lat: r.lat,
        lon: r.lon,
        bbox: r.boundingbox,
        type: r.type
      }))
    }
    
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          results: [],
          error: 'Geocodifica interrotta per timeout'
        }
      }
      
      return {
        success: false,
        results: [],
        error: error.message
      }
    }
    
    return {
      success: false,
      results: [],
      error: 'Errore sconosciuto nella geocodifica'
    }
  }
}

/**
 * Check if query looks like an address
 */
export const isAddressQuery = (query: string): boolean => {
  const addressPatterns = [
    /\d+/,  // Contains numbers
    /via|strada|piazza|viale|corso|largo|vicolo/i,  // Italian street terms
    /str\.|via\.|pza\./i  // Abbreviated forms
  ]
  
  return addressPatterns.some(pattern => pattern.test(query))
}