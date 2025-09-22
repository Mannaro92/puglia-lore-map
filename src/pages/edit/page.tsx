import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapCanvas } from '@/components/map/MapCanvas'
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
          {/* Use a simple div for now since MapCanvas doesn't support click mode */}
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-semibold">Mappa POI Editor</p>
              <p className="text-sm text-gray-600 mt-2">
                Mappa in fase di implementazione per click-to-place
              </p>
              {coordinates && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">
                    Coordinate: {coordinates.lat.toFixed(6)}, {coordinates.lon.toFixed(6)}
                  </p>
                </div>
              )}
              {clickToPlaceMode && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs text-yellow-700">Modalità click-to-place attiva</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}