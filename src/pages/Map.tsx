import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SimpleMapCanvas } from '@/components/map/SimpleMapCanvas'
import { LayerPanel } from '@/components/map/LayerPanel'
import { SearchBox } from '@/components/map/SearchBox'
import { LoginModal } from '@/components/auth/LoginModal'
import { FeatureInfoPanel } from '@/components/panels/FeatureInfoPanel'
import { Button } from '@/components/ui/button'
import { LogIn, Edit3, LogOut } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { User } from '@supabase/supabase-js'

export default function MapPage() {
  console.log('🗺️ MapPage component mounting')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  
  // Auth state
  const [user, setUser] = useState<User | null>(null)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  
  // Map state
  const [selectedFeature, setSelectedFeature] = useState<any>(null)
  const focusSiteId = searchParams.get('focus')

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    
    checkAuth()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'SIGNED_IN') {
        setLoginModalOpen(false)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [])

  const handleFeatureClick = (feature: any) => {
    setSelectedFeature(feature)
    console.log('Feature clicked:', feature.properties)
  }

  const handleEditMode = () => {
    if (user) {
      navigate('/edit')
    } else {
      setLoginModalOpen(true)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleSearchSelect = (result: any) => {
    console.log('Search result selected:', result)
    // For now just log, can enhance later with map navigation
  }

  return (
    <div className="w-full h-screen flex relative">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="text-xl font-bold">MEMOIR GIS</h1>
          
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user.email}
                </span>
                <Button variant="outline" size="sm" onClick={handleEditMode}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Editor
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setLoginModalOpen(true)}>
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 relative pt-14">
        {/* Map Canvas */}
        <SimpleMapCanvas
          onFeatureClick={handleFeatureClick}
          focusSiteId={focusSiteId}
          initialCenter={[16.6, 41.1]}
          initialZoom={8}
        />
        
        {/* Search Box */}
        <div className="absolute top-20 left-4 w-80 z-10">
          <SearchBox
            filters={{}}
            onResultSelect={handleSearchSelect}
            onGeocodeSelect={handleSearchSelect}
          />
        </div>
        
        {/* Feature Info Panel (if feature selected) */}
        {selectedFeature && (
          <div className="absolute top-20 right-4 w-80 z-10">
            <div className="bg-background border rounded-lg shadow-lg max-h-[70vh] overflow-y-auto">
              <FeatureInfoPanel 
                feature={selectedFeature}
                onClose={() => setSelectedFeature(null)}
              />
            </div>
          </div>
        )}
      </div>

      <LoginModal 
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        onSuccess={handleEditMode}
      />
    </div>
  )
}