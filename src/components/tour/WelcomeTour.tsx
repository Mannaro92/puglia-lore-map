import { useState } from "react";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface WelcomeTourProps {
  onComplete: () => void;
}

const TOUR_STEPS = [
  {
    title: "Benvenuti in MEMOIR GIS",
    content: "Un WebGIS per esplorare i siti archeologici e i luoghi del sacro in Puglia, dall'antichità al medioevo.",
    icon: "🏛️"
  },
  {
    title: "Navigazione Mappa",
    content: "Utilizza mouse e rotella per navigare. I siti sono colorati per ambito cultuale: blu (cristiano), rosso (romano), verde (messapico).",
    icon: "🗺️"
  },
  {
    title: "Pannello Layer",
    content: "Gestisci la visibilità e trasparenza dei layer dal pannello a destra. Puoi attivare/disattivare confini amministrativi e altri dati.",
    icon: "📋"
  },
  {
    title: "Ricerca",
    content: "Cerca indirizzi o utilizza la ricerca avanzata per filtrare i siti per cronologia, tipologia e altri criteri.",
    icon: "🔍"
  },
  {
    title: "Informazioni Siti",
    content: "Clicca su un sito per visualizzare le informazioni dettagliate: descrizione, cronologia, tipologia, indicatori cultuali.",
    icon: "ℹ️"
  },
  {
    title: "Strumenti",
    content: "Utilizza la toolbar per misurare distanze, localizzarti, stampare o condividere la mappa.",
    icon: "🔧"
  },
  {
    title: "Itinerari",
    content: "Esplora i percorsi tematici che collegano siti di particolare interesse storico-archeologico.",
    icon: "🛤️"
  }
];

export function WelcomeTour({ onComplete }: WelcomeTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTour = () => {
    onComplete();
  };

  const step = TOUR_STEPS[currentStep];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {currentStep + 1} / {TOUR_STEPS.length}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={skipTour}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <CardTitle className="flex items-center gap-3">
            <span className="text-2xl">{step.icon}</span>
            <span>{step.title}</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {step.content}
          </p>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Indietro
            </Button>

            <Button
              onClick={nextStep}
              className="flex items-center gap-2"
            >
              {currentStep === TOUR_STEPS.length - 1 ? 'Inizia' : 'Avanti'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress indicators */}
          <div className="flex justify-center gap-2 pt-2">
            {TOUR_STEPS.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep 
                    ? 'bg-primary' 
                    : index < currentStep 
                      ? 'bg-primary/50'
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}