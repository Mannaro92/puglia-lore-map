import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PoiMapCanvas } from '@/components/map/PoiMapCanvas'
import { PoiForm } from '@/components/poi/PoiForm'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export default function EditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const siteId = searchParams.get('site')
  
  const [user, setUser] = useState<User | null>(null)
  const [coordinates, setCoordinates] = useState<{ lon: number; lat: number } | null>(null)
  const [clickToPlaceMode, setClickToPlaceMode] = useState(false)
  const [focusSiteId, setFocusSiteId] = useState<string | null>(null)

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/')
        return
      }
      setUser(user)
    }
    
    checkAuth()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        navigate('/')
      } else {
        setUser(session.user)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [navigate])

  const handleMapClick = (lngLat: { lng: number; lat: number }) => {
    setCoordinates({ lon: lngLat.lng, lat: lngLat.lat })
    setClickToPlaceMode(false)
  }

  const handleClickToPlace = () => {
    setClickToPlaceMode(true)
  }

  const handleSave = (savedSiteId: string) => {
    setFocusSiteId(savedSiteId)
    // Navigate back to home with focus parameter
    navigate(`/?focus=${savedSiteId}`)
  }

  const handleCancel = () => {
    navigate('/')
  }

  const handleDelete = () => {
    navigate('/')
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

      {/* Split view */}
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Left panel - Form */}
        <div className="w-1/2 border-r bg-background">
          <PoiForm
            siteId={siteId || undefined}
            coordinates={coordinates}
            onCoordinatesChange={setCoordinates}
            onSave={handleSave}
            onCancel={handleCancel}
            onDelete={handleDelete}
            onClickToPlace={handleClickToPlace}
            isClickingToPlace={clickToPlaceMode}
          />
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