import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Layers, Info } from 'lucide-react'
import { LayerOpacity } from '@/lib/mapStyle'
import { Legend } from './Legend'
import { AdvancedFilters } from './AdvancedFilters'
import { useMap } from '@/lib/MapContext'

interface LayerConfig {
  id: keyof LayerOpacity | 'sites' | 'province' | 'comuni'
  name: string
  description: string
  visible: boolean
  opacity: number
}

interface LayerPanelProps {
  activeTab: 'layers' | 'info'
  onTabChange: (tab: 'layers' | 'info') => void
  layerVisibility: Record<string, boolean>
  layerOpacity: LayerOpacity
  onLayerToggle: (layerId: string) => void
  onOpacityChange: (layerId: keyof LayerOpacity, opacity: number) => void
  onFiltersChange: (filters: any) => void
  selectedFeature?: any
  onFeatureClose?: () => void
  vocabularies?: {
    definizioni: any[]
    cronologie: any[]
    indicatori: any[]
    ambiti: any[]
  }
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  activeTab,
  onTabChange,
  layerVisibility,
  layerOpacity,
  onLayerToggle,
  onOpacityChange,
  onFiltersChange,
  selectedFeature,
  onFeatureClose,
  vocabularies
}) => {
  const map = useMap()
  const [layerConfigs, setLayerConfigs] = useState<LayerConfig[]>([
    {
      id: 'sites',
      name: 'Siti Archeologici',
      description: 'Siti archeologici e luoghi del sacro (MEMOIR)',
      visible: layerVisibility.sites ?? true,
      opacity: layerOpacity.sites ?? 0.6
    },
    {
      id: 'province',
      name: 'Province',
      description: 'Confini amministrativi delle province',
      visible: layerVisibility.province ?? true,
      opacity: layerOpacity.province ?? 0.7
    },
    {
      id: 'comuni',
      name: 'Comuni',
      description: 'Confini amministrativi dei comuni',
      visible: layerVisibility.comuni ?? true,
      opacity: layerOpacity.comuni ?? 0.5
    }
  ])

  // Sync with external state
  useEffect(() => {
    setLayerConfigs(prev => prev.map(config => ({
      ...config,
      visible: layerVisibility[config.id] ?? config.visible,
      opacity: layerOpacity[config.id as keyof LayerOpacity] ?? config.opacity
    })))
  }, [layerVisibility, layerOpacity])

  const handleVisibilityChange = useCallback((layerId: string, visible: boolean) => {
    if (!map) return
    
    // Get the layer IDs for this layer group
    const getLayerIds = (layer: string): string[] => {
      switch (layer) {
        case 'sites':
          return ['sites-fill', 'sites-outline', 'sites-points', 'sites-highlight']
        case 'province':
          return ['province-fill', 'province-line']
        case 'comuni':
          return ['comuni-line']
        default:
          return []
      }
    }
    
    // Toggle visibility for all layers in the group
    const layerIds = getLayerIds(layerId)
    layerIds.forEach(id => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
      }
    })
    
    setLayerConfigs(prev => prev.map(config => 
      config.id === layerId ? { ...config, visible } : config
    ))
    onLayerToggle(layerId)
  }, [map, onLayerToggle])

  const handleOpacityChange = useCallback((layerId: keyof LayerOpacity, opacity: number) => {
    if (!map) return
    
    const opacityValue = opacity / 100 // Convert from 0-100 to 0-1
    
    // Apply opacity changes directly to map layers
    switch (layerId) {
      case 'sites':
        if (map.getLayer('sites-fill')) {
          map.setPaintProperty('sites-fill', 'fill-opacity', [
            'case',
            ['==', ['get', 'ubicazione_confidenza'], 'incerta'],
            opacityValue * 0.35,
            opacityValue * 0.6
          ])
        }
        if (map.getLayer('sites-outline')) {
          map.setPaintProperty('sites-outline', 'line-opacity', opacityValue)
        }
        if (map.getLayer('sites-points')) {
          map.setPaintProperty('sites-points', 'circle-opacity', [
            'case',
            ['==', ['get', 'ubicazione_confidenza'], 'incerta'],
            opacityValue * 0.35,
            opacityValue
          ])
        }
        break
        
      case 'province':
        if (map.getLayer('province-line')) {
          map.setPaintProperty('province-line', 'line-opacity', opacityValue)
        }
        if (map.getLayer('province-fill')) {
          map.setPaintProperty('province-fill', 'fill-opacity', opacityValue * 0.3)
        }
        break
        
      case 'comuni':
        if (map.getLayer('comuni-line')) {
          map.setPaintProperty('comuni-line', 'line-opacity', opacityValue)
        }
        break
    }
    
    setLayerConfigs(prev => prev.map(config => 
      config.id === layerId ? { ...config, opacity: opacityValue } : config
    ))
    onOpacityChange(layerId, opacityValue)
  }, [map, onOpacityChange])

  const LayerControls = () => (
    <div className="space-y-6">
      {/* Dati Progetto */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-foreground">Dati Progetto</h3>
        <div className="space-y-4">
          {layerConfigs
            .filter(config => config.id === 'sites')
            .map(config => (
              <LayerControl
                key={config.id}
                config={config}
                onVisibilityChange={handleVisibilityChange}
                onOpacityChange={handleOpacityChange}
              />
            ))}
        </div>
      </div>

      {/* Cartografia di Base */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-foreground">Cartografia di Base</h3>
        <div className="space-y-4">
          {layerConfigs
            .filter(config => config.id !== 'sites')
            .map(config => (
              <LayerControl
                key={config.id}
                config={config}
                onVisibilityChange={handleVisibilityChange}
                onOpacityChange={handleOpacityChange}
              />
            ))}
        </div>
      </div>

      {/* Advanced Filters */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="filters">
          <AccordionTrigger className="text-sm font-semibold">
            Filtri Avanzati
          </AccordionTrigger>
          <AccordionContent>
            <AdvancedFilters
              vocabularies={vocabularies}
              onFiltersChange={onFiltersChange}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Legend */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-foreground">Legenda</h3>
        <Legend />
      </div>
    </div>
  )

  const FeatureInfo = () => {
    if (!selectedFeature) {
      return (
        <div className="flex items-center justify-center h-64 text-center">
          <div>
            <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              Clicca su un sito nella mappa per visualizzare le informazioni
            </p>
          </div>
        </div>
      )
    }

    const props = selectedFeature.properties || {}
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{props.toponimo || 'Sito senza nome'}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onFeatureClose}
            aria-label="Chiudi pannello informazioni"
          >
            ×
          </Button>
        </div>
        
        <div className="space-y-3 text-sm">
          {props.descrizione && (
            <div>
              <strong>Descrizione:</strong>
              <p className="mt-1 text-muted-foreground">{props.descrizione}</p>
            </div>
          )}
          
          {props.comune && (
            <div>
              <strong>Comune:</strong> {props.comune}
            </div>
          )}
          
          {props.provincia && (
            <div>
              <strong>Provincia:</strong> {props.provincia}
            </div>
          )}
          
          {props.definizioni && (
            <div>
              <strong>Definizioni:</strong>
              <div className="flex flex-wrap gap-1 mt-1">
                {props.definizioni.split(',').map((def: string, i: number) => (
                  <span key={i} className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                    {def.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {props.cronologie && (
            <div>
              <strong>Cronologie:</strong>
              <div className="flex flex-wrap gap-1 mt-1">
                {props.cronologie.split(',').map((cron: string, i: number) => (
                  <span key={i} className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                    {cron.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {props.fonte && (
            <div>
              <strong>Fonte:</strong>
              <p className="text-muted-foreground">{props.fonte}</p>
            </div>
          )}
          
          {props.licenza && (
            <div>
              <strong>Licenza:</strong>
              <p className="text-muted-foreground">{props.licenza}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className="w-80 h-full memoir-panel memoir-scroll">
      <Tabs value={activeTab} onValueChange={onTabChange as any} className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="layers" className="text-xs">
              <Layers className="h-3 w-3 mr-1" />
              Layer
            </TabsTrigger>
            <TabsTrigger 
              value="info" 
              className="text-xs"
              disabled={!selectedFeature}
            >
              <Info className="h-3 w-3 mr-1" />
              Info Sito
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-auto memoir-scroll">
          <TabsContent value="layers" className="mt-0">
            <LayerControls />
          </TabsContent>
          
          <TabsContent value="info" className="mt-0">
            <FeatureInfo />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}

interface LayerControlProps {
  config: LayerConfig
  onVisibilityChange: (layerId: string, visible: boolean) => void
  onOpacityChange: (layerId: keyof LayerOpacity, opacity: number) => void
}

const LayerControl: React.FC<LayerControlProps> = ({
  config,
  onVisibilityChange,
  onOpacityChange
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            checked={config.visible}
            onCheckedChange={(checked) => onVisibilityChange(config.id, checked)}
            aria-label={`Toggle ${config.name}`}
          />
          <div>
            <div className="font-medium text-sm">{config.name}</div>
            <div className="text-xs text-muted-foreground">{config.description}</div>
          </div>
        </div>
        
        {config.visible ? (
          <Eye className="h-4 w-4 text-muted-foreground" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      
      {config.visible && config.id in { sites: true, province: true, comuni: true } && (
        <div className="ml-6">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground w-16">Trasparenza</span>
            <Slider
              value={[config.opacity * 100]}
              onValueChange={([value]) => onOpacityChange(config.id as keyof LayerOpacity, value)}
              max={100}
              min={10}
              step={5}
              className="flex-1"
              aria-label={`Trasparenza ${config.name}`}
            />
            <span className="text-xs text-muted-foreground w-8">
              {Math.round(config.opacity * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}