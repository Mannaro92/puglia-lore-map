import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ExternalLink, MapPin, Clock, Tag, Book, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PoiMedia, type PoiMediaItem } from "./PoiMedia";

// Normalizza l'ID del sito dal feature
function getSiteIdFromFeature(f: any): string | null {
  const cand = [
    f?.properties?.site_id,
    f?.properties?.id,
    f?.id,
    f?.properties?.uuid,
  ].find(Boolean);
  if (!cand) return null;
  // pulizia/validazione uuid (stringa)
  const s = String(cand).trim();
  const uuidRe = /^[0-9a-fA-F-]{32,36}$/;
  return uuidRe.test(s.replace(/-/g,'')) ? s : null;
}

interface MediaItem {
  id: string;
  storage_path: string;
  titolo?: string;
  didascalia?: string;
  crediti?: string;
  licenza?: string;
  ordine: number;
  publicUrl?: string;
}

interface FeatureInfoPanelProps {
  feature: any;
  onClose: () => void;
}

export function FeatureInfoPanel({ feature, onClose }: FeatureInfoPanelProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const properties = feature.properties || {};
  const [media, setMedia] = useState<PoiMediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean>(false);

  // Load media for this site
  useEffect(() => {
    async function loadSiteMedia() {
      // 1. Normalizza l'ID del POI
      const siteId = getSiteIdFromFeature(feature);
      console.log('[POI click] feature=', feature, '→ siteId=', siteId);
      
      if (!siteId) {
        console.warn('Nessun siteId valido nel feature');
        return;
      }

      // Check auth status
      const { data: user } = await supabase.auth.getUser();
      const isLoggedIn = !!user?.user?.id;
      setIsUserLoggedIn(isLoggedIn);
      console.log('[auth]', isLoggedIn ? 'logged' : 'anon');

      setLoadingMedia(true);
      console.log('[media fetch params]', { siteId });

      try {
        // 2. Fetch media dal DB
        const { data: mediaRows, error } = await supabase
          .from('media')
          .select('id, storage_path, tipo, titolo, didascalia, crediti, licenza, ordine')
          .eq('site_id', siteId)
          .order('ordine', { ascending: true })
          .order('created_at', { ascending: true });

        console.log('[mediaRows]', mediaRows);
        
        if (error) {
          console.error('Error loading media:', error);
          return;
        }

        // 3. Genera URL pubblici dal bucket corretto
        const urls: PoiMediaItem[] = mediaRows?.map(m => {
          const { data } = supabase.storage.from('poi-media').getPublicUrl(m.storage_path);
          const publicUrl = data.publicUrl;
          console.log('[media url]', m.storage_path, '→', publicUrl);
          return { ...m, publicUrl };
        }) ?? [];

        console.log('[first media publicUrl]', urls?.[0]?.publicUrl);
        setMedia(urls);
        
        if (urls.length > 0) {
          console.log('✅ Found', urls.length, 'images for POI');
        } else {
          console.log('❌ No images found for this POI');
        }
        
      } catch (error) {
        console.error('💥 Error loading media:', error);
      } finally {
        setLoadingMedia(false);
      }
    }

    loadSiteMedia();
  }, [feature]);

  const handleSchedaCompleta = async () => {
    const siteId = getSiteIdFromFeature(feature);
    if (!siteId) {
      toast({ title: 'Errore', description: 'ID del sito non trovato', variant: 'destructive' });
      return;
    }

    if (isUserLoggedIn) {
      // User logged in - navigate to edit page
      navigate(`/edit?site=${siteId}`);
    } else {
      // User not logged in - navigate to detail page
      navigate(`/poi/${siteId}`);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold leading-tight">
            {properties.toponimo || 'Sito archeologico'}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <MapPin className="w-3 h-3" />
            <span>
              {[properties.comune_nome, properties.provincia_nome].filter(Boolean).join(', ')}
            </span>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 shrink-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Separator />

      {/* Description */}
      {properties.descrizione && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Descrizione</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {properties.descrizione}
          </p>
        </div>
      )}

      {/* Media Gallery */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          <h4 className="text-sm font-medium">Immagini</h4>
          {media.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {media.length}
            </Badge>
          )}
          {/* RLS / visibilità: gestisci published vs draft */}
          {!isUserLoggedIn && properties.stato_validazione === 'draft' && (
            <Badge variant="outline" className="text-xs">
              Immagini non visibili (bozza)
            </Badge>
          )}
        </div>
        
        {loadingMedia ? (
          <div className="flex items-center justify-center p-6 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Caricamento immagini...</div>
          </div>
        ) : (
          <PoiMedia items={media} />
        )}
      </div>

      {/* Chronologies */}
      {properties.cronologie && properties.cronologie.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <h4 className="text-sm font-medium">Cronologia</h4>
          </div>
          <div className="flex flex-wrap gap-1">
            {properties.cronologie.map((cronologia: string, index: number) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {cronologia}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Definitions */}
      {properties.definizioni && properties.definizioni.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            <h4 className="text-sm font-medium">Tipologia</h4>
          </div>
          <div className="flex flex-wrap gap-1">
            {properties.definizioni.map((definizione: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                {definizione}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Cultural Context */}
      {properties.ambiti && properties.ambiti.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Ambito Cultuale</h4>
          <div className="flex flex-wrap gap-1">
            {properties.ambiti.map((ambito: string, index: number) => (
              <Badge 
                key={index} 
                className="text-xs"
                style={{
                  backgroundColor: getAmbitoColor(ambito),
                  color: 'white'
                }}
              >
                {ambito}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Cult Indicators */}
      {properties.indicatori && properties.indicatori.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Indicatori Cultuali</h4>
          <div className="grid grid-cols-2 gap-1">
            {properties.indicatori.map((indicatore: string, index: number) => (
              <span key={index} className="text-xs bg-muted px-2 py-1 rounded">
                {indicatore}
              </span>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Source and License */}
      <div className="space-y-3">
        {properties.fonte && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Book className="w-3 h-3" />
              <span className="text-xs font-medium">Fonte</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {properties.fonte}
            </p>
          </div>
        )}

        {properties.licenza && (
          <div className="space-y-1">
            <span className="text-xs font-medium">Licenza</span>
            <p className="text-xs text-muted-foreground">
              {properties.licenza}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        <Button variant="outline" size="sm" className="w-full" onClick={handleSchedaCompleta}>
          <ExternalLink className="w-3 h-3 mr-2" />
          {isUserLoggedIn ? 'Edit' : 'Scheda Completa'}
        </Button>
      </div>
    </div>
  );
}

// Helper function to get color for cultural context
function getAmbitoColor(ambito: string): string {
  const colors: Record<string, string> = {
    'cristiano': 'hsl(200, 80%, 50%)',
    'romano': 'hsl(0, 80%, 50%)',
    'messapico': 'hsl(120, 60%, 40%)',
    'daunio': 'hsl(60, 70%, 45%)',
    'peuceta': 'hsl(280, 60%, 50%)',
    'ebraico': 'hsl(220, 70%, 50%)',
    'islamico': 'hsl(160, 60%, 40%)'
  };
  
  return colors[ambito.toLowerCase()] || 'hsl(35, 70%, 45%)';
}