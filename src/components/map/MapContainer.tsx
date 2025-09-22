import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { MapState } from "../WebGISLayout";

interface MapContainerProps {
  mapState: MapState;
  onMapStateChange: (updates: Partial<MapState>) => void;
  onFeatureClick: (feature: any) => void;
}

export function MapContainer({ mapState, onMapStateChange, onFeatureClick }: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm'
          }
        ]
      },
      center: mapState.center,
      zoom: mapState.zoom,
      attributionControl: false
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    
    // Add scale control
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    // Add attribution
    map.current.addControl(new maplibregl.AttributionControl({
      customAttribution: 'MEMOIR GIS | Università degli Studi di Bari'
    }), 'bottom-right');

    // Map event handlers
    map.current.on('moveend', () => {
      if (map.current) {
        const center = map.current.getCenter();
        const zoom = map.current.getZoom();
        onMapStateChange({
          center: [center.lng, center.lat],
          zoom
        });
      }
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Add vector tile sources
      map.current.addSource('sites', {
        type: 'vector',
        tiles: [`https://qdjyzctflpywkblpkniz.supabase.co/functions/v1/tiles/{z}/{x}/{y}.mvt?layer=sites`]
      });

      map.current.addSource('province', {
        type: 'vector', 
        tiles: [`https://qdjyzctflpywkblpkniz.supabase.co/functions/v1/tiles/{z}/{x}/{y}.mvt?layer=province`]
      });

      map.current.addSource('comuni', {
        type: 'vector',
        tiles: [`https://qdjyzctflpywkblpkniz.supabase.co/functions/v1/tiles/{z}/{x}/{y}.mvt?layer=comuni`]
      });

      // Add site layers
      map.current.addLayer({
        id: 'sites-circles',
        type: 'circle',
        source: 'sites',
        'source-layer': 'sites',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 4,
            12, 8,
            16, 12
          ],
          'circle-color': [
            'case',
            ['in', 'cristiano', ['get', 'ambiti']],
            'hsl(200, 80%, 50%)', // Blue for Christian
            ['in', 'romano', ['get', 'ambiti']],
            'hsl(0, 80%, 50%)', // Red for Roman
            ['in', 'messapico', ['get', 'ambiti']],
            'hsl(120, 60%, 40%)', // Green for Messapic
            'hsl(35, 70%, 45%)' // Default archaeological brown
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.8
        }
      });

      map.current.addLayer({
        id: 'sites-labels',
        type: 'symbol',
        source: 'sites',
        'source-layer': 'sites',
        layout: {
          'text-field': ['get', 'toponimo'],
          'text-font': ['Open Sans Regular'],
          'text-size': 12,
          'text-offset': [0, 1.5],
          'text-anchor': 'top'
        },
        paint: {
          'text-color': '#333',
          'text-halo-color': '#fff',
          'text-halo-width': 1
        },
        minzoom: 10
      });

      // Add province boundaries
      map.current.addLayer({
        id: 'province-boundaries',
        type: 'line',
        source: 'province',
        'source-layer': 'province',
        paint: {
          'line-color': 'hsl(220, 20%, 40%)',
          'line-width': 2,
          'line-opacity': 0.7
        }
      });

      map.current.addLayer({
        id: 'province-labels',
        type: 'symbol',
        source: 'province',
        'source-layer': 'province',
        layout: {
          'text-field': ['get', 'nome'],
          'text-font': ['Open Sans Bold'],
          'text-size': 14
        },
        paint: {
          'text-color': '#444',
          'text-halo-color': '#fff',
          'text-halo-width': 2
        },
        maxzoom: 10
      });

      // Add comuni boundaries (hidden by default)
      map.current.addLayer({
        id: 'comuni-boundaries',
        type: 'line',
        source: 'comuni',
        'source-layer': 'comuni',
        paint: {
          'line-color': 'hsl(220, 20%, 60%)',
          'line-width': 1,
          'line-opacity': 0.5
        },
        layout: {
          visibility: 'none'
        }
      });

      // Click handler for sites
      map.current.on('click', 'sites-circles', (e) => {
        if (e.features && e.features[0]) {
          onFeatureClick(e.features[0]);
        }
      });

      // Change cursor on hover
      map.current.on('mouseenter', 'sites-circles', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });

      map.current.on('mouseleave', 'sites-circles', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
        }
      });
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Update layer visibility and opacity when mapState changes
  useEffect(() => {
    if (!map.current) return;

    // Update layer visibility
    mapState.visibleLayers.forEach(layerId => {
      const layers = getLayersForId(layerId);
      layers.forEach(layer => {
        if (map.current?.getLayer(layer)) {
          map.current.setLayoutProperty(layer, 'visibility', 'visible');
        }
      });
    });

    // Hide non-visible layers
    ['sites', 'province', 'comuni'].forEach(layerId => {
      if (!mapState.visibleLayers.has(layerId)) {
        const layers = getLayersForId(layerId);
        layers.forEach(layer => {
          if (map.current?.getLayer(layer)) {
            map.current.setLayoutProperty(layer, 'visibility', 'none');
          }
        });
      }
    });

    // Update layer opacity
    mapState.layerOpacity.forEach((opacity, layerId) => {
      const layers = getLayersForId(layerId);
      layers.forEach(layer => {
        if (map.current?.getLayer(layer)) {
          const layerType = map.current.getLayer(layer)?.type;
          if (layerType === 'circle') {
            map.current.setPaintProperty(layer, 'circle-opacity', opacity * 0.8);
          } else if (layerType === 'line') {
            map.current.setPaintProperty(layer, 'line-opacity', opacity);
          } else if (layerType === 'symbol') {
            map.current.setPaintProperty(layer, 'text-opacity', opacity);
          }
        }
      });
    });
  }, [mapState.visibleLayers, mapState.layerOpacity]);

  // Helper function to get MapLibre layer IDs from logical layer ID
  function getLayersForId(layerId: string): string[] {
    switch (layerId) {
      case 'sites':
        return ['sites-circles', 'sites-labels'];
      case 'province':
        return ['province-boundaries', 'province-labels'];
      case 'comuni':
        return ['comuni-boundaries'];
      default:
        return [];
    }
  }

  // Removed automatic map synchronization to prevent unwanted movement

  return (
    <div 
      ref={mapContainer} 
      className="w-full h-full bg-map-bg"
      style={{ minHeight: '100vh' }}
    />
  );
}