import { useState } from "react";
import { 
  Ruler, 
  Download, 
  Share2, 
  Printer, 
  Locate, 
  ZoomIn,
  ZoomOut,
  Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { MapState } from "../WebGISLayout";

interface WebGISToolbarProps {
  mapState: MapState;
  onMapStateChange: (updates: Partial<MapState>) => void;
}

export function WebGISToolbar({ mapState, onMapStateChange }: WebGISToolbarProps) {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const handleToolClick = (tool: string) => {
    if (activeTool === tool) {
      setActiveTool(null);
    } else {
      setActiveTool(tool);
    }
  };

  const zoomIn = () => {
    onMapStateChange({ zoom: Math.min(mapState.zoom + 1, 18) });
  };

  const zoomOut = () => {
    onMapStateChange({ zoom: Math.max(mapState.zoom - 1, 2) });
  };

  const goHome = () => {
    onMapStateChange({
      center: [16.8, 41.1], // Puglia center
      zoom: 8
    });
  };

  const shareMap = async () => {
    const url = new URL(window.location.origin);
    url.searchParams.set('cx', mapState.center[0].toString());
    url.searchParams.set('cy', mapState.center[1].toString());
    url.searchParams.set('xz', mapState.zoom.toString());
    
    try {
      await navigator.share({
        title: 'MEMOIR GIS - Mappa Archeologica',
        url: url.toString()
      });
    } catch (error) {
      // Fallback to clipboard
      navigator.clipboard.writeText(url.toString());
    }
  };

  return (
    <TooltipProvider>
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
        <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-border rounded-lg shadow-floating p-1">
          
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 pr-2 border-r border-border">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={zoomIn}
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={zoomOut}
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goHome}
                  className="h-8 w-8 p-0"
                >
                  <Home className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Vista Puglia</TooltipContent>
            </Tooltip>
          </div>

          {/* Measurement Tool */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === 'measure' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleToolClick('measure')}
                className="h-8 w-8 p-0"
              >
                <Ruler className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Misura Distanza</TooltipContent>
          </Tooltip>

          {/* Geolocation */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((position) => {
                      onMapStateChange({
                        center: [position.coords.longitude, position.coords.latitude],
                        zoom: 14
                      });
                    });
                  }
                }}
                className="h-8 w-8 p-0"
              >
                <Locate className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Localizzami</TooltipContent>
          </Tooltip>

          {/* Divider */}
          <div className="w-px h-6 bg-border mx-1" />

          {/* Export Tools */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.print()}
                className="h-8 w-8 p-0"
              >
                <Printer className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Stampa Mappa</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Export functionality would be implemented here
                  console.log('Export data');
                }}
                className="h-8 w-8 p-0"
              >
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Esporta Dati</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={shareMap}
                className="h-8 w-8 p-0"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Condividi Mappa</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}