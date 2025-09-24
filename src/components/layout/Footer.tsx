import React from 'react'
import changesLogoWhite from '@/assets/changes-logo-white.png'

export const Footer: React.FC = () => {
  return (
    <footer className="absolute bottom-0 left-0 right-0 z-40 bg-secondary border-t border-secondary/30">
      <div className="container flex h-12 items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-secondary-foreground font-dm-sans">
          <span>© 2024 CHANGES Research Project</span>
        </div>
        
        <div className="flex items-center gap-3 text-sm text-secondary-foreground font-dm-sans">
          <span>Archaeological WebGIS</span>
          <span className="text-secondary-foreground/60">|</span>
          <span>MEMOIR GIS v1.0</span>
        </div>
      </div>
    </footer>
  )
}