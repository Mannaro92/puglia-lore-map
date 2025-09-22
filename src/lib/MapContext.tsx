import React, { createContext, useContext } from 'react'
import type maplibregl from 'maplibre-gl'

export const MapContext = createContext<maplibregl.Map | null>(null)

export const useMap = () => useContext(MapContext)

export const MapProvider: React.FC<{ 
  map: maplibregl.Map | null
  children: React.ReactNode 
}> = ({ map, children }) => {
  return (
    <MapContext.Provider value={map}>
      {children}
    </MapContext.Provider>
  )
}