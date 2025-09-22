import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Legend: React.FC = () => {
  const legendItems = [
    {
      color: 'hsl(122, 42%, 25%)', // --cultuale-cristiano
      label: 'Siti cristiani',
      description: 'Luoghi di culto e siti cristiani'
    },
    {
      color: 'hsl(4, 82%, 58%)', // --cultuale-romano  
      label: 'Siti romani',
      description: 'Siti di epoca romana'
    },
    {
      color: 'hsl(207, 71%, 39%)', // --cultuale-messapico
      label: 'Siti messapici', 
      description: 'Siti di epoca messapica'
    },
    {
      color: 'hsl(0, 0%, 53%)', // --cultuale-altro
      label: 'Altri siti',
      description: 'Altri contesti archeologici'
    }
  ]

  const uncertaintyItems = [
    {
      pattern: 'solid',
      label: 'Ubicazione certa',
      description: 'Localizzazione confermata'
    },
    {
      pattern: 'dashed',
      label: 'Ubicazione incerta', 
      description: 'Localizzazione approssimativa'
    }
  ]

  return (
    <div className="space-y-4">
      {/* Classificazione per ambito cultuale */}
      <div>
        <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
          Classificazione per ambito cultuale
        </h4>
        <div className="space-y-2">
          {legendItems.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Affidabilità localizzazione */}
      <div>
        <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
          Affidabilità localizzazione
        </h4>
        <div className="space-y-2">
          {uncertaintyItems.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="w-6 h-0.5 flex-shrink-0">
                {item.pattern === 'solid' ? (
                  <div 
                    className="w-full h-full bg-[hsl(var(--memoir-ruby-dark))]"
                    aria-hidden="true"
                  />
                ) : (
                  <div 
                    className="w-full h-full bg-[hsl(var(--memoir-ruby-dark))]"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, hsl(var(--memoir-ruby-dark)) 2px, hsl(var(--memoir-ruby-dark)) 4px)',
                    }}
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Note aggiuntive */}
      <div className="pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          I colori indicano l'ambito cultuale prevalente del sito archeologico.
          L'intensità del colore varia in base alla trasparenza del layer.
        </p>
      </div>
    </div>
  )
}