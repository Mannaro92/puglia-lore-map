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
            variant="outline"
            size="sm" 
            onClick={onToggleLayerControl}
            className={`border-2 border-primary-foreground text-primary-foreground font-medium font-dm-sans hover:bg-secondary hover:text-secondary-foreground hover:border-secondary transition-all duration-200 ${
              showLayerControl ? 'bg-secondary text-secondary-foreground border-secondary' : ''
            }`}
          >
            <Layers className="w-4 h-4 mr-2" />
            Layer
          </Button>
          
          {isAuthenticated ? (
            <>
              <span className="text-sm text-primary-foreground font-dm-sans hidden sm:inline">
                Amministratore
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleEditMode}
                className="border-2 border-primary-foreground text-primary-foreground font-medium font-dm-sans hover:bg-secondary hover:text-secondary-foreground hover:border-secondary transition-all duration-200"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Editor
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="border-2 border-primary-foreground text-primary-foreground font-medium font-dm-sans hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/login')}
              className="border-2 border-primary-foreground text-primary-foreground font-medium font-dm-sans hover:bg-secondary hover:text-secondary-foreground hover:border-secondary transition-all duration-200"
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