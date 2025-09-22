import { useState } from "react";
import { Search, MapPin, X, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { MapState } from "../WebGISLayout";

interface SearchPanelProps {
  isActive: boolean;
  onToggle: () => void;
  onResults: (results: any[]) => void;
  mapState: MapState;
  onMapStateChange: (updates: Partial<MapState>) => void;
}

export function SearchPanel({ isActive, onToggle, onResults, mapState, onMapStateChange }: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [addressResults, setAddressResults] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Advanced search filters
  const [filters, setFilters] = useState({
    cronologie: [] as string[],
    definizioni: [] as string[],
    indicatori: [] as string[],
    ambiti: [] as string[]
  });

  const searchAddress = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://qdjyzctflpywkblpkniz.supabase.co/functions/v1/geocode?q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      
      if (response.ok) {
        const results = await response.json();
        setAddressResults(results);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectAddress = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    // Update map center and zoom to location
    onMapStateChange({
      center: [lon, lat],
      zoom: 14
    });
    
    setAddressResults([]);
    setSearchQuery(result.display_name);
  };

  if (!isActive) {
    return (
      <div className="absolute top-4 left-4 z-10">
        <Button
          onClick={onToggle}
          variant="secondary"
          size="sm"
          className="shadow-floating"
        >
          <Search className="w-4 h-4 mr-2" />
          Cerca
        </Button>
      </div>
    );
  }

  return (
    <Card className="absolute top-4 left-4 w-80 max-h-[calc(100vh-2rem)] overflow-hidden shadow-floating z-10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Ricerca
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Address Search */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Cerca Indirizzo
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="Inserisci un indirizzo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchAddress()}
            />
            <Button
              onClick={searchAddress}
              disabled={isSearching || !searchQuery.trim()}
              size="sm"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {/* Address Results */}
          {addressResults.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1">
              {addressResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => selectAddress(result)}
                  className="w-full text-left p-2 text-xs hover:bg-muted rounded border"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    <span className="truncate">{result.display_name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Advanced Search Toggle */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Filter className="w-4 h-4 mr-2" />
              Ricerca Avanzata
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-3 mt-3">
            {/* Filter sections would go here */}
            <div className="text-xs text-muted-foreground">
              <p>Filtri per cronologia, definizione, ambito cultuale, ecc.</p>
              <p className="mt-1 italic">Implementazione completa nei prossimi aggiornamenti.</p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}