import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MapContainer } from "./map/MapContainer";
import { LayerPanel } from "./panels/LayerPanel";
import { SearchPanel } from "./panels/SearchPanel";
import { FeatureInfoPanel } from "./panels/FeatureInfoPanel";
import { WebGISToolbar } from "./toolbar/WebGISToolbar";
import { WelcomeTour } from "./tour/WelcomeTour";

export interface MapState {
  center: [number, number];
  zoom: number;
  selectedFeature: any | null;
  visibleLayers: Set<string>;
  layerOpacity: Map<string, number>;
  searchResults: any[];
}

export function WebGISLayout() {
  const [mapState, setMapState] = useState<MapState>({
    center: [16.8, 41.1], // Puglia center
    zoom: 8,
    selectedFeature: null,
    visibleLayers: new Set(['sites']),
    layerOpacity: new Map([
      ['sites', 1.0],
      ['province', 0.7],
      ['comuni', 0.5],
    ]),
    searchResults: [],
  });

  const [showWelcomeTour, setShowWelcomeTour] = useState(true);
  const [activePanel, setActivePanel] = useState<'layers' | 'search' | 'feature' | null>('layers');

  const updateMapState = (updates: Partial<MapState>) => {
    setMapState(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-background">
      <SidebarProvider>
        <div className="flex h-full w-full">
          {/* Main Map Container */}
          <div className="flex-1 relative">
            <MapContainer 
              mapState={mapState}
              onMapStateChange={updateMapState}
              onFeatureClick={(feature) => {
                updateMapState({ selectedFeature: feature });
                setActivePanel('feature');
              }}
            />
            
            {/* Floating Toolbar */}
            <WebGISToolbar 
              mapState={mapState}
              onMapStateChange={updateMapState}
            />
            
            {/* Search Panel - Top Left */}
            <SearchPanel 
              isActive={activePanel === 'search'}
              onToggle={() => setActivePanel(activePanel === 'search' ? null : 'search')}
              onResults={(results) => updateMapState({ searchResults: results })}
              mapState={mapState}
              onMapStateChange={updateMapState}
            />
          </div>

          {/* Right Sidebar */}
          <div className="w-80 h-full border-l border-border bg-panel-bg flex flex-col">
            {/* Panel Tabs */}
            <div className="flex border-b border-panel-border">
              <button
                onClick={() => setActivePanel(activePanel === 'layers' ? null : 'layers')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activePanel === 'layers' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-layer-hover'
                }`}
              >
                Layer
              </button>
              <button
                onClick={() => setActivePanel(activePanel === 'feature' ? null : 'feature')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activePanel === 'feature' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-layer-hover'
                }`}
                disabled={!mapState.selectedFeature}
              >
                Info Sito
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-hidden">
              {activePanel === 'layers' && (
                <LayerPanel 
                  mapState={mapState}
                  onMapStateChange={updateMapState}
                />
              )}
              
              {activePanel === 'feature' && mapState.selectedFeature && (
                <FeatureInfoPanel 
                  feature={mapState.selectedFeature}
                  onClose={() => {
                    updateMapState({ selectedFeature: null });
                    setActivePanel('layers');
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Welcome Tour */}
        {showWelcomeTour && (
          <WelcomeTour onComplete={() => setShowWelcomeTour(false)} />
        )}
      </SidebarProvider>
    </div>
  );
}