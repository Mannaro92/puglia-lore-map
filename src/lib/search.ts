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
 * Search archaeological sites using PostgREST
 */
export const searchSites = async (params: SearchParams): Promise<SearchResponse> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  
  try {
    // Build PostgREST query 
    let query = 'sites_public?select=id,toponimo,descrizione,comune,provincia,definizioni,cronologie,indicatori,ambiti,centroid,bbox'
    const conditions: string[] = []
    
    // Text search on toponimo and descrizione
    if (params.q) {
      conditions.push(`or=(toponimo.ilike.*${params.q}*,descrizione.ilike.*${params.q}*)`)
    }
    
    // Filter conditions
    if (params.definizioni?.length) {
      conditions.push(`definizioni.cs.{${params.definizioni.join(',')}}`)
    }
    if (params.cronologie?.length) {
      conditions.push(`cronologie.cs.{${params.cronologie.join(',')}}`)
    }
    if (params.indicatori?.length) {
      conditions.push(`indicatori.cs.{${params.indicatori.join(',')}}`)
    }
    if (params.ambiti?.length) {
      conditions.push(`ambiti.cs.{${params.ambiti.join(',')}}`)
    }
    
    // Add bbox filter if provided
    if (params.bbox) {
      const [minLng, minLat, maxLng, maxLat] = params.bbox.split(',').map(Number)
      // This would need ST_Intersects in a stored function, for now skip bbox
    }
    
    if (conditions.length > 0) {
      query += '&' + conditions.join('&')
    }
    
    query += `&limit=${params.limit || 10}`
    
    const response = await fetch(`https://qdjyzctflpywkblpkniz.supabase.co/rest/v1/${query}`, {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkanl6Y3RmbHB5d2tibHBrbml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDA3MjQsImV4cCI6MjA3NDExNjcyNH0.QBBDluN-ixFeJuy8ZWVUBi6E-99kMb9Y8LicXy0f4t8',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkanl6Y3RmbHB5d2tibHBrbml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDA3MjQsImV4cCI6MjA3NDExNjcyNH0.QBBDluN-ixFeJuy8ZWVUBi6E-99kMb9Y8LicXy0f4t8'
      },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status} ${response.statusText}`)
    }
    
    const results = await response.json()
    
    return {
      success: true,
      results: results.map((site: any) => ({
        id: site.id,
        toponimo: site.toponimo,
        descrizione: site.descrizione,
        comune: site.comune,
        provincia: site.provincia,
        definizioni: site.definizioni,
        cronologie: site.cronologie,
        indicatori: site.indicatori,
        ambiti: site.ambiti,
        centroid: site.centroid ? [site.centroid.coordinates[0], site.centroid.coordinates[1]] : undefined,
        bbox: site.bbox ? [
          site.bbox.coordinates[0][0][0], site.bbox.coordinates[0][0][1],
          site.bbox.coordinates[0][2][0], site.bbox.coordinates[0][2][1]
        ] : undefined
      })),
      total: results.length
    }
    
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
    const url = `${getFunctionUrl('/geocode')}?` + new URLSearchParams({ q: query })
    const response = await fetch(url, {
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