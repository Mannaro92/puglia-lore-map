import React from "react";
import { ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export interface PoiMediaItem {
  id: string;
  storage_path: string;
  tipo: 'image' | 'video' | 'pdf' | 'model3d';
  titolo?: string;
  didascalia?: string;
  crediti?: string;
  licenza?: string;
  ordine: number;
  size_bytes?: number | null;
  publicUrl: string;
}

interface PoiMediaProps {
  items: PoiMediaItem[];
}

export function PoiMedia({ items }: PoiMediaProps) {
  const [active, setActive] = React.useState(0);

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg text-center">
        <p className="text-sm text-muted-foreground">Nessuna immagine disponibile</p>
      </div>
    );
  }

  const img = items[active];

  return (
    <div className="poi-images space-y-3">
      {/* Main Media */}
      <div className="relative">
        <Dialog>
          <DialogTrigger asChild>
            <div className="relative group cursor-pointer">
              {img.tipo === 'video' ? (
                <video
                  src={img.publicUrl}
                  className="w-full h-auto rounded-lg mb-2"
                  controls
                  playsInline
                  preload="metadata"
                  style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', marginBottom: '8px' }}
                />
              ) : (
                <>
                  <img 
                    src={img.publicUrl} 
                    alt={img.titolo || 'Immagine del sito'} 
                    className="w-full h-auto rounded-lg mb-2"
                    style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', marginBottom: '8px' }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </>
              )}
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] p-2">
            {img.tipo === 'video' ? (
              <video
                src={img.publicUrl}
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={img.publicUrl}
                alt={img.titolo || 'Immagine del sito'}
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Caption/Credits */}
      {(img.didascalia || img.crediti || img.licenza) && (
        <p className="text-xs text-muted-foreground italic">
          {img.didascalia}
          {img.crediti ? ` — © ${img.crediti}` : ''}
          {img.licenza ? ` (${img.licenza})` : ''}
        </p>
      )}

      {/* Thumbnails for multiple media */}
      {items.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {items.map((m, i) => (
            <button 
              key={m.id} 
              onClick={() => setActive(i)} 
              className={`border rounded ${i === active ? 'ring-2 ring-primary' : ''} flex-shrink-0 relative`}
            >
              {m.tipo === 'video' ? (
                <>
                  <video 
                    src={m.publicUrl} 
                    className="h-20 w-28 object-cover rounded"
                    muted
                    playsInline
                    preload="metadata"
                    style={{ maxHeight: '80px' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/50 rounded-full p-1">
                      <span className="text-white text-xs">▶</span>
                    </div>
                  </div>
                </>
              ) : (
                <img 
                  src={m.publicUrl} 
                  alt={m.titolo || 'thumb'} 
                  className="h-20 w-28 object-cover rounded"
                  style={{ maxHeight: '80px' }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}