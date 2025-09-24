import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PoiMapCanvas } from '@/components/map/PoiMapCanvas'
import { PoiForm } from '@/components/poi/PoiForm'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LogOut, Edit, Plus, MapPin } from 'lucide-react'
import changesLogoWhite from '@/assets/changes-logo-white.png'

interface UserSite {
  id: string
  toponimo: string
  descrizione: string
  stato_validazione: 'draft' | 'published' | 'review'
  created_at: string
  updated_at: string
}

export default function EditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { logout, role } = useAuth()
  const siteId = searchParams.get('site')
  
  console.log('🚀 EditPage mounted, siteId from URL:', siteId)
  
  const [coordinates, setCoordinates] = useState<{ lon: number; lat: number } | null>(null)
  const [clickToPlaceMode, setClickToPlaceMode] = useState(false)
  const [focusSiteId, setFocusSiteId] = useState<string | null>(null)
  const [userSites, setUserSites] = useState<UserSite[]>([])
  const [loadingSites, setLoadingSites] = useState(true)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(siteId)
  const [mapRefreshFn, setMapRefreshFn] = useState<(() => void) | null>(null)

  // Debug effect to track selectedSiteId changes
  useEffect(() => {
    console.log('🎯 selectedSiteId changed to:', selectedSiteId)
  }, [selectedSiteId])

  // Sync selectedSiteId with URL parameter, but preserve "new" mode ('')
  useEffect(() => {
    const currentSiteId = searchParams.get('site')
    console.log('🔗 URL siteId changed to:', currentSiteId)
    if (currentSiteId === null) {
      // If we're in creation mode (''), don't override
      if (selectedSiteId === '') return
      if (selectedSiteId !== null) setSelectedSiteId(null)
      return
    }
    if (currentSiteId !== selectedSiteId) {
      setSelectedSiteId(currentSiteId)
    }
  }, [searchParams, selectedSiteId])

  useEffect(() => {
    loadUserSites()
  }, [])

  // Load user's sites
  const loadUserSites = async () => {
    try {
      setLoadingSites(true)
      
      const isAdmin = role === 'admin'
      
      let query = supabase
        .from('sites')
        .select('id, toponimo, descrizione, stato_validazione, created_at, updated_at, created_by')
      
      // Only filter by ownership if not admin
      if (!isAdmin) {
        query = query.or(`created_by.eq.00000000-0000-0000-0000-000000000000,created_by.is.null`)
      }
      
      const { data, error } = await query.order('updated_at', { ascending: false })

      if (error) throw error
      setUserSites(data || [])
    } catch (error: any) {
      toast({
        title: 'Errore caricamento POI',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoadingSites(false)
    }
  }

  const handleMapClick = (lngLat: { lng: number; lat: number }) => {
    setCoordinates({ lon: lngLat.lng, lat: lngLat.lat })
    setClickToPlaceMode(false)
  }

  const handleClickToPlace = () => {
    setClickToPlaceMode(true)
  }

  const handleSave = (savedSiteId: string) => {
    setFocusSiteId(savedSiteId)
    // Refresh the sites list and close the editor
    loadUserSites()
    setSelectedSiteId(null) // Close the editor
    setCoordinates(null) // Reset coordinates
    
    // Update URL to remove site parameter
    navigate('/edit', { replace: true })
    
    // Refresh map to show new/updated POI
    if (mapRefreshFn) {
      setTimeout(() => mapRefreshFn(), 500)
    }
    toast({
      title: 'POI salvato',
      description: 'Il POI è stato salvato con successo'
    })
  }

  const handleCancel = () => {
    setSelectedSiteId(null)
    setCoordinates(null)
    
    // Update URL to remove site parameter
    navigate('/edit', { replace: true })
  }

  const handleDelete = () => {
    loadUserSites() // Refresh list after deletion
    setSelectedSiteId(null)
    setCoordinates(null)
    // Refresh map to remove deleted POI
    if (mapRefreshFn) {
      setTimeout(() => mapRefreshFn(), 500) // Small delay to ensure DB update
    }
  }

  const handleSelectSite = (site: UserSite) => {
    console.log('🔍 Selecting site:', site.id, site.toponimo)
    setSelectedSiteId(site.id)
    setCoordinates(null) // Reset coordinates when selecting a different site
    // Update URL using React Router navigate instead of window.history
    navigate(`/edit?site=${site.id}`, { replace: true })
  }

  const handleCreateNew = () => {
    console.log('➕ Creating new POI')
    setSelectedSiteId('') // use empty string to render the form for a new POI
    setCoordinates(null)
    // Update URL to remove site parameter using navigate for consistency
    navigate('/edit', { replace: true })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="default" className="bg-green-500">Pubblicato</Badge>
      case 'draft':
        return <Badge variant="secondary">Bozza</Badge>
      case 'review':
        return <Badge variant="outline">In revisione</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }


  return (
    <div className="min-h-screen bg-background font-dm-sans">
      {/* Header CHANGES */}
      <header className="border-b bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-primary/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={changesLogoWhite} 
              alt="CHANGES Logo" 
              className="h-8 w-auto"
            />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-primary-foreground">MEMOIR GIS</h1>
              <span className="text-xs text-primary-foreground/80">Editor POI</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-primary-foreground/80">
              Amministratore
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Three-column layout: sidebar, form, map */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left sidebar - POI List */}
        <div className="w-80 border-r bg-background">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {role === 'admin' ? 'POI del progetto' : 'I tuoi POI'}
              </h2>
              <Button onClick={handleCreateNew} size="sm" variant="changes-primary">
                <Plus className="w-4 h-4 mr-2" />
                Nuovo
              </Button>
            </div>
          </div>
          
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="p-4 space-y-3">
              {loadingSites ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-pulse text-sm">Caricamento POI...</div>
                </div>
              ) : userSites.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nessun POI creato</p>
                  <p className="text-xs">Clicca "Nuovo" per iniziare</p>
                </div>
              ) : (
                userSites.map((site) => (
                  <Card
                    key={site.id}
                    className={`cursor-pointer transition-all hover:shadow-md border-primary/20 ${
                      selectedSiteId === site.id ? 'ring-2 ring-primary shadow-md bg-primary/5' : ''
                    }`}
                    onClick={() => handleSelectSite(site)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm leading-tight">
                          {site.toponimo}
                        </CardTitle>
                        <Edit className="w-3 h-3 opacity-50 flex-shrink-0 ml-2" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {site.descrizione}
                      </p>
                      <div className="flex items-center justify-between">
                        {getStatusBadge(site.stato_validazione)}
                        <span className="text-xs text-muted-foreground">
                          {new Date(site.updated_at).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Center panel - Form */}
        <div className="flex-1 border-r bg-background">
          {selectedSiteId !== null && selectedSiteId !== '' ? (
            <PoiForm
              siteId={selectedSiteId || undefined}
              coordinates={coordinates}
              onCoordinatesChange={setCoordinates}
              onSave={handleSave}
              onCancel={handleCancel}
              onDelete={handleDelete}
              onClickToPlace={handleClickToPlace}
              isClickingToPlace={clickToPlaceMode}
            />
          ) : selectedSiteId === '' ? (
            <PoiForm
              coordinates={coordinates}
              onCoordinatesChange={setCoordinates}
              onSave={handleSave}
              onCancel={handleCancel}
              onDelete={handleDelete}
              onClickToPlace={handleClickToPlace}
              isClickingToPlace={clickToPlaceMode}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Benvenuto nell'Editor POI</h3>
                <p className="text-muted-foreground">
                  Seleziona un POI esistente dalla lista a sinistra per modificarlo,<br />
                  oppure clicca "Nuovo" in alto a sinistra per crearne uno.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Right panel - Map */}
        <div className="w-1/2 relative">
          <PoiMapCanvas
            onMapClick={handleMapClick}
            clickToPlaceMode={clickToPlaceMode}
            focusSiteId={focusSiteId}
            initialCenter={[16.6, 41.1]}
            initialZoom={8}
            coordinates={coordinates}
            onMapReady={setMapRefreshFn}
          />
          
          {clickToPlaceMode && (
            <div className="absolute top-4 left-4 right-4 bg-yellow-100 border border-yellow-400 rounded-lg p-3 z-10">
              <p className="text-sm text-yellow-800 text-center font-medium">
                📍 Clicca sulla mappa per posizionare il POI
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}