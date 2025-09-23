import { supabase } from '@/integrations/supabase/client'

const FUNCTIONS_BASE = `https://qdjyzctflpywkblpkniz.supabase.co/functions/v1`
const getFunctionUrl = (path: string) => `${FUNCTIONS_BASE}${path}`

export type ExportFormat = 'geojson' | 'csv' | 'kml'

export interface ExportParams {
  format: ExportFormat
  ids?: string[]
  bbox?: string
  filters?: {
    definizioni?: string[]
    cronologie?: string[]
    indicatori?: string[]
    ambiti?: string[]
  }
}

export interface ExportResponse {
  success: boolean
  data?: Blob
  filename?: string
  error?: string
}

/**
 * Export archaeological sites data
 */
export const exportSites = async (params: ExportParams): Promise<ExportResponse> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout for exports
  
  try {
    const urlParams = new URLSearchParams()
    urlParams.set('format', params.format)
    
    if (params.ids?.length) {
      urlParams.set('ids', params.ids.join(','))
    }
    
    if (params.bbox) {
      urlParams.set('bbox', params.bbox)
    }
    
    if (params.filters) {
      if (params.filters.definizioni?.length) {
        urlParams.set('definizioni', params.filters.definizioni.join(','))
      }
      if (params.filters.cronologie?.length) {
        urlParams.set('cronologie', params.filters.cronologie.join(','))
      }
      if (params.filters.indicatori?.length) {
        urlParams.set('indicatori', params.filters.indicatori.join(','))
      }
      if (params.filters.ambiti?.length) {
        urlParams.set('ambiti', params.filters.ambiti.join(','))
      }
    }
    
    const response = await fetch(
      `${getFunctionUrl('/export')}?${urlParams.toString()}`,
      {
        method: 'GET',
        signal: controller.signal
      }
    )
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status} ${response.statusText}`)
    }
    
    const blob = await response.blob()
    
    // Generate filename based on format and timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
    const extension = params.format === 'geojson' ? 'geojson' : 
                     params.format === 'csv' ? 'csv' : 'kml'
    const filename = `memoir-sites-${timestamp}.${extension}`
    
    return {
      success: true,
      data: blob,
      filename
    }
    
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Export interrotto per timeout'
        }
      }
      
      return {
        success: false,
        error: error.message
      }
    }
    
    return {
      success: false,
      error: 'Errore sconosciuto nell\'export'
    }
  }
}

/**
 * Download blob as file
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Get MIME type for export format
 */
export const getExportMimeType = (format: ExportFormat): string => {
  switch (format) {
    case 'geojson':
      return 'application/geo+json'
    case 'csv':
      return 'text/csv'
    case 'kml':
      return 'application/vnd.google-earth.kml+xml'
    default:
      return 'application/octet-stream'
  }
}