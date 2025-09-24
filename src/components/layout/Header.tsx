import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { LogIn, Edit3, LogOut, Layers } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import changesLogo from '@/assets/changes-logo-white.png'

interface HeaderProps {
  showLayerControl: boolean
  onToggleLayerControl: () => void
}

export const Header: React.FC<HeaderProps> = ({ 
  showLayerControl, 
  onToggleLayerControl 
}) => {
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useAuth()

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

  return (
    <header className="absolute top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-primary/60 border-b border-primary">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo e titolo */}
        <div className="flex items-center gap-3">
          <img 
            src={changesLogo} 
            alt="CHANGES Logo" 
            className="h-8 w-auto"
          />
          <div className="flex flex-col">
            <h1 className="text-xl font-bold font-dm-sans text-primary-foreground">
              MEMOIR GIS
            </h1>
            <span className="text-xs text-primary-foreground/80 font-dm-sans">
              powered by CHANGES
            </span>
          </div>
        </div>
        
        {/* Controlli */}
        <div className="flex items-center gap-2">
          <Button 
            variant={showLayerControl ? "changes-secondary" : "outline"} 
            size="sm" 
            onClick={onToggleLayerControl}
            className="text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10"
          >
            <Layers className="w-4 h-4 mr-2" />
            Layer
          </Button>
          
          {isAuthenticated ? (
            <>
              <span className="text-sm text-primary-foreground/80 hidden sm:inline font-dm-sans">
                Amministratore
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleEditMode}
                className="text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Editor
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/login')}
              className="text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}