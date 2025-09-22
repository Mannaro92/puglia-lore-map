import { useState } from "react";
import { Eye, EyeOff, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { MapState } from "../WebGISLayout";

interface LayerPanelProps {
  mapState: MapState;
  onMapStateChange: (updates: Partial<MapState>) => void;
}

interface LayerCategory {
  name: string;
  layers: LayerItem[];
  defaultOpen?: boolean;
}

interface LayerItem {
  id: string;
  name: string;
  description?: string;
  defaultVisible?: boolean;
  defaultOpacity?: number;
}

const LAYER_CATEGORIES: LayerCategory[] = [
  {
    name: "Dati Progetto",
    defaultOpen: true,
    layers: [
      {
        id: "sites",
        name: "Siti Archeologici",
        description: "Siti archeologici e luoghi del sacro in Puglia",
        defaultVisible: true,
        defaultOpacity: 1.0
      }
    ]
  },
  {
    name: "Cartografia di Base",
    defaultOpen: true,
    layers: [
      {
        id: "province",
        name: "Province",
        description: "Confini amministrativi delle province pugliesi",
        defaultVisible: true,
        defaultOpacity: 0.7
      },
      {
        id: "comuni",
        name: "Comuni",
        description: "Confini comunali",
        defaultVisible: false,
        defaultOpacity: 0.5
      }
    ]
  },
  {
    name: "Vincoli",
    defaultOpen: false,
    layers: [
      {
        id: "vincoli",
        name: "Vincoli Archeologici",
        description: "Aree sottoposte a vincolo archeologico",
        defaultVisible: false,
        defaultOpacity: 0.8
      }
    ]
  },
  {
    name: "Cartografia Storica",
    defaultOpen: false,
    layers: [
      {
        id: "storica",
        name: "Carte Storiche",
        description: "Carte storiche georeferenziate",
        defaultVisible: false,
        defaultOpacity: 0.7
      }
    ]
  }
];

export function LayerPanel({ mapState, onMapStateChange }: LayerPanelProps) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set(LAYER_CATEGORIES.filter(cat => cat.defaultOpen).map(cat => cat.name))
  );

  const toggleCategory = (categoryName: string) => {
    const newOpen = new Set(openCategories);
    if (newOpen.has(categoryName)) {
      newOpen.delete(categoryName);
    } else {
      newOpen.add(categoryName);
    }
    setOpenCategories(newOpen);
  };

  const toggleLayerVisibility = (layerId: string) => {
    const newVisibleLayers = new Set(mapState.visibleLayers);
    if (newVisibleLayers.has(layerId)) {
      newVisibleLayers.delete(layerId);
    } else {
      newVisibleLayers.add(layerId);
    }
    onMapStateChange({ visibleLayers: newVisibleLayers });
  };

  const updateLayerOpacity = (layerId: string, opacity: number) => {
    const newOpacity = new Map(mapState.layerOpacity);
    newOpacity.set(layerId, opacity);
    onMapStateChange({ layerOpacity: newOpacity });
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Gestione Layer</h2>
      </div>

      {LAYER_CATEGORIES.map((category) => (
        <Card key={category.name} className="border-panel-border">
          <Collapsible
            open={openCategories.has(category.name)}
            onOpenChange={() => toggleCategory(category.name)}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-layer-hover transition-colors">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  {category.name}
                  {openCategories.has(category.name) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                {category.layers.map((layer) => {
                  const isVisible = mapState.visibleLayers.has(layer.id);
                  const opacity = mapState.layerOpacity.get(layer.id) || layer.defaultOpacity || 1.0;

                  return (
                    <div key={layer.id} className="space-y-2 p-2 rounded-lg border border-panel-border">
                      {/* Layer header with toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium truncate">{layer.name}</h4>
                          {layer.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {layer.description}
                            </p>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLayerVisibility(layer.id)}
                          className="ml-2 h-8 w-8 p-0"
                        >
                          {isVisible ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4 opacity-50" />
                          )}
                        </Button>
                      </div>

                      {/* Opacity slider */}
                      {isVisible && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Trasparenza</span>
                            <span>{Math.round(opacity * 100)}%</span>
                          </div>
                          <Slider
                            value={[opacity]}
                            onValueChange={([value]) => updateLayerOpacity(layer.id, value)}
                            min={0}
                            max={1}
                            step={0.1}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}

      {/* Layer Legend */}
      <Card className="border-panel-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Legenda</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Siti cristiani</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Siti romani</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-green-600"></div>
            <span>Siti messapici</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(35, 70%, 45%)' }}></div>
            <span>Altri siti</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}