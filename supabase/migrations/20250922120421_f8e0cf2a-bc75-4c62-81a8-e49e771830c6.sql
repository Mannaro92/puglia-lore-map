-- Fix remaining security issues

-- Enable RLS on all remaining tables that don't have it enabled
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biblio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comuni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.province ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_ambito_cultuale ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_contesti_stratigrafici ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_cronologia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_definizione ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_grado_esplorazione ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_indicatori_cultuali ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_posizione ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_strutture_componenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_tipo_rinvenimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_ubicazione_confidenza ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_ambiti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_biblio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_contesti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_cronologia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_definizione ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_grado_esplorazione ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_indicatori ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_strutture ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_tipo_rinvenimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerario_sites ENABLE ROW LEVEL SECURITY;

-- Fix function search paths for security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.normalize_site_text(input_text text)
RETURNS text AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN lower(trim(regexp_replace(input_text, '\s+', ' ', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT SECURITY DEFINER SET search_path = public;