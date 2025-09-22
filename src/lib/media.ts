import { supabase } from '@/integrations/supabase/client'

export interface MediaItem {
  id: string
  site_id: string | null
  storage_path: string
  title?: string
  caption?: string
  crediti?: string
  licenza: string
  order_index: number
  created_by: string
  created_at: string
}

// Get session ID for temporary uploads
export function getSessionId(): string {
  let sessionId = localStorage.getItem('memoir.session')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem('memoir.session', sessionId)
  }
  return sessionId
}

// Upload POI image to storage
export async function uploadPoiImage(
  siteId: string | null, 
  file: File, 
  sessionId: string
): Promise<{ path: string; publicUrl: string }> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const id = crypto.randomUUID()
  const base = siteId ? `poi/${siteId}` : `temp/${sessionId}`
  const path = `${base}/${id}.${ext}`

  const { error } = await supabase.storage
    .from('poi-media')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error

  const { data } = supabase.storage
    .from('poi-media')
    .getPublicUrl(path)

  return { path, publicUrl: data.publicUrl }
}

// Insert media record
export async function insertMedia(data: Partial<MediaItem>): Promise<MediaItem> {
  const { data: media, error } = await supabase
    .from('media')
    .insert({
      ...data,
      created_by: (await supabase.auth.getUser()).data.user?.id
    })
    .select()
    .single()

  if (error) throw error
  return media
}

// Update media metadata
export async function updateMedia(id: string, updates: Partial<MediaItem>): Promise<void> {
  const { error } = await supabase
    .from('media')
    .update(updates)
    .eq('id', id)

  if (error) throw error
}

// Delete media and file
export async function deleteMedia(id: string): Promise<void> {
  // Get media record to find storage path
  const { data: media, error: fetchError } = await supabase
    .from('media')
    .select('storage_path')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('poi-media')
    .remove([media.storage_path])

  if (storageError) throw storageError

  // Delete from database
  const { error: dbError } = await supabase
    .from('media')
    .delete()
    .eq('id', id)

  if (dbError) throw dbError
}

// Set cover image for site
export async function setCover(siteId: string, mediaId: string): Promise<void> {
  const { error } = await supabase
    .from('sites')
    .update({ cover_media_id: mediaId })
    .eq('id', siteId)

  if (error) throw error
}

// Reorder media for a site
export async function reorderMedia(siteId: string, orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) => 
    supabase
      .from('media')
      .update({ order_index: index })
      .eq('id', id)
      .eq('site_id', siteId)
  )

  await Promise.all(updates)
}

// Get media for a site
export async function getSiteMedia(siteId: string): Promise<MediaItem[]> {
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq('site_id', siteId)
    .order('order_index', { ascending: true })

  if (error) throw error
  return data || []
}

// Compress image if needed
export function compressImage(file: File, maxWidth = 3000, quality = 0.85): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    
    img.onload = () => {
      const { width, height } = img
      
      if (width <= maxWidth) {
        resolve(file)
        return
      }
      
      const ratio = maxWidth / width
      canvas.width = maxWidth
      canvas.height = height * ratio
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })
            resolve(compressedFile)
          } else {
            resolve(file)
          }
        },
        file.type,
        quality
      )
    }
    
    img.src = URL.createObjectURL(file)
  })
}