import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SimpleMapCanvas } from '@/components/map/SimpleMapCanvas'
import { LayerControl } from '@/components/map/LayerControl'
import { SearchBox } from '@/components/map/SearchBox'
import { FeatureInfoPanel } from '@/components/panels/FeatureInfoPanel'
import { Button } from '@/components/ui/button'
import { LogIn, Edit3, LogOut, Layers } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export default function MapPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  
  // Auth state
  const { isAuthenticated, logout } = useAuth()
  
  // Map state
  const [selectedFeature, setSelectedFeature] = useState<any>(null)
  const [focusSiteId, setFocusSiteId] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null)
  const [showLayerControl, setShowLayerControl] = useState(() => {
    // Verifica se c'è una configurazione layer nell'URL
    const params = new URLSearchParams(window.location.search);
    return !!(params.get('basemap') || params.get('overlays'));
  })
  const urlFocusSiteId = searchParams.get('focus')


  // Handle URL focus parameter
  useEffect(() => {
    if (urlFocusSiteId) {
      setFocusSiteId(urlFocusSiteId)
      setSelectedFeature(null) // Clear any previous selection
    } else {
      setFocusSiteId(null) // Clear focus when no URL parameter
    }
  }, [urlFocusSiteId])

  const handleFeatureClick = (feature: any) => {
    setSelectedFeature(feature)
  }

  const handleEditMode = () => {
    if (isAuthenticated) {
      navigate('/edit')
    } else {
      navigate('/login')
    }
  }

  const handleLogout = () => {
    logout()
  }

  const handleSearchSelect = (result: any) => {
    if (result.type === 'site') {
      // POI result - focus on the site
      setFocusSiteId(result.id)
      setMapCenter(null) // Clear manual center
      
      // Also trigger feature click to show info panel
      setTimeout(() => {
        setSelectedFeature({
          properties: {
            id: result.id,
            toponimo: result.toponimo,
            descrizione: result.descrizione,
            stato_validazione: result.stato_validazione
          }
        })
      }, 1000) // Wait for map animation
      
    } else if (result.type === 'address') {
      // Geocode result - center map on coordinates
      setMapCenter([result.lon, result.lat])
      setFocusSiteId(null) // Clear site focus
      setSelectedFeature(null) // Clear feature selection
    }
  }

  return (
    <div className="w-full h-screen flex relative">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="text-xl font-bold">MEMOIR GIS</h1>
          
          <div className="flex items-center gap-2">
            <Button 
              variant={showLayerControl ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowLayerControl(!showLayerControl)}
            >
              <Layers className="w-4 h-4 mr-2" />
              Layer
            </Button>
            
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  Amministratore
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
              <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
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
          mapCenter={mapCenter}
          initialCenter={[16.6, 41.1]}
          initialZoom={8}
        >
          {/* Layer Control Panel */}
          {showLayerControl && (
            <div className="absolute top-20 left-4 z-20">
              <LayerControl 
                className="memoir-panel memoir-scroll max-h-[70vh] overflow-y-auto"
              />
            </div>
          )}
        </SimpleMapCanvas>
        
        {/* Search Box */}
        <div className={`absolute top-20 w-80 z-10 transition-all duration-200 ${
          showLayerControl ? 'left-[21rem]' : 'left-4'
        }`}>
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

    </div>
  )
}