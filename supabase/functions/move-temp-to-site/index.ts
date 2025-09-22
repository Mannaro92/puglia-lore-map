// Supabase Edge Function: move-temp-to-site
// - Copies images from temp/<session_id>/ to poi/<site_id>/ in poi-media bucket
// - Inserts media rows for each moved file
// - Deletes originals in temp folder
// - Returns final paths and public URLs

import 'https://deno.land/x/xhr@0.1.0/mod.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Payload = {
  site_id: string
  session_id: string
  files: string[] // e.g. ["abc.jpg", ...]
}

type MoveResult = {
  file: string
  from: string
  to: string
  publicUrl: string
}

function detectTipo(fileName: string): 'image' | 'video' | 'pdf' | 'model3d' {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(ext)) return 'image'
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video'
  if (ext === 'pdf') return 'pdf'
  if (['glb', 'gltf'].includes(ext)) return 'model3d'
  return 'image'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { site_id, session_id, files } = (await req.json()) as Payload

    if (!site_id || !session_id || !files?.length) {
      return new Response(JSON.stringify({ error: 'Missing payload fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const results: MoveResult[] = []

    for (const file of files) {
      const fromPath = `temp/${session_id}/${file}`
      const toPath = `poi/${site_id}/${file}`

      // Copy object
      const { error: copyError } = await supabase
        .storage
        .from('poi-media')
        .copy(fromPath, toPath)

      if (copyError) {
        console.error('Copy error', fromPath, '->', toPath, copyError)
        return new Response(JSON.stringify({ error: copyError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Remove original
      const { error: removeError } = await supabase
        .storage
        .from('poi-media')
        .remove([fromPath])

      if (removeError) {
        console.warn('Remove temp error (continuing):', fromPath, removeError)
      }

      // Insert media row
      const tipo = detectTipo(file)
      const { error: insertError } = await supabase
        .from('media')
        .insert({
          site_id,
          storage_path: toPath,
          tipo,
          licenza: 'CC BY 4.0',
          ordine: 0,
        })

      if (insertError) {
        console.error('Insert media error:', insertError)
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data } = supabase.storage.from('poi-media').getPublicUrl(toPath)
      results.push({ file, from: fromPath, to: toPath, publicUrl: data.publicUrl })
    }

    return new Response(JSON.stringify({ moved: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('move-temp-to-site error:', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
