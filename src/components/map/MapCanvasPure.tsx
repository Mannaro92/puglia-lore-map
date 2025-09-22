import React, { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';

// Pure OSM test component - minimal dependencies
export const MapCanvasPure = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) {
      console.error('❌ Pure OSM test: no container');
      return;
    }

    console.log('🧪 Pure OSM test: creating minimal map...');
    
    const pureOSMStyle = {
      version: 8 as const,
      glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      sources: {
        osm: {
          type: "raster" as const,
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors"
        }
      },
      layers: [{ 
        id: "osm", 
        type: "raster" as const, 
        source: "osm" 
      }]
    };

    // Debug before creation
    console.log('🔍 Pure OSM Style check:', {
      version: pureOSMStyle.version,
      sources: Object.keys(pureOSMStyle.sources),
      layers: pureOSMStyle.layers.map(l => l.id)
    });

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: pureOSMStyle,
      center: [16.7, 41.1], // Puglia
      zoom: 7
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      console.log('✅ Pure OSM test: map loaded successfully!');
      console.log('📊 Sources loaded:', Object.keys((map.getStyle() as any).sources || {}));
      
      // Force resize
      setTimeout(() => {
        map.resize();
        console.log('🔄 Pure OSM test: map resized');
      }, 100);
    });

    map.on('error', (e) => {
      console.error('❌ Pure OSM test error:', e?.error || e);
    });

    // Network diagnostics
    map.on('sourcedata', (e) => {
      if (e.sourceId === 'osm' && e.isSourceLoaded) {
        console.log('🌐 OSM tiles loading...');
      }
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-gray-100">
      <div 
        ref={mapContainer} 
        className="absolute inset-0"
        role="application"
        aria-label="Pure OSM Test Map"
      />
      <div className="absolute top-4 left-4 bg-white/90 p-2 rounded text-xs">
        Pure OSM Test - Check console for logs
      </div>
    </div>
  );
};