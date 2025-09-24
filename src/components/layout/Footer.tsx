import React from 'react'
import changesLogoWhite from '@/assets/changes-logo-white.png'

export const Footer: React.FC = () => {
  return (
    <footer className="absolute bottom-0 left-0 right-0 z-40 bg-secondary/95 backdrop-blur supports-[backdrop-filter]:bg-secondary/60 border-t border-secondary">
      <div className="container flex h-12 items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={changesLogoWhite} 
            alt="CHANGES Logo" 
            className="h-6 w-auto"
          />
          <div className="text-sm text-secondary-foreground font-dm-sans">
            © 2024 CHANGES Research Project
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-secondary-foreground/80 font-dm-sans">
          <span>Archaeological WebGIS</span>
          <span>|</span>
          <span>MEMOIR GIS v1.0</span>
        </div>
      </div>
    </footer>
  )
}