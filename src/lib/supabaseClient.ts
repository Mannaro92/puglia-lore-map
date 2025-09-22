import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qdjyzctflpywkblpkniz.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkanl6Y3RmbHB5d2tibHBrbml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDA3MjQsImV4cCI6MjA3NDExNjcyNH0.QBBDluN-ixFeJuy8ZWVUBi6E-99kMb9Y8LicXy0f4t8'

export const supabase = createClient(supabaseUrl, supabaseKey)

export const FUNCTIONS_BASE = import.meta.env.VITE_FUNCTIONS_BASE || 
  `${supabaseUrl}/functions/v1`

export const DEFAULT_BBOX = import.meta.env.VITE_DEFAULT_BBOX || 
  '15.0,39.7,19.5,42.2' // Puglia bounds

// Helper to get function URL
export const getFunctionUrl = (path: string) => `${FUNCTIONS_BASE}${path}`