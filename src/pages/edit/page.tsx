import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PoiMapCanvas } from '@/components/map/PoiMapCanvas'
import { PoiForm } from '@/components/poi/PoiForm'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LogOut, Edit, Plus, MapPin } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

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
  const siteId = searchParams.get('site')
  
  console.log('🚀 EditPage mounted, siteId from URL:', siteId)
  
  const [user, setUser] = useState<User | null>(null)
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

  // Sync selectedSiteId with URL parameter
  useEffect(() => {
    const currentSiteId = searchParams.get('site')
    console.log('🔗 URL siteId changed to:', currentSiteId)
    if (currentSiteId !== selectedSiteId) {
      setSelectedSiteId(currentSiteId)
    }
  }, [searchParams, selectedSiteId])

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/')
        return
      }
      setUser(user)
      loadUserSites() // Load sites after authentication
    }
    
    checkAuth()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        navigate('/')
      } else {
        setUser(session.user)
        loadUserSites()
      }
    })
    
    return () => subscription.unsubscribe()
  }, [navigate])

  // Load user's sites
  const loadUserSites = async () => {
    try {
      setLoadingSites(true)
      console.log('📋 Loading user sites...')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('❌ No user found when loading sites')
        return
      }
      
      const { data, error } = await supabase
        .from('sites')
        .select('id, toponimo, descrizione, stato_validazione, created_at, updated_at')
        .eq('created_by', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      console.log('✅ User sites loaded:', data?.length || 0)
      setUserSites(data || [])
    } catch (error: any) {
      console.error('💥 Error loading user sites:', error)
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
    // Update URL without page reload
    window.history.replaceState({}, '', `/edit?site=${site.id}`)
  }

  const handleCreateNew = () => {
    console.log('➕ Creating new POI')
    setSelectedSiteId(null)
    setCoordinates(null)
    // Update URL to remove site parameter
    window.history.replaceState({}, '', '/edit')
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg">Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">MEMOIR GIS</h1>
            <span className="text-sm text-muted-foreground">Editor</span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Three-column layout: sidebar, form, map */}
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Left sidebar - POI List */}
        <div className="w-80 border-r bg-background">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">I tuoi POI</h2>
          </div>
          
          <ScrollArea className="h-[calc(100vh-7rem)]">
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
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedSiteId === site.id ? 'ring-2 ring-blue-500 shadow-md' : ''
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
          {selectedSiteId !== null ? (
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
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Benvenuto nell'Editor POI</h3>
                <p className="text-muted-foreground mb-4">
                  Seleziona un POI esistente dalla lista a sinistra per modificarlo
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