import { useEffect, useState } from "react";
import { X, ExternalLink, MapPin, Clock, Tag, Book, Image as ImageIcon, ZoomIn } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { getSiteMedia, type MediaItem } from "@/lib/media";
import { supabase } from "@/integrations/supabase/client";

interface FeatureInfoPanelProps {
  feature: any;
  onClose: () => void;
}

export function FeatureInfoPanel({ feature, onClose }: FeatureInfoPanelProps) {
  const properties = feature.properties || {};
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Debug feature object
  console.log('🔍 FeatureInfoPanel feature:', feature);
  console.log('🔍 Feature properties:', properties);
  console.log('🔍 Feature ID for media lookup:', feature.id || properties.id);

  // Load media for this site
  useEffect(() => {
    const siteId = feature.id || properties.id;
    if (siteId) {
      console.log('🔍 Loading media for site:', siteId);
      setLoadingMedia(true);
      getSiteMedia(siteId).then((mediaList) => {
        console.log('📸 Media loaded:', mediaList);
        setMedia(mediaList);
        if (mediaList.length > 0) {
          console.log('✅ Found', mediaList.length, 'images for POI');
        } else {
          console.log('❌ No images found for this POI');
        }
      }).catch((error) => {
        console.error('💥 Error loading media:', error);
      }).finally(() => {
        setLoadingMedia(false);
      });
    } else {
      console.log('⚠️ No site ID available for media lookup');
    }
  }, [feature.id, properties.id]);

  // Function to get image URL
  const getImageUrl = (storagePath: string) => {
    const { data } = supabase.storage.from('poi-media').getPublicUrl(storagePath);
    return data.publicUrl;
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
      <div className="poi-images space-y-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          <h4 className="text-sm font-medium">Immagini</h4>
          {media.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {media.length}
            </Badge>
          )}
        </div>
        
        {loadingMedia ? (
          <div className="flex items-center justify-center p-6 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Caricamento immagini...</div>
          </div>
        ) : media.length > 0 ? (
          <div className="space-y-3">
            {/* Main Image */}
            <div className="relative">
              <Dialog>
                <DialogTrigger asChild>
                  <div className="relative group cursor-pointer">
                    <img
                      src={getImageUrl(media[0].storage_path)}
                      alt={media[0].titolo || 'Immagine principale del sito'}
                      className="w-full max-h-64 object-cover rounded-lg border"
                      style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', marginBottom: '8px' }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {media[0].titolo && (
                      <div className="absolute bottom-2 left-2 right-2 bg-black/80 text-white text-sm p-2 rounded">
                        <div className="font-medium">{media[0].titolo}</div>
                        {media[0].didascalia && (
                          <div className="text-xs text-gray-300 mt-1">{media[0].didascalia}</div>
                        )}
                      </div>
                    )}
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <img
                    src={getImageUrl(media[0].storage_path)}
                    alt={media[0].titolo || 'Immagine del sito'}
                    className="w-full h-auto rounded-lg"
                  />
                  {(media[0].titolo || media[0].didascalia) && (
                    <div className="mt-4 space-y-2">
                      {media[0].titolo && (
                        <h3 className="font-semibold text-lg">{media[0].titolo}</h3>
                      )}
                      {media[0].didascalia && (
                        <p className="text-muted-foreground">{media[0].didascalia}</p>
                      )}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            {/* Additional Images Thumbnails */}
            {media.length > 1 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Altre immagini</div>
                <div className="flex gap-2 overflow-x-auto">
                  {media.slice(1).map((item, index) => (
                    <Dialog key={item.id}>
                      <DialogTrigger asChild>
                        <div className="flex-shrink-0 relative group cursor-pointer">
                          <img
                            src={getImageUrl(item.storage_path)}
                            alt={item.titolo || `Immagine ${index + 2}`}
                            className="w-20 h-20 object-cover rounded border"
                            style={{ maxHeight: '80px' }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded flex items-center justify-center">
                            <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          {item.titolo && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-1 rounded-b">
                              <div className="truncate">{item.titolo}</div>
                            </div>
                          )}
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <img
                          src={getImageUrl(item.storage_path)}
                          alt={item.titolo || 'Immagine del sito'}
                          className="w-full h-auto rounded-lg"
                        />
                        {(item.titolo || item.didascalia) && (
                          <div className="mt-4 space-y-2">
                            {item.titolo && (
                              <h3 className="font-semibold text-lg">{item.titolo}</h3>
                            )}
                            {item.didascalia && (
                              <p className="text-muted-foreground">{item.didascalia}</p>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg text-center">
            <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
            <div className="text-sm text-muted-foreground">Nessuna immagine disponibile</div>
          </div>
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
        <Button variant="outline" size="sm" className="w-full">
          <ExternalLink className="w-3 h-3 mr-2" />
          Scheda Completa
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