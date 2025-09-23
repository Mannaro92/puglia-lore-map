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

const VIDEO_QUOTA_BYTES = 104857600 // 100MB
const MAX_FILE_SIZE = 104857600 // 100MB per single file

interface PendingFile {
  file: File
  preview: string
  tipo: 'image' | 'video'
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({ 
  siteId, 
  onMediaListChange, 
  onPendingFilesChange 
}) => {
  const [uploading, setUploading] = useState(false)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [videoUsedBytes, setVideoUsedBytes] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const loadMedia = useCallback(async () => {
    if (!siteId) return
    try {
      console.debug('[MediaUploader] Loading media for siteId:', siteId)
      const list = await getSiteMedia(siteId)
      console.debug('[MediaUploader] Media loaded:', list.length, 'items')
      console.debug('[MediaUploader] Media by type:', {
        images: list.filter(m => m.tipo === 'image').length,
        videos: list.filter(m => m.tipo === 'video').length,
        videoSizes: list.filter(m => m.tipo === 'video').map(m => ({ id: m.id, size_bytes: m.size_bytes }))
      })
      
      setMedia(list)
      onMediaListChange?.(list)
      
      // Update video quota usage
      const videoBytes = list
        .filter(m => m.tipo === 'video')
        .reduce((sum, m) => sum + (m.size_bytes || 0), 0)
      
      console.debug('[MediaUploader] Video quota calculation:', { videoBytes, totalItems: list.length })
      setVideoUsedBytes(videoBytes)
    } catch (e: any) {
      console.error('[MediaUploader] Error loading media:', e)
      toast({ title: 'Errore caricamento media', description: e?.message || String(e), variant: 'destructive' })
    }
  }, [siteId, onMediaListChange])

  useEffect(() => {
    loadMedia()
  }, [loadMedia])

  // Function to upload pending files after POI creation
  const uploadPendingFiles = useCallback(async (newSiteId: string): Promise<void> => {
    if (pendingFiles.length === 0) return

    try {
      // Check video quota before upload
      const pendingVideoSize = pendingFiles
        .filter(pf => pf.tipo === 'video')
        .reduce((sum, pf) => sum + pf.file.size, 0)
      
      if (videoUsedBytes + pendingVideoSize > VIDEO_QUOTA_BYTES) {
        const availableMB = ((VIDEO_QUOTA_BYTES - videoUsedBytes) / 1048576).toFixed(1)
        toast({ 
          title: "Quota video superata", 
          description: `Disponibili: ${availableMB} MB`, 
          variant: "destructive" 
        })
        return
      }

      const uploadedItems = []
      
      for (const pendingFile of pendingFiles) {
        const { file, tipo } = pendingFile
        
        if (tipo === 'video') {
          // Upload video directly
          const fileName = `${crypto.randomUUID()}.mp4`
          const filePath = `poi/${newSiteId}/${fileName}`
          
          const { error: uploadError } = await supabase.storage
            .from('poi-media')
            .upload(filePath, file, {
              contentType: 'video/mp4',
              upsert: true,
              cacheControl: 'public, max-age=31536000, immutable'
            })
          
          if (uploadError) throw uploadError
          
          uploadedItems.push({
            storage_path: filePath,
            tipo: 'video' as const,
            titolo: file.name,
            didascalia: '',
            ordine: 0,
            size_bytes: file.size
          })
        } else {
          // Upload image with compression
          const compressedFile = await compressImage(file)
          const { path } = await uploadPoiImage(newSiteId, compressedFile, getSessionId())
          
          uploadedItems.push({
            storage_path: path,
            tipo: 'image' as const,
            titolo: compressedFile.name,
            didascalia: '',
            ordine: 0,
            size_bytes: compressedFile.size
          })
        }
      }

      if (uploadedItems.length > 0) {
        await supabase.rpc('rpc_attach_media', {
          p_site_id: newSiteId,
          p_items: uploadedItems
        })
      }

      // Clean up pending files and their blob URLs
      pendingFiles.forEach(pf => {
        URL.revokeObjectURL(pf.preview)
      })
      
      setPendingFiles([])
      await loadMedia()
      
      toast({ title: "Upload completato", description: `${uploadedItems.length} file caricati con successo` })
    } catch (error) {
      console.error('Error uploading files:', error)
      const errorMessage = error instanceof Error ? error.message : "Errore nel caricamento dei file"
      toast({ title: "Errore", description: errorMessage, variant: "destructive" })
    }
  }, [pendingFiles, videoUsedBytes, loadMedia])

  useEffect(() => {
    // Provide upload function to parent
    if (pendingFiles.length > 0) {
      onPendingFilesChange?.(uploadPendingFiles)
    } else {
      onPendingFilesChange?.(null)
    }
  }, [pendingFiles, onPendingFilesChange, uploadPendingFiles])

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      pendingFiles.forEach(pf => {
        URL.revokeObjectURL(pf.preview)
      })
    }
  }, [pendingFiles])
  

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
    
    console.debug('[MediaUploader] handleFiles called with', files.length, 'files')
    
    const validFiles: { file: File; tipo: 'image' | 'video' }[] = []
    
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type === 'video/mp4'
      const isValidSize = file.size <= MAX_FILE_SIZE
      
      console.debug('[MediaUploader] Processing file:', file.name, 'type:', file.type, 'size:', file.size, 'isVideo:', isVideo)
      
      if (!isImage && !isVideo) {
        toast({ 
          title: "Tipo file non supportato", 
          description: `${file.name}: supportati solo immagini e video MP4`, 
          variant: "destructive" 
        })
        continue
      }
      
      if (!isValidSize) {
        toast({ 
          title: "File troppo grande", 
          description: `${file.name} supera il limite di 100MB`, 
          variant: "destructive" 
        })
        continue
      }
      
      validFiles.push({
        file,
        tipo: isVideo ? 'video' : 'image'
      })
    }

    console.debug('[MediaUploader] Valid files:', validFiles.length, 'videos:', validFiles.filter(f => f.tipo === 'video').length)

    if (validFiles.length === 0) return

    // Check video quota
    const newVideoSize = validFiles
      .filter(vf => vf.tipo === 'video')
      .reduce((sum, vf) => sum + vf.file.size, 0)
    
    const currentPendingVideoSize = pendingFiles
      .filter(pf => pf.tipo === 'video')
      .reduce((sum, pf) => sum + pf.file.size, 0)
    
    console.debug('[MediaUploader] Video quota check:', {
      videoUsedBytes,
      currentPendingVideoSize,
      newVideoSize,
      total: videoUsedBytes + currentPendingVideoSize + newVideoSize,
      limit: VIDEO_QUOTA_BYTES
    })
    
    if (videoUsedBytes + currentPendingVideoSize + newVideoSize > VIDEO_QUOTA_BYTES) {
      const availableMB = ((VIDEO_QUOTA_BYTES - videoUsedBytes - currentPendingVideoSize) / 1048576).toFixed(1)
      toast({ 
        title: "Quota video superata", 
        description: `Disponibili: ${availableMB} MB`, 
        variant: "destructive" 
      })
      return
    }
    
    if (siteId) {
      // Direct upload for existing POI
      console.debug('[MediaUploader] Starting direct upload for siteId:', siteId)
      setUploading(true)
      try {
        const uploadedItems = []
        
        for (const { file, tipo } of validFiles) {
          console.debug('[MediaUploader] Uploading file:', file.name, 'tipo:', tipo)
          
          if (tipo === 'video') {
            // Upload video directly
            const fileName = `${crypto.randomUUID()}.mp4`
            const filePath = `poi/${siteId}/${fileName}`
            
            console.debug('[MediaUploader] Uploading video to:', filePath, 'size:', file.size)
            
            const { error: uploadError } = await supabase.storage
              .from('poi-media')
              .upload(filePath, file, {
                contentType: 'video/mp4',
                upsert: true,
                cacheControl: 'public, max-age=31536000, immutable'
              })
            
            if (uploadError) {
              console.error('[MediaUploader] Video upload error:', uploadError)
              throw uploadError
            }
            
            console.debug('[MediaUploader] Video uploaded successfully to:', filePath)
            
            uploadedItems.push({
              storage_path: filePath,
              tipo: 'video' as const,
              titolo: file.name,
              didascalia: '',
              ordine: 0,
              size_bytes: file.size
            })
          } else {
            // Upload image with compression
            const compressedFile = await compressImage(file)
            const ext = (compressedFile.name.split('.').pop() || 'jpg').toLowerCase()
            const id = crypto.randomUUID()
            const storagePath = `poi/${siteId}/${id}.${ext}`
            
            const { error: uploadError } = await supabase.storage
              .from('poi-media')
              .upload(storagePath, compressedFile, {
                cacheControl: '3600',
                upsert: true
              })
            
            if (uploadError) throw uploadError
            
            uploadedItems.push({
              storage_path: storagePath,
              tipo: 'image' as const,
              titolo: compressedFile.name,
              didascalia: '',
              ordine: 0,
              size_bytes: compressedFile.size
            })
          }
        }

        console.debug('[MediaUploader] All files uploaded, calling rpc_attach_media with items:', uploadedItems)

        // Use RPC to attach media with quota check
        const { data: attachedMedia, error: attachError } = await supabase.rpc('rpc_attach_media', {
          p_site_id: siteId,
          p_items: uploadedItems
        })

        if (attachError) {
          console.error('[MediaUploader] Attach media error:', attachError)
          throw attachError
        }

        console.debug('[MediaUploader] Media attached successfully:', attachedMedia)

        await loadMedia()
        console.debug('[MediaUploader] Media reloaded, showing success toast')
        
        toast({ title: "Upload completato", description: `${validFiles.length} file caricati con successo` })
      } catch (error) {
        console.error('[MediaUploader] Error uploading files:', error)
        const errorMessage = error instanceof Error ? error.message : "Errore nel caricamento dei file"
        toast({ title: "Errore", description: errorMessage, variant: "destructive" })
      } finally {
        setUploading(false)
      }
    } else {
      // Queue for upload when site is created
      console.debug('[MediaUploader] No siteId, queueing files for later upload')
      const newPendingFiles: PendingFile[] = validFiles.map(({ file, tipo }) => ({
        file,
        tipo,
        preview: URL.createObjectURL(file)
      }))
      
      setPendingFiles(prev => [...prev, ...newPendingFiles])
      
      toast({ title: "File aggiunti", description: `${validFiles.length} file aggiunti alla coda` })
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
        <CardTitle>Media</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDrop={onDrop}
          onDragOver={prevent}
          onDragEnter={prevent}
          className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center"
        >
          <ImageIcon className="h-8 w-8" />
          <p className="text-sm">Trascina immagini e video qui oppure</p>
          <p className="text-xs text-muted-foreground mb-2">
            Video: {(videoUsedBytes / 1048576).toFixed(1)} MB / 100 MB utilizzati
            {pendingFiles.filter(pf => pf.tipo === 'video').length > 0 && 
              ` (+${(pendingFiles.filter(pf => pf.tipo === 'video').reduce((sum, pf) => sum + pf.file.size, 0) / 1048576).toFixed(1)} MB in coda)`
            }
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/mp4"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button onClick={openPicker} disabled={uploading}>
            <Upload className="mr-2 h-4 w-4" /> Seleziona file
          </Button>
        </div>

        {!siteId && pendingFiles.length > 0 && (
          <div>
            <p className="text-sm mb-2">File pronti per il salvataggio ({pendingFiles.length})</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {pendingFiles.map((pendingFile, index) => (
                <div key={index} className="rounded overflow-hidden border relative group">
                  {pendingFile.tipo === 'video' ? (
                    <video
                      src={pendingFile.preview}
                      className="w-full h-32 object-cover"
                      controls={false}
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={pendingFile.preview}
                      alt={pendingFile.file.name}
                      className="w-full h-32 object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="text-white text-xs text-center px-2">
                      <p className="truncate">{pendingFile.file.name}</p>
                      <p>{pendingFile.tipo === 'video' ? '🎥' : '🖼️'} {(pendingFile.file.size / 1048576).toFixed(1)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPendingFiles(prev => {
                        const updated = prev.filter((_, i) => i !== index)
                        // Clean up blob URL
                        URL.revokeObjectURL(pendingFile.preview)
                        return updated
                      })
                    }}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Rimuovi file"
                  >
                    <X className="w-3 h-3" />
                  </button>
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
                    {m.tipo === 'video' ? (
                      <video
                        src={url}
                        className="w-full h-32 object-cover"
                        controls={false}
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img src={url} alt={m.titolo || 'Immagine POI'} className="w-full h-32 object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="flex items-center gap-2">
                        {m.tipo === 'video' && (
                          <span className="text-white text-xs bg-black/50 px-2 py-1 rounded">
                            🎥 {m.size_bytes ? (m.size_bytes / 1048576).toFixed(1) + ' MB' : ''}
                          </span>
                        )}
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
                          title={`Elimina ${m.tipo === 'video' ? 'video' : 'immagine'}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
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
