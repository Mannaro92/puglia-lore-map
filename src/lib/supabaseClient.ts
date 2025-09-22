import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qdjyzctflpywkblpkniz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkanl6Y3RmbHB5d2tibHBrbml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDA3MjQsImV4cCI6MjA3NDExNjcyNH0.QBBDluN-ixFeJuy8ZWVUBi6E-99kMb9Y8LicXy0f4t8'

console.log('🔧 Supabase config:', { url: supabaseUrl, hasKey: !!supabaseKey })

export const supabase = createClient(supabaseUrl, supabaseKey)

export const FUNCTIONS_BASE = `${supabaseUrl}/functions/v1`

export const DEFAULT_BBOX = '15.0,39.7,19.5,42.2' // Puglia bounds

console.log('🌐 Functions base URL:', FUNCTIONS_BASE)

// Helper to get function URL
export const getFunctionUrl = (path: string) => `${FUNCTIONS_BASE}${path}`