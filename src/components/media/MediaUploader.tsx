import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { uploadPoiImage, getSessionId, insertMedia, getSiteMedia, deleteMedia, type MediaItem, compressImage } from '@/lib/media'
import { supabase } from '@/integrations/supabase/client'
import { Image as ImageIcon, Upload, X } from 'lucide-react'

interface MediaUploaderProps {
  siteId?: string
  onMediaListChange?: (list: MediaItem[]) => void
  onPendingFilesChange?: (uploadFn: ((siteId: string) => Promise<void>) | null) => void
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({ 
  siteId, 
  onMediaListChange, 
  onPendingFilesChange 
}) => {
  const [uploading, setUploading] = useState(false)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [pendingPreviews, setPendingPreviews] = useState<MediaItem[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)

  const loadMedia = useCallback(async () => {
    if (!siteId) return
    try {
      const list = await getSiteMedia(siteId)
      setMedia(list)
      onMediaListChange?.(list)
    } catch (e: any) {
      console.error(e)
      toast({ title: 'Errore caricamento media', description: e?.message || String(e), variant: 'destructive' })
    }
  }, [siteId, onMediaListChange])

  useEffect(() => {
    loadMedia()
  }, [loadMedia])

  // Function to upload pending files after POI creation
  const uploadPendingFiles = useCallback(async (newSiteId: string): Promise<void> => {
    if (pendingFiles.length === 0) return
    
    const uploadedItems: Array<{storage_path: string; tipo: string; titolo: string; ordine: number}> = []
    
    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i]
      const compressed = await compressImage(file)
      const ext = (compressed.name.split('.').pop() || 'jpg').toLowerCase()
      const id = crypto.randomUUID()
      const storagePath = `poi/${newSiteId}/${id}.${ext}`
      
      const { error } = await supabase.storage
        .from('poi-media')
        .upload(storagePath, compressed, {
          cacheControl: '3600',
          upsert: true
        })
      
      if (error) throw error
      
      uploadedItems.push({
        storage_path: storagePath,
        tipo: 'image',
        titolo: compressed.name,
        ordine: i
      })
    }
    
    // Attach all media at once
    await supabase.rpc('rpc_attach_media', {
      p_site_id: newSiteId,
      p_items: uploadedItems
    })
    
    // Clear pending files and previews
    setPendingFiles([])
    setPendingPreviews(prev => {
      // Clean up blob URLs
      prev.forEach(preview => {
        if (preview.storage_path.startsWith('blob:')) {
          URL.revokeObjectURL(preview.storage_path)
        }
      })
      return []
    })
  }, [pendingFiles])

  useEffect(() => {
    // Provide upload function to parent
    if (pendingFiles.length > 0) {
      onPendingFilesChange?.(uploadPendingFiles)
    } else {
      onPendingFilesChange?.(null)
    }
  }, [pendingFiles, onPendingFilesChange, uploadPendingFiles])

  // Cleanup blob URLs when component unmounts or pending previews change
  useEffect(() => {
    return () => {
      pendingPreviews.forEach(preview => {
        if (preview.storage_path.startsWith('blob:')) {
          URL.revokeObjectURL(preview.storage_path)
        }
      })
    }
  }, [pendingPreviews])
  

  const handleDelete = async (mediaId: string) => {
    try {
      await deleteMedia(mediaId); // Usa la funzione della libreria che elimina sia DB che storage
      toast({ title: 'Immagine eliminata' });
      await loadMedia(); // Ricarica la lista
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Errore eliminazione', description: e.message, variant: 'destructive' });
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    const validFiles: File[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Formato non supportato', description: 'Carica solo immagini', variant: 'destructive' })
        continue
      }
      validFiles.push(file)
    }
    
    if (validFiles.length === 0) return
    
    if (siteId) {
      // Direct upload for existing POI
      setUploading(true)
      try {
        for (let i = 0; i < validFiles.length; i++) {
          const file = validFiles[i]
          const compressed = await compressImage(file)
          const ext = (compressed.name.split('.').pop() || 'jpg').toLowerCase()
          const id = crypto.randomUUID()
          const storagePath = `poi/${siteId}/${id}.${ext}`
          
          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('poi-media')
            .upload(storagePath, compressed, {
              cacheControl: '3600',
              upsert: true
            })
          
          if (uploadError) throw uploadError
          
          // Insert directly into media table instead of using RPC
          const { error: insertError } = await supabase
            .from('media')
            .insert({
              site_id: siteId,
              storage_path: storagePath,
              tipo: 'image',
              titolo: compressed.name,
              ordine: media.length + i
            })
          
          if (insertError) throw insertError
        }
        
        await loadMedia()
        toast({ title: 'Upload completato' })
      } catch (e: any) {
        console.error('Upload error:', e)
        toast({ title: 'Errore upload', description: e.message, variant: 'destructive' })
      } finally {
        setUploading(false)
      }
    } else {
      // Queue files for upload after POI creation and create previews
      const newPreviews: MediaItem[] = []
      
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i]
        const id = crypto.randomUUID()
        
        // Create preview with blob URL for immediate display
        const blobUrl = URL.createObjectURL(file)
        
        newPreviews.push({
          id: `pending-${id}`,
          site_id: 'pending',
          storage_path: blobUrl,
          tipo: 'image',
          titolo: file.name,
          licenza: '',
          ordine: pendingFiles.length + pendingPreviews.length + i,
          created_at: new Date().toISOString(),
        } as MediaItem)
      }
      
      setPendingFiles(prev => [...prev, ...validFiles])
      setPendingPreviews(prev => [...prev, ...newPreviews])
      toast({ title: `${validFiles.length} file pronti per il salvataggio` })
    }
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const prevent = (e: React.DragEvent) => e.preventDefault()

  const openPicker = () => inputRef.current?.click()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Immagini</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDrop={onDrop}
          onDragOver={prevent}
          onDragEnter={prevent}
          className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center"
        >
          <ImageIcon className="h-8 w-8" />
          <p className="text-sm">Trascina qui le immagini oppure</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button onClick={openPicker} disabled={uploading}>
            <Upload className="mr-2 h-4 w-4" /> Seleziona file
          </Button>
        </div>

        {(!siteId && (pendingFiles.length > 0 || pendingPreviews.length > 0)) && (
          <div>
            <p className="text-sm mb-2">File pronti per il salvataggio ({pendingFiles.length})</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {pendingPreviews.map((preview, index) => (
                <div key={preview.id} className="rounded overflow-hidden border relative group">
                  <img 
                    src={preview.storage_path} 
                    alt={preview.titolo || 'Anteprima'} 
                    className="w-full h-32 object-cover" 
                  />
                  <button
                    onClick={() => {
                      // Remove from both pending arrays
                      setPendingFiles(prev => prev.filter((_, i) => i !== index))
                      setPendingPreviews(prev => {
                        const updated = prev.filter((_, i) => i !== index)
                        // Clean up blob URL
                        URL.revokeObjectURL(preview.storage_path)
                        return updated
                      })
                    }}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Rimuovi file"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="p-2 text-xs truncate">{preview.titolo}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(siteId && media.length > 0) && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {media.map((m) => {
                const { data } = supabase.storage.from('poi-media').getPublicUrl(m.storage_path)
                const url = data.publicUrl
                return (
                  <div key={m.id} className="rounded overflow-hidden border relative group">
                    <img src={url} alt={m.titolo || 'Immagine POI'} className="w-full h-32 object-cover" />
                    {/* X per eliminare in alto a destra */}
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Elimina immagine"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="p-2 text-xs truncate">{m.titolo || m.storage_path.split('/').pop()}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
