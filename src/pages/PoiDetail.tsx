import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, Tag, Book, Image as ImageIcon, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/integrations/supabase/client'
import { PoiMedia, type PoiMediaItem } from '@/components/panels/PoiMedia'
import { ErrorBoundary } from '@/components/ErrorBoundary'

interface PoiData {
  id: string
  toponimo?: string
  descrizione?: string
  indirizzo_libero?: string
  fonte?: string
  licenza?: string
  stato_validazione?: string
  geom_point?: any
  // Location info
  comune_nome?: string
  provincia_nome?: string
  provincia_sigla?: string
  posizione_label?: string
  ubicazione_confidenza_label?: string
  // Metadata arrays
  cronologie?: string[]
  definizioni?: string[]
  ambiti?: string[]
  indicatori?: string[]
  strutture?: string[]
  contesti?: string[]
  tipi_rinvenimento?: string[]
  gradi_esplorazione?: string[]
}

// Helper function to get color for cultural context
function getAmbitoColor(ambito: string): string {
  const colors: Record<string, string> = {
    'cristiano': 'hsl(200, 80%, 50%)',
    'romano': 'hsl(0, 80%, 50%)',
    'messapico': 'hsl(120, 60%, 40%)',
    'daunio': 'hsl(60, 70%, 45%)',
    'peuceta': 'hsl(280, 60%, 50%)',
    'ebraico': 'hsl(220, 70%, 50%)',
    'islamico': 'hsl(160, 60%, 40%)'
  };
  
  return colors[ambito.toLowerCase()] || 'hsl(35, 70%, 45%)';
}

export default function PoiDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [poi, setPoi] = useState<PoiData | null>(null)
  const [media, setMedia] = useState<PoiMediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPoiDetail() {
      if (!id) {
        setError('ID del POI non fornito')
        setLoading(false)
        return
      }

      try {
        // Load complete POI data using RPC function
        const { data: poiData, error: poiError } = await supabase
          .rpc('rpc_get_poi_detail', { poi_id: id })

        if (poiError) {
          console.error('Error loading POI:', poiError)
          setError('POI non trovato')
          return
        }

        if (!poiData) {
          setError('POI non trovato')
          return
        }

        // Allow access to all POIs for public view
        setPoi(poiData as any)

        // Load media - all media for this site (no validation check for now)
        const { data: mediaRows, error: mediaError } = await supabase
          .from('media')
          .select('id, storage_path, tipo, titolo, didascalia, crediti, licenza, ordine')
          .eq('site_id', id)
          .order('ordine', { ascending: true })
          .order('created_at', { ascending: true })

        if (!mediaError && mediaRows) {
          const mediaWithUrls: PoiMediaItem[] = mediaRows.map((m: any) => {
            const { data } = supabase.storage.from('poi-media').getPublicUrl(m.storage_path)
            return { ...m, publicUrl: data.publicUrl }
          })
          setMedia(mediaWithUrls)
        }

      } catch (err) {
        console.error('Error loading POI detail:', err)
        setError('Errore nel caricamento del POI')
      } finally {
        setLoading(false)
      }
    }

    loadPoiDetail()
  }, [id])

  const handleBackToMap = () => {
    navigate('/')
  }

  const handleViewOnMap = () => {
    navigate(`/?focus=${id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (error || !poi) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">{error || 'POI non trovato'}</p>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla mappa
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ErrorBoundary fallbackTitle="Errore caricamento POI" showReload>
      <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBackToMap}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla mappa
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-lg font-semibold">Scheda Completa</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleViewOnMap}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Visualizza sulla mappa
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="space-y-2">
              <CardTitle className="text-2xl">
                {poi.toponimo || 'Sito archeologico'}
              </CardTitle>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>
                  {[poi.comune_nome, poi.provincia_nome].filter(Boolean).join(', ') || 
                   poi.indirizzo_libero || 
                   'Posizione non specificata'}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Description */}
            {poi.descrizione && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Descrizione</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {poi.descrizione}
                </p>
              </div>
            )}

            <Separator />

            {/* Media Gallery */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Immagini</h3>
                {media.length > 0 && (
                  <Badge variant="secondary">
                    {media.length}
                  </Badge>
                )}
              </div>
              
              {media.length > 0 ? (
                <PoiMedia items={media} />
              ) : (
                <div className="flex items-center justify-center p-8 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground">Nessuna immagine disponibile</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Metadata Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Chronologies */}
              {poi.cronologie && poi.cronologie.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <h3 className="font-semibold">Cronologia</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {poi.cronologie.map((cronologia: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {cronologia}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Definitions */}
              {poi.definizioni && poi.definizioni.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    <h3 className="font-semibold">Tipologia</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {poi.definizioni.map((definizione: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {definizione}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Cultural Context */}
              {poi.ambiti && poi.ambiti.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Ambito Cultuale</h3>
                  <div className="flex flex-wrap gap-2">
                    {poi.ambiti.map((ambito: string, index: number) => (
                      <Badge 
                        key={index}
                        style={{
                          backgroundColor: getAmbitoColor(ambito),
                          color: 'white'
                        }}
                      >
                        {ambito}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Cult Indicators */}
              {poi.indicatori && poi.indicatori.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Indicatori Cultuali</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {poi.indicatori.map((indicatore: string, index: number) => (
                      <span key={index} className="text-sm bg-muted px-3 py-2 rounded">
                        {indicatore}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Strutture e Componenti */}
              {poi.strutture && poi.strutture.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Strutture e Componenti</h3>
                  <div className="flex flex-wrap gap-2">
                    {poi.strutture.map((struttura: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {struttura}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Contesti Stratigrafici */}
              {poi.contesti && poi.contesti.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Contesti Stratigrafici</h3>
                  <div className="flex flex-wrap gap-2">
                    {poi.contesti.map((contesto: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {contesto}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tipi di Rinvenimento */}
              {poi.tipi_rinvenimento && poi.tipi_rinvenimento.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Tipi di Rinvenimento</h3>
                  <div className="flex flex-wrap gap-2">
                    {poi.tipi_rinvenimento.map((tipo: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {tipo}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Grado di Esplorazione */}
              {poi.gradi_esplorazione && poi.gradi_esplorazione.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Grado di Esplorazione</h3>
                  <div className="flex flex-wrap gap-2">
                    {poi.gradi_esplorazione.map((grado: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {grado}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Additional Location Info */}
            {(poi.posizione_label || poi.ubicazione_confidenza_label) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold">Informazioni Aggiuntive</h3>
                  <div className="grid gap-2 md:grid-cols-2">
                    {poi.posizione_label && (
                      <div>
                        <span className="text-sm font-medium">Posizione: </span>
                        <span className="text-sm text-muted-foreground">{poi.posizione_label}</span>
                      </div>
                    )}
                    {poi.ubicazione_confidenza_label && (
                      <div>
                        <span className="text-sm font-medium">Affidabilità ubicazione: </span>
                        <span className="text-sm text-muted-foreground">{poi.ubicazione_confidenza_label}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Source and License */}
            <div className="space-y-4">
              {poi.fonte && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Book className="w-5 h-5" />
                    <h3 className="font-semibold">Fonte</h3>
                  </div>
                  <p className="text-muted-foreground">
                    {poi.fonte}
                  </p>
                </div>
              )}

              {poi.licenza && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Licenza</h3>
                  <p className="text-muted-foreground">
                    {poi.licenza}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  </ErrorBoundary>
  );
}