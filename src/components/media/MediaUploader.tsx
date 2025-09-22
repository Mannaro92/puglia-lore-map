import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { uploadPoiImage, getSessionId, insertMedia, getSiteMedia, deleteMedia, type MediaItem, compressImage } from '@/lib/media'
import { supabase } from '@/integrations/supabase/client'
import { Image as ImageIcon, Upload, X } from 'lucide-react'

interface MediaUploaderProps {
  siteId?: string
  onTempFilesChange?: (files: string[]) => void
  onMediaListChange?: (list: MediaItem[]) => void
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({ siteId, onTempFilesChange, onMediaListChange }) => {
  const [sessionId] = useState(getSessionId())
  const [uploading, setUploading] = useState(false)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [tempFiles, setTempFiles] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)

  const loadMedia = useCallback(async () => {
    if (!siteId) return
    try {
      const list = await getSiteMedia(siteId)
      setMedia(list)
      onMediaListChange?.(list)
    } catch (e: any) {
      console.error(e)
    }
  }, [siteId, onMediaListChange])

  useEffect(() => {
    loadMedia()
  }, [loadMedia])

  useEffect(() => {
    onTempFilesChange?.(tempFiles)
  }, [tempFiles, onTempFilesChange])

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
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast({ title: 'Formato non supportato', description: 'Carica solo immagini', variant: 'destructive' })
          continue
        }
        const compressed = await compressImage(file)
        const { path } = await uploadPoiImage(siteId || null, compressed, sessionId)

        if (siteId) {
          // Insert immediately for existing site
          await insertMedia({
            site_id: siteId,
            storage_path: path,
            tipo: 'image',
            licenza: 'CC BY 4.0',
            ordine: media.length,
            titolo: compressed.name,
          } as any)
          await loadMedia()
        } else {
          // Collect temp file names for later move
          const fname = path.split('/').pop() || compressed.name
          setTempFiles((prev) => Array.from(new Set([...prev, fname])))
        }
      }
      toast({ title: 'Upload completato' })
    } catch (e: any) {
      console.error(e)
      toast({ title: 'Errore upload', description: e.message, variant: 'destructive' })
    } finally {
      setUploading(false)
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

        {(!siteId && tempFiles.length > 0) && (
          <div>
            <p className="text-sm mb-2">In attesa di salvataggio ({tempFiles.length})</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {tempFiles.map((f) => (
                <div key={f} className="rounded border p-2 text-xs">
                  temp/{sessionId}/{f}
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
