import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

export const MapCanvasTest = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    console.log('🧪 Testing minimal OSM map...');
    
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [{ 
          id: 'osm', 
          type: 'raster', 
          source: 'osm' 
        }]
      },
      center: [16.7, 41.1], // Puglia
      zoom: 7
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Log per debugging
    map.on('load', () => {
      console.log('✅ OSM test map loaded successfully');
      console.log('📊 Style:', map.getStyle());
      console.log('📊 Sources:', Object.keys((map.getStyle() as any).sources || {}));
    });

    map.on('error', (e) => {
      console.error('❌ OSM test map error:', e?.error || e);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div 
      ref={mapContainer} 
      className="absolute inset-0"
      role="application"
      aria-label="Test mappa OSM"
    />
  );
};