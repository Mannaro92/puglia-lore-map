/**
 * MEMOIR GIS - Controllo Layer Basemap/Overlay
 * Interfaccia utente per selezionare basemap e overlay OSM
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Layers, 
  MapPin, 
  Eye, 
  EyeOff, 
  Key,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMap } from '@/lib/MapContext';
import { 
  getBasemapProviders, 
  getOverlayProviders, 
  TileProvider,
  DEFAULT_BASEMAP
} from '@/lib/map/tiles-providers';
import { 
  LayerState,
  getInitialLayerState,
  debouncePersistence,
  generateShareUrl
} from '@/lib/map/url-persistence';
import { 
  setBasemap, 
  toggleOverlay, 
  updateLayerOpacity,
  getActiveLayersState
} from '@/lib/map/add-tiles';

interface LayerControlProps {
  className?: string;
}

export const LayerControl: React.FC<LayerControlProps> = ({ 
  className = '' 
}) => {
  const map = useMap();
  const { toast } = useToast();
  const [layerState, setLayerState] = useState<LayerState>(() => 
    getInitialLayerState(DEFAULT_BASEMAP)
  );
  const [isInitialized, setIsInitialized] = useState(false);

  // Inizializza layer state dalla mappa quando è pronta
  useEffect(() => {
    if (!map || isInitialized) return;

    // Applica stato iniziale alla mappa
    const initMap = () => {
      try {
        // Imposta basemap iniziale
        if (layerState.basemap) {
          const success = setBasemap(map, layerState.basemap);
        }
        
        // Attiva overlay iniziali
        layerState.overlays.forEach(overlayId => {
          const opacity = layerState.opacities[overlayId] || 0.7;
          const success = toggleOverlay(map, overlayId, true, opacity);
        });
        
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Errore inizializzando layer control:', error);
      }
    };

    // Assicurati che la mappa sia completamente caricata
    if (map.loaded() && map.isStyleLoaded()) {
      initMap();
    } else {
      const handleLoad = () => {
        if (map.loaded() && map.isStyleLoaded()) {
          map.off('styledata', handleLoad);
          map.off('load', handleLoad);
          initMap();
        }
      };
      
      map.on('load', handleLoad);
      map.on('styledata', handleLoad);
      
      return () => {
        map.off('load', handleLoad);
        map.off('styledata', handleLoad);
      };
    }
  }, [map, layerState, isInitialized]);

  // Sincronizza state con URL e localStorage
  const persistState = useCallback((newState: LayerState) => {
    setLayerState(newState);
    debouncePersistence(newState);
  }, []);

  // Handler per cambio basemap
  const handleBasemapChange = useCallback((basemapId: string) => {
    if (!map) {
      return;
    }
    
    // Fallback se basemap non esiste più (es. tracestrack-topo rimosso)
    const provider = getBasemapProviders().find(p => p.id === basemapId);
    if (!provider) {
      basemapId = DEFAULT_BASEMAP;
    }
    
    try {
      const success = setBasemap(map, basemapId);
      if (success) {
        const newState = { ...layerState, basemap: basemapId };
        persistState(newState);
      }
    } catch (error) {
      console.error('Errore cambiando basemap:', error);
      toast({
        title: "Errore",
        description: "Impossibile cambiare la mappa di base. Riprovare.",
        variant: "destructive"
      });
    }
  }, [map, layerState, persistState, toast]);

  // Handler per toggle overlay
  const handleOverlayToggle = useCallback((overlayId: string, enabled: boolean) => {
    if (!map) return;
    
    const opacity = layerState.opacities[overlayId] || 0.7;
    const success = toggleOverlay(map, overlayId, enabled, opacity);
    
    if (success) {
      const newOverlays = enabled 
        ? [...layerState.overlays, overlayId]
        : layerState.overlays.filter(id => id !== overlayId);
      
      const newState = { ...layerState, overlays: newOverlays };
      persistState(newState);
    }
  }, [map, layerState, persistState]);

  // Handler per cambio opacità
  const handleOpacityChange = useCallback((layerId: string, opacity: number) => {
    if (!map) return;
    
    const opacityValue = opacity / 100; // Convert da 0-100 a 0-1
    updateLayerOpacity(map, layerId, opacityValue);
    
    const newState = {
      ...layerState,
      opacities: { ...layerState.opacities, [layerId]: opacityValue }
    };
    persistState(newState);
  }, [map, layerState, persistState]);

  // Componente per provider non disponibile
  const DisabledProvider: React.FC<{ provider: TileProvider }> = ({ provider }) => (
    <div className="flex items-center justify-between p-3 bg-muted rounded-lg opacity-60">
      <div className="flex items-center gap-2">
        <Key className="h-4 w-4 text-muted-foreground" />
        <div>
          <div className="font-medium text-sm">{provider.name}</div>
          <div className="text-xs text-muted-foreground">Richiede API key</div>
        </div>
      </div>
      <Badge variant="outline" className="text-xs">
        {provider.keyEnv}
      </Badge>
    </div>
  );

  // Componente per controllo basemap
  const BasemapControl: React.FC<{ provider: TileProvider }> = ({ provider }) => {
    const isActive = layerState.basemap === provider.id;
    
    if (provider.enabled === false) {
      return <DisabledProvider provider={provider} />;
    }
    
    // Indicatore qualità zoom per basemap con limiti specifici
    const hasZoomLimit = provider.effectiveMaxZoom && provider.effectiveMaxZoom < 18;
    
    return (
      <Button
        variant={isActive ? "default" : "outline"}
        size="sm"
        className="w-full justify-start text-left h-auto p-3"
        onClick={() => handleBasemapChange(provider.id)}
        title={provider.description}
        aria-label={`${provider.name}. ${provider.description}`}
      >
         <div className="layer-card grid grid-cols-[24px_minmax(0,1fr)_auto] gap-2 w-full items-start">
          <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="text-wrap min-w-0 flex-1">
            <div className="font-semibold text-sm leading-tight break-words hyphens-auto mb-1 flex items-center gap-2">
              <span className="break-words hyphens-auto">{provider.name}</span>
              {hasZoomLimit && (
                <Badge variant="outline" className="text-xs px-1 py-0 shrink-0 truncate max-w-[80px]" title={`Max Zoom ${provider.effectiveMaxZoom}`}>
                  Max Z{provider.effectiveMaxZoom}
                </Badge>
              )}
            </div>
            {provider.description && (
              <div 
                className="text-sm text-muted-foreground leading-5 overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] xl:[-webkit-line-clamp:3] break-words hyphens-auto"
                title={provider.description}
                aria-label={provider.description}
              >
                {provider.description}
              </div>
            )}
          </div>
          <div className="shrink-0 mt-0.5">
            {isActive && <Eye className="h-4 w-4" />}
          </div>
        </div>
      </Button>
    );
  };

  // Componente per controllo overlay
  const OverlayControl: React.FC<{ provider: TileProvider }> = ({ provider }) => {
    const isActive = layerState.overlays.includes(provider.id);
    const opacity = (layerState.opacities[provider.id] || 0.7) * 100;
    
    if (provider.enabled === false) {
      return <DisabledProvider provider={provider} />;
    }
    
    return (
      <div className="space-y-3 p-3 border rounded-lg layer-card">
        <div className="grid grid-cols-[minmax(0,1fr)_24px] gap-2 items-start">
          <div className="flex items-start gap-3 min-w-0">
            <Switch
              checked={isActive}
              onCheckedChange={(checked) => handleOverlayToggle(provider.id, checked)}
              className="shrink-0 mt-1"
            />
            <div className="min-w-0 flex-1" title={provider.description}>
              <div className="font-semibold text-sm leading-tight break-words hyphens-auto mb-1">{provider.name}</div>
              {provider.description && (
                <div 
                  className="text-sm text-muted-foreground leading-5 overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] xl:[-webkit-line-clamp:3] break-words hyphens-auto"
                  title={provider.description}
                  aria-label={provider.description}
                >
                  {provider.description}
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0 mt-1">
            {isActive ? (
              <Eye className="h-4 w-4 text-primary" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
        
        {isActive && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Opacità</span>
              <span>{Math.round(opacity)}%</span>
            </div>
            <Slider
              value={[opacity]}
              onValueChange={([value]) => handleOpacityChange(provider.id, value)}
              max={100}
              min={10}
              step={5}
              className="w-full"
            />
          </div>
        )}
      </div>
    );
  };

  // Componente per attribution
  const AttributionInfo = () => {
    const activeProviders = [
      ...getBasemapProviders().filter(p => p.id === layerState.basemap),
      ...getOverlayProviders().filter(p => layerState.overlays.includes(p.id))
    ];

    if (activeProviders.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Attribution</span>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          {activeProviders.map(provider => (
            <div key={provider.id} dangerouslySetInnerHTML={{ __html: provider.attribution }} />
          ))}
        </div>
      </div>
    );
  };

  const basemapProviders = getBasemapProviders();
  const overlayProviders = getOverlayProviders();

  return (
    <Card className={`layer-panel w-96 max-w-full min-w-0 overflow-x-hidden ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Livelli Mappa
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 overflow-x-hidden min-w-0">
        <div className="space-y-3 min-w-0">
          <div className="text-sm text-muted-foreground mb-3">
            Seleziona una mappa di base (solo una attiva):
          </div>
          <div className="layer-list space-y-2 overflow-x-hidden min-w-0">
            {basemapProviders.map(provider => (
              <BasemapControl key={provider.id} provider={provider} />
            ))}
          </div>
        </div>
        
        <Separator />
        
        {/* Attribution */}
        <AttributionInfo />
      </CardContent>
    </Card>
  );
};

export default LayerControl;