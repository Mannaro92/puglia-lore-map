import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import { Loader2, Save, Trash2, MapPin, X } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { MediaUploader } from '@/components/media/MediaUploader'

interface PoiFormProps {
  siteId?: string
  coordinates?: { lon: number; lat: number } | null
  onCoordinatesChange?: (coords: { lon: number; lat: number } | null) => void
  onSave?: (siteId: string) => void
  onCancel?: () => void
  onDelete?: () => void
  onClickToPlace?: () => void
  isClickingToPlace?: boolean
}

interface LookupData {
  [key: string]: Array<{ id: string; label: string; sort_order: number }>
}

interface FormData {
  id?: string
  toponimo: string
  descrizione: string
  ubicazione_confidenza_id: string
  posizione_id?: string
  indirizzo_libero?: string
  stato_validazione: 'draft' | 'published'
  cronologia_ids: string[]
  definizione_ids: string[]
  tipo_rinvenimento_ids: string[]
  grado_esplorazione_ids: string[]
  strutture_ids: string[]
  contesti_ids: string[]
  indicatori_ids: string[]
  ambiti_ids: string[]
  biblio_ids: string[]
  fonte?: string
}

interface MediaFile {
  name: string
  path: string
}

export function PoiForm({
  siteId,
  coordinates,
  onCoordinatesChange,
  onSave,
  onCancel, 
  onDelete,
  onClickToPlace,
  isClickingToPlace
}: PoiFormProps) {
  const [loading, setLoading] = useState(false)
  const [lookups, setLookups] = useState<LookupData>({})
  const [loadingLookups, setLoadingLookups] = useState(true)
  const [pendingUploadFn, setPendingUploadFn] = useState<((siteId: string) => Promise<void>) | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Controlled string inputs for coordinates
  const [latStr, setLatStr] = useState<string>('')
  const [lonStr, setLonStr] = useState<string>('')
  
  // Sync string inputs with coordinates prop
  useEffect(() => {
    if (coordinates?.lat != null) {
      setLatStr(String(coordinates.lat))
    } else {
      setLatStr('')
    }
  }, [coordinates?.lat])
  
  useEffect(() => {
    if (coordinates?.lon != null) {
      setLonStr(String(coordinates.lon))  
    } else {
      setLonStr('')
    }
  }, [coordinates?.lon])

  // Parse number from string, supporting comma as decimal separator
  const parseCoordinate = (value: string) => {
    const cleaned = value.replace(',', '.')
    const num = Number(cleaned)
    return Number.isFinite(num) ? num : null
  }

  // Handle coordinate input blur - update coordinates when user finishes editing
  const handleCoordinateBlur = () => {
    const lat = parseCoordinate(latStr)
    const lon = parseCoordinate(lonStr)
    if (lat != null && lon != null) {
      onCoordinatesChange?.({ lat, lon })
    }
  }

  const [formData, setFormData] = useState<FormData>({
    toponimo: '',
    descrizione: '',
    ubicazione_confidenza_id: '',
    stato_validazione: 'draft',
    cronologia_ids: [],
    definizione_ids: [],
    tipo_rinvenimento_ids: [],
    grado_esplorazione_ids: [],
    strutture_ids: [],
    contesti_ids: [],
    indicatori_ids: [],
    ambiti_ids: [],
    biblio_ids: [],
    fonte: ''
  })

  // Load lookups and site data / reset when creating new
  useEffect(() => {
    loadLookups()
    if (siteId) {
      loadSiteData()
    } else {
      setFormData({
        id: undefined,
        toponimo: '',
        descrizione: '',
        ubicazione_confidenza_id: '',
        stato_validazione: 'draft',
        cronologia_ids: [],
        definizione_ids: [],
        tipo_rinvenimento_ids: [],
        grado_esplorazione_ids: [],
        strutture_ids: [],
        contesti_ids: [],
        indicatori_ids: [],
        ambiti_ids: [],
        biblio_ids: [],
        fonte: ''
      })
      onCoordinatesChange?.(null)
    }
  }, [siteId])

  const loadLookups = async () => {
    try {
      const { data, error } = await supabase.rpc('rpc_get_lookups')
      if (error) throw error
      setLookups(data as LookupData || {})
    } catch (error: any) {
      console.error('Error loading lookups:', error)
      toast({
        title: "Errore caricamento vocabolari",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoadingLookups(false)
    }
  }

  const loadSiteData = async () => {
    if (!siteId) return
    
    setLoading(true)
    try {
      const { data: site, error } = await supabase
        .from('sites')
        .select(`
          *,
          site_cronologia(cronologia_id),
          site_definizione(definizione_id),
          site_tipo_rinvenimento(tipo_rinvenimento_id),
          site_grado_esplorazione(grado_id),
          site_strutture(struttura_id),
          site_contesti(contesto_id),
          site_indicatori(indicatore_id),
          site_ambiti(ambito_id),
          site_biblio(biblio_id)
        `)
        .eq('id', siteId)
        .maybeSingle(); // Use maybeSingle to avoid errors when no data found
        
      if (error) throw error
      if (!site) return
      
      // Extract coordinates from geometry
      let coords = null
      if (site.geom_point) {
        const { data: geoData, error: geoError } = await supabase
          .rpc('st_asgeojson', { geom: site.geom_point })
        if (!geoError && geoData) {
          const parsed = JSON.parse(geoData)
          if (parsed.coordinates) {
            coords = { lon: parsed.coordinates[0], lat: parsed.coordinates[1] }
            onCoordinatesChange?.(coords)
          }
        }
      }
      
      setFormData({
        id: site.id,
        toponimo: site.toponimo || '',
        descrizione: site.descrizione || '',
        ubicazione_confidenza_id: site.ubicazione_confidenza_id || '',
        posizione_id: site.posizione_id || '',
        indirizzo_libero: site.indirizzo_libero || '',
        stato_validazione: (site.stato_validazione === 'review' ? 'draft' : site.stato_validazione) || 'draft',
        cronologia_ids: site.site_cronologia?.map((r: any) => r.cronologia_id) || [],
        definizione_ids: site.site_definizione?.map((r: any) => r.definizione_id) || [],
        tipo_rinvenimento_ids: site.site_tipo_rinvenimento?.map((r: any) => r.tipo_rinvenimento_id) || [],
        grado_esplorazione_ids: site.site_grado_esplorazione?.map((r: any) => r.grado_id) || [],
        strutture_ids: site.site_strutture?.map((r: any) => r.struttura_id) || [],
        contesti_ids: site.site_contesti?.map((r: any) => r.contesto_id) || [],
        indicatori_ids: site.site_indicatori?.map((r: any) => r.indicatore_id) || [],
        ambiti_ids: site.site_ambiti?.map((r: any) => r.ambito_id) || [],
        biblio_ids: site.site_biblio?.map((r: any) => r.biblio_id) || []
      })
      
    } catch (error: any) {
      console.error('Error loading site:', error)
      toast({
        title: "Errore caricamento sito",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    // Validation
    if (!formData.toponimo.trim()) {
      toast({
        title: "Campo obbligatorio",
        description: "Il Toponimo è obbligatorio",
        variant: "destructive"
      })
      return
    }
    
    if (!formData.descrizione.trim()) {
      toast({
        title: "Campo obbligatorio", 
        description: "La Descrizione è obbligatoria",
        variant: "destructive"
      })
      return
    }
    
    if (!formData.ubicazione_confidenza_id) {
      toast({
        title: "Campo obbligatorio",
        description: "L'Ubicazione confidenza è obbligatoria",
        variant: "destructive"
      })
      return
    }
    
    setLoading(true)
    try {
      // Simple UUID validation
      const isValidUuid = (uuid: string) => {
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        return uuidPattern.test(uuid)
      }

      // Clean UUID arrays - keep it simple
      const cleanUuidArray = (arr: string[]) => {
        return arr.filter(id => id && typeof id === 'string' && isValidUuid(id.trim()))
      }

      // Build numeric coordinates - prefer prop coordinates, fallback to manual inputs
      const latParsed = parseCoordinate(latStr)
      const lonParsed = parseCoordinate(lonStr)
      const effectiveCoords = coordinates ?? ((latParsed != null && lonParsed != null) ? { lat: latParsed, lon: lonParsed } : null)

      // Clean numeric lat/lon for payload - ensure they are numbers, not strings
      const lat = effectiveCoords?.lat !== undefined && effectiveCoords?.lat !== null 
        ? Number(effectiveCoords.lat) : undefined;
      const lon = effectiveCoords?.lon !== undefined && effectiveCoords?.lon !== null 
        ? Number(effectiveCoords.lon) : undefined;

      // If publishing, require coordinates
      if (formData.stato_validazione === 'published' && (!lat || !lon)) {
        toast({
          title: 'Coordinate mancanti',
          description: 'Per pubblicare è necessario impostare le coordinate (clic sulla mappa o inserisci lat/lon).',
          variant: 'destructive'
        })
        setLoading(false)
        return
      }

      const payload = {
        ...formData,
        ubicazione_confidenza_id: formData.ubicazione_confidenza_id,
        posizione_id: (formData.posizione_id && isValidUuid(formData.posizione_id)) ? formData.posizione_id : null,
        fonte: formData.fonte, // Explicitly include fonte field
        // Include lat/lon as separate numeric fields instead of coordinates object
        ...(lat !== undefined && lon !== undefined ? { lat, lon } : {}),
        // Clean all UUID arrays once
        cronologia_ids: cleanUuidArray(formData.cronologia_ids),
        definizione_ids: cleanUuidArray(formData.definizione_ids),
        tipo_rinvenimento_ids: cleanUuidArray(formData.tipo_rinvenimento_ids),
        grado_esplorazione_ids: cleanUuidArray(formData.grado_esplorazione_ids),
        strutture_ids: cleanUuidArray(formData.strutture_ids),
        contesti_ids: cleanUuidArray(formData.contesti_ids),
        indicatori_ids: cleanUuidArray(formData.indicatori_ids),
        ambiti_ids: cleanUuidArray(formData.ambiti_ids),
        biblio_ids: cleanUuidArray(formData.biblio_ids),
        // Server-side RPC (rpc_upsert_site) may expect plural aliases without _ids
        cronologie: cleanUuidArray(formData.cronologia_ids),
        definizioni: cleanUuidArray(formData.definizione_ids),
        tipi_rinvenimento: cleanUuidArray(formData.tipo_rinvenimento_ids),
        gradi_esplorazione: cleanUuidArray(formData.grado_esplorazione_ids),
        strutture: cleanUuidArray(formData.strutture_ids),
        contesti: cleanUuidArray(formData.contesti_ids),
        indicatori: cleanUuidArray(formData.indicatori_ids),
        ambiti: cleanUuidArray(formData.ambiti_ids),
        bibliografie: cleanUuidArray(formData.biblio_ids)
      }
      
      console.log('💾 Saving payload:', payload)
      console.log('📝 Fonte field value:', formData.fonte)
      
      let savedId = siteId

      // STEP 1: Create/update POI draft first to get site_id
      if (!savedId) {
        // Create new POI as draft first
        const { data: draftPoi, error: draftError } = await supabase
          .rpc('rpc_upsert_site', {
            p_site_id: null,
            p_payload: payload,
            p_publish: false, // Always draft first
            p_clear_geom: false,
            p_user: null
          });

        if (draftError) throw draftError
        if (!draftPoi?.id) throw new Error('Errore creazione POI: ID mancante')
        
        savedId = draftPoi.id
        console.log('✅ Created draft POI with ID:', savedId)
      } else {
        // Update existing POI (but don't publish yet if there are images to upload)
        const shouldPublish = formData.stato_validazione === 'published' && !pendingUploadFn
        const { error: updateError } = await supabase
          .rpc('rpc_upsert_site', {
            p_site_id: savedId,
            p_payload: payload,
            p_publish: shouldPublish,
            p_clear_geom: false,
            p_user: null
          });

        if (updateError) throw updateError
        console.log('✅ Updated POI:', savedId)
      }

      // STEP 2: Upload pending images if any
      if (pendingUploadFn) {
        console.log('📤 Uploading pending images...')
        await pendingUploadFn(savedId)
        console.log('✅ Images uploaded and attached')
      }

      // STEP 3: Publish if requested (after images are uploaded)
      if (formData.stato_validazione === 'published') {
        const { error: publishError } = await supabase
          .rpc('rpc_upsert_site', {
            p_site_id: savedId,
            p_payload: {}, // No changes to data, just publish
            p_publish: true,
            p_clear_geom: false,
            p_user: null
          });

        if (publishError) throw publishError
        console.log('✅ POI published')
      }

      // Ensure relation tables mirror current selections (draft or published)
      try {
        const pairs: Array<[string, string, string[]]> = [
          ['site_cronologia', 'cronologia_id', payload.cronologia_ids || payload.cronologie || []],
          ['site_definizione', 'definizione_id', payload.definizione_ids || payload.definizioni || []],
          ['site_tipo_rinvenimento', 'tipo_rinvenimento_id', payload.tipo_rinvenimento_ids || payload.tipi_rinvenimento || []],
          ['site_grado_esplorazione', 'grado_id', payload.grado_esplorazione_ids || payload.gradi_esplorazione || []],
          ['site_strutture', 'struttura_id', payload.strutture_ids || payload.strutture || []],
          ['site_contesti', 'contesto_id', payload.contesti_ids || payload.contesti || []],
          ['site_indicatori', 'indicatore_id', payload.indicatori_ids || payload.indicatori || []],
          ['site_ambiti', 'ambito_id', payload.ambiti_ids || payload.ambiti || []],
          ['site_biblio', 'biblio_id', payload.biblio_ids || payload.bibliografie || []],
        ]
        const syncLink = async (table: string, col: string, ids: string[]) => {
          const { data: existing, error: selErr } = await (supabase as any).from(table).select(col as any).eq('site_id', savedId)
          if (selErr) throw selErr
          const existingIds = (existing || []).map((r: any) => r[col])
          const toInsert = ids.filter((id) => !existingIds.includes(id))
          const toDelete = existingIds.filter((id: string) => !ids.includes(id))
          if (toDelete.length) {
            await (supabase as any).from(table).delete().eq('site_id', savedId).in(col as any, toDelete)
          }
          if (toInsert.length) {
            const rows = toInsert.map((id) => ({ site_id: savedId, [col]: id }))
            await (supabase as any).from(table).insert(rows as any)
          }
        }
        await Promise.all(pairs.map(([t, c, ids]) => syncLink(t, c, ids)))
      } catch (relErr) {
        console.warn('Relation sync warning:', relErr)
      }
      
      const statusMessage = formData.stato_validazione === 'published' ? 'pubblicato con successo ed è ora visibile sulla mappa' : 'salvato in bozza con successo'
      toast({
        title: formData.id ? 'Sito aggiornato' : 'Sito creato',
        description: `Sito ${statusMessage}!`
      })
      
      // Ensure local state keeps the saved fonte immediately after save
      setFormData(prev => ({ ...prev, id: savedId!, fonte: payload.fonte ?? prev.fonte }))
      
      setHasUnsavedChanges(false)
      onSave?.(savedId!)
      
    } catch (error: any) {
      console.error('Save error:', error)
      toast({
        title: "Errore salvataggio",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!formData.id) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from('sites')
        .delete()
        .eq('id', formData.id)
        
      if (error) throw error
      
      toast({
        title: "Sito eliminato",
        description: "Il sito è stato eliminato con successo"
      })
      
      onDelete?.()
      
    } catch (error: any) {
      console.error('Delete error:', error)
      toast({
        title: "Errore eliminazione",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleMultiSelect = (key: keyof FormData, id: string) => {
    setFormData(prev => {
      const currentIds = Array.isArray(prev[key]) ? prev[key] as string[] : []
      const newIds = currentIds.includes(id) 
        ? currentIds.filter(i => i !== id)
        : [...currentIds, id]
      return { ...prev, [key]: newIds }
    })
    setHasUnsavedChanges(true)
  }

  // Track changes in form fields
  useEffect(() => {
    setHasUnsavedChanges(true)
  }, [formData.toponimo, formData.descrizione, formData.ubicazione_confidenza_id, formData.posizione_id, formData.indirizzo_libero, formData.stato_validazione, formData.fonte])

  const canSave = formData.toponimo.trim() && formData.descrizione.trim() && formData.ubicazione_confidenza_id

  if (loadingLookups) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {formData.id ? 'Modifica POI' : 'Nuovo POI'}
        </h2>
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Chiudi
        </Button>
      </div>

      {/* Coordinate section */}
      <Card>
        <CardHeader>
          <CardTitle>Posizione</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="latitude">Latitudine</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                inputMode="decimal"
                value={latStr}
                onChange={(e) => setLatStr(e.target.value)}
                onBlur={handleCoordinateBlur}
                placeholder="es. 41.123456"
              />
            </div>
            
            <div>
              <Label htmlFor="longitude">Longitudine</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                inputMode="decimal"
                value={lonStr}
                onChange={(e) => setLonStr(e.target.value)}
                onBlur={handleCoordinateBlur}
                placeholder="es. 16.123456"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Button onClick={onClickToPlace} variant="outline">
              <MapPin className="w-4 h-4 mr-2" />
              {isClickingToPlace ? 'Clicca sulla mappa...' : 'Clicca sulla mappa'}
            </Button>
            
            {coordinates && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => onCoordinatesChange?.(null)}
              >
                Rimuovi coordinate
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Required fields */}
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Obbligatorie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="toponimo">Toponimo *</Label>
            <Input
              id="toponimo"
              value={formData.toponimo}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, toponimo: e.target.value }))
                setHasUnsavedChanges(true)
              }}
              placeholder="Nome del sito archeologico"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="descrizione">Descrizione *</Label>
            <Textarea
              id="descrizione"
              value={formData.descrizione}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, descrizione: e.target.value }))
                setHasUnsavedChanges(true)
              }}
              placeholder="Descrizione dettagliata del sito"
              rows={4}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="ubicazione">Ubicazione *</Label>
            <Select
              value={formData.ubicazione_confidenza_id}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, ubicazione_confidenza_id: value }))
                setHasUnsavedChanges(true)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona ubicazione confidenza" />
              </SelectTrigger>
              <SelectContent>
                {lookups.ubicazione_confidenza?.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Optional fields */}
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Aggiuntive</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="posizione">Posizione</Label>
            <Select
              value={formData.posizione_id || ''}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, posizione_id: value }))
                setHasUnsavedChanges(true)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona posizione" />
              </SelectTrigger>
              <SelectContent>
                {lookups.posizione?.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="indirizzo">Indirizzo</Label>
            <Input
              id="indirizzo"
              value={formData.indirizzo_libero || ''}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, indirizzo_libero: e.target.value }))
                setHasUnsavedChanges(true)
              }}
              placeholder="Indirizzo o riferimenti topografici"
            />
          </div>
        </CardContent>
      </Card>

      {/* Multi-select fields */}
      {Object.entries({
        cronologia_ids: 'Cronologia',
        definizione_ids: 'Definizione', 
        tipo_rinvenimento_ids: 'Tipo Rinvenimento',
        grado_esplorazione_ids: 'Grado Esplorazione',
        strutture_ids: 'Strutture/Componenti',
        contesti_ids: 'Contesti Stratigrafici',
        indicatori_ids: 'Indicatori Cultuali',
        ambiti_ids: 'Ambito Cultuale',
        biblio_ids: 'Bibliografia'
      }).map(([fieldKey, title]) => {
        const lookupKey = fieldKey.replace('_ids', '').replace('strutture', 'strutture_componenti').replace('contesti', 'contesti_stratigrafici').replace('indicatori', 'indicatori_cultuali').replace('ambiti', 'ambito_cultuale')
        const items = lookups[lookupKey] || []
        const selectedIds = formData[fieldKey as keyof FormData] as string[]
        
        return (
          <Card key={fieldKey}>
            <CardHeader>
              <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fieldKey === 'biblio_ids' && (
                  <div>
                    <Label htmlFor="fonte-testuale">Fonte bibliografica (testo libero)</Label>
                    <Textarea
                      id="fonte-testuale"
                      value={formData.fonte || ''}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, fonte: e.target.value }))
                        setHasUnsavedChanges(true)
                      }}
                      placeholder="Inserisci fonte bibliografica (es. Autore, Titolo, Anno, Pagine...)"
                      rows={3}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  {items.length > 0 && (
                    <>
                      <Label>Seleziona da bibliografia esistente</Label>
                      {items.map(item => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${fieldKey}-${item.id}`}
                            checked={selectedIds.includes(item.id)}
                            onCheckedChange={() => toggleMultiSelect(fieldKey as keyof FormData, item.id)}
                          />
                          <Label htmlFor={`${fieldKey}-${item.id}`}>{item.label}</Label>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
              {selectedIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-4">
                  {selectedIds.map(id => {
                    const item = items.find(i => i.id === id)
                    return item ? (
                      <Badge key={id} variant="secondary">
                        {item.label}
                      </Badge>
                    ) : null
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Media uploader */}
      <MediaUploader 
        siteId={formData.id}
        onPendingFilesChange={setPendingUploadFn}
      />

      {/* Publication toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Pubblicazione</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.stato_validazione === 'published'}
              onCheckedChange={(checked) => {
                setFormData(prev => ({ 
                  ...prev, 
                  stato_validazione: checked ? 'published' : 'draft' 
                }))
                setHasUnsavedChanges(true)
              }}
            />
            <Label>Pubblica subito</Label>
          </div>
          {hasUnsavedChanges && (
            <p className="text-sm text-orange-600 mt-1">
              ⚠️ Modifiche non salvate - clicca "Salva & Esci" per conservare i dati
            </p>
          )}
          <p className="text-sm text-gray-600 mt-2">
            {formData.stato_validazione === 'published' 
              ? 'Il sito sarà visibile pubblicamente'
              : 'Il sito rimarrà in bozza (visibile solo a te)'}
          </p>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex justify-between pt-4 border-t">
        <div>
          {formData.id && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={loading}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Elimina
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sei sicuro di voler eliminare questo POI? L'operazione non può essere annullata.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Elimina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Annulla
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!canSave || loading}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Save className="w-4 h-4 mr-2" />
            {formData.stato_validazione === 'published' ? 'Salva & Pubblica' : 'Salva & Esci'}
          </Button>
        </div>
      </div>
    </div>
  )
}