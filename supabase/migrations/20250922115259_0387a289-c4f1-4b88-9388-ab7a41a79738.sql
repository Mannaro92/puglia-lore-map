-- Enable PostGIS and full-text search extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create enum types
CREATE TYPE public.stato_validazione AS ENUM ('draft', 'review', 'published');
CREATE TYPE public.tipo_media AS ENUM ('image', 'video', 'pdf', 'model3d');
CREATE TYPE public.tipo_layer AS ENUM ('vector', 'raster');
CREATE TYPE public.tipo_import AS ENUM ('csv', 'geojson', 'shp');

-- REFERENCE TABLES (VOCABOLARIO CONTROLLATO)

-- Ubicazione confidenza
CREATE TABLE public.ref_ubicazione_confidenza (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.ref_ubicazione_confidenza (label, sort_order) VALUES
    ('certa', 1),
    ('incerta', 2);

-- Posizione geografica
CREATE TABLE public.ref_posizione (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.ref_posizione (label, sort_order) VALUES
    ('montagna', 1),
    ('collina', 2),
    ('pianura', 3),
    ('costa', 4);

-- Cronologia
CREATE TABLE public.ref_cronologia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.ref_cronologia (label, sort_order) VALUES
    ('Età del Ferro', 1),
    ('Età Arcaica', 2),
    ('Età Classica', 3),
    ('Età Ellenistica', 4),
    ('Età Romana', 5),
    ('Età Tardoantica', 6),
    ('Età Medievale', 7);

-- Definizione
CREATE TABLE public.ref_definizione (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.ref_definizione (label, sort_order) VALUES
    ('area sacra', 1),
    ('area sacra rupestre', 2),
    ('santuario urbano', 3),
    ('santuario suburbano', 4),
    ('santuario extraurbano', 5),
    ('bosco sacro', 6),
    ('altare', 7),
    ('fontana', 8),
    ('chiesa', 9),
    ('cattedrale', 10),
    ('duomo', 11),
    ('abbazia', 12),
    ('monastero', 13),
    ('eremo', 14),
    ('sinagoga', 15),
    ('moschea', 16),
    ('edificio residenziale con valenza religiosa', 17),
    ('materiale votivo sporadico', 18),
    ('non classificabile', 19);

-- Tipo rinvenimento
CREATE TABLE public.ref_tipo_rinvenimento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.ref_tipo_rinvenimento (label, sort_order) VALUES
    ('occasionale', 1),
    ('ricognizione sistematica', 2),
    ('scavo sistematico', 3),
    ('non classificabile', 4);

-- Grado esplorazione
CREATE TABLE public.ref_grado_esplorazione (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.ref_grado_esplorazione (label, sort_order) VALUES
    ('ampio', 1),
    ('parziale', 2),
    ('non classificabile', 3);

-- Strutture componenti
CREATE TABLE public.ref_strutture_componenti (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.ref_strutture_componenti (label, sort_order) VALUES
    ('altare', 1),
    ('edifici', 2),
    ('elementi architettonici', 3),
    ('grotta', 4),
    ('cripta', 5),
    ('pozzo', 6),
    ('sorgente', 7),
    ('terrazzamenti', 8);

-- Contesti stratigrafici
CREATE TABLE public.ref_contesti_stratigrafici (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.ref_contesti_stratigrafici (label, sort_order) VALUES
    ('deposito votivo', 1),
    ('scarico', 2),
    ('strato di abbandono', 3),
    ('eschara', 4);

-- Indicatori cultuali
CREATE TABLE public.ref_indicatori_cultuali (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.ref_indicatori_cultuali (label, sort_order) VALUES
    ('ceramica', 1),
    ('coroplastica', 2),
    ('bronzi/metalli', 3),
    ('iscrizioni', 4),
    ('statue', 5),
    ('ornamenti', 6),
    ('utensili/armi', 7),
    ('cippo', 8),
    ('intonaci (dipinti)', 9),
    ('vetri (liturgici)', 10);

-- Ambito cultuale
CREATE TABLE public.ref_ambito_cultuale (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.ref_ambito_cultuale (label, sort_order) VALUES
    ('daunio', 1),
    ('peuceta', 2),
    ('messapico', 3),
    ('romano', 4),
    ('cristiano', 5),
    ('ebraico', 6),
    ('islamico', 7);

-- GEOGRAPHIC HIERARCHY

-- Province
CREATE TABLE public.province (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    sigla TEXT NOT NULL UNIQUE,
    geom GEOMETRY(MultiPolygon, 4326),
    bbox GEOMETRY(Polygon, 4326),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Comuni
CREATE TABLE public.comuni (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    codice_istat TEXT UNIQUE,
    provincia_id UUID REFERENCES public.province(id),
    geom GEOMETRY(MultiPolygon, 4326),
    bbox GEOMETRY(Polygon, 4326),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- MAIN ENTITY: SITES
CREATE TABLE public.sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    toponimo TEXT NOT NULL,
    descrizione TEXT,
    ubicazione_confidenza_id UUID REFERENCES public.ref_ubicazione_confidenza(id),
    posizione_id UUID REFERENCES public.ref_posizione(id),
    provincia_id UUID REFERENCES public.province(id),
    comune_id UUID REFERENCES public.comuni(id),
    indirizzo_libero TEXT,
    geom_point GEOMETRY(Point, 4326),
    geom_area GEOMETRY(MultiPolygon, 4326),
    centroid GEOMETRY(Point, 4326) GENERATED ALWAYS AS (
        ST_Centroid(COALESCE(geom_area, ST_Buffer(geom_point, 0.000001)))
    ) STORED,
    bbox GEOMETRY(Polygon, 4326) GENERATED ALWAYS AS (
        ST_Envelope(COALESCE(geom_area, ST_Buffer(geom_point, 0.0001)))
    ) STORED,
    fonte TEXT,
    licenza TEXT DEFAULT 'CC BY 4.0',
    stato_validazione public.stato_validazione DEFAULT 'draft',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- M:N RELATIONSHIP TABLES
CREATE TABLE public.site_cronologia (
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    cronologia_id UUID REFERENCES public.ref_cronologia(id),
    PRIMARY KEY (site_id, cronologia_id)
);

CREATE TABLE public.site_definizione (
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    definizione_id UUID REFERENCES public.ref_definizione(id),
    PRIMARY KEY (site_id, definizione_id)
);

CREATE TABLE public.site_tipo_rinvenimento (
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    tipo_rinvenimento_id UUID REFERENCES public.ref_tipo_rinvenimento(id),
    PRIMARY KEY (site_id, tipo_rinvenimento_id)
);

CREATE TABLE public.site_grado_esplorazione (
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    grado_id UUID REFERENCES public.ref_grado_esplorazione(id),
    PRIMARY KEY (site_id, grado_id)
);

CREATE TABLE public.site_strutture (
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    struttura_id UUID REFERENCES public.ref_strutture_componenti(id),
    PRIMARY KEY (site_id, struttura_id)
);

CREATE TABLE public.site_contesti (
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    contesto_id UUID REFERENCES public.ref_contesti_stratigrafici(id),
    PRIMARY KEY (site_id, contesto_id)
);

CREATE TABLE public.site_indicatori (
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    indicatore_id UUID REFERENCES public.ref_indicatori_cultuali(id),
    PRIMARY KEY (site_id, indicatore_id)
);

CREATE TABLE public.site_ambiti (
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    ambito_id UUID REFERENCES public.ref_ambito_cultuale(id),
    PRIMARY KEY (site_id, ambito_id)
);

-- BIBLIOGRAFIA & MEDIA
CREATE TABLE public.biblio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    autore TEXT,
    titolo TEXT NOT NULL,
    anno INTEGER,
    editore TEXT,
    doi_url TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.site_biblio (
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    biblio_id UUID REFERENCES public.biblio(id) ON DELETE CASCADE,
    citazione_pagina TEXT,
    PRIMARY KEY (site_id, biblio_id)
);

CREATE TABLE public.media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    tipo public.tipo_media NOT NULL,
    titolo TEXT,
    didascalia TEXT,
    crediti TEXT,
    licenza TEXT DEFAULT 'CC BY 4.0',
    ordine INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ITINERARI & STORYTELLING
CREATE TABLE public.itinerari (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titolo TEXT NOT NULL,
    descrizione TEXT,
    slug TEXT UNIQUE NOT NULL,
    cover_storage_path TEXT,
    licenza TEXT DEFAULT 'CC BY 4.0',
    published_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.itinerario_sites (
    itinerario_id UUID REFERENCES public.itinerari(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    ordine INTEGER NOT NULL,
    testo_storytelling TEXT,
    PRIMARY KEY (itinerario_id, site_id)
);

-- LAYER CATALOG
CREATE TABLE public.layers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descrizione TEXT,
    categoria TEXT,
    tipo public.tipo_layer NOT NULL,
    fonte TEXT,
    url TEXT,
    tablename TEXT,
    attributi_json JSONB,
    licenza TEXT DEFAULT 'CC BY 4.0',
    default_visibility BOOLEAN DEFAULT false,
    default_opacity FLOAT DEFAULT 1.0,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- AUDIT & IMPORT
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor TEXT, -- email or uuid
    azione TEXT NOT NULL,
    target_tabella TEXT,
    target_id UUID,
    diff_json JSONB,
    ts TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fonte TEXT,
    tipo public.tipo_import,
    mapping_json JSONB,
    risultati_json JSONB,
    actor TEXT,
    ts TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_sites_geom_point ON public.sites USING GIST (geom_point);
CREATE INDEX idx_sites_geom_area ON public.sites USING GIST (geom_area);
CREATE INDEX idx_sites_centroid ON public.sites USING GIST (centroid);
CREATE INDEX idx_sites_bbox ON public.sites USING GIST (bbox);
CREATE INDEX idx_sites_toponimo_gin ON public.sites USING GIN (toponimo gin_trgm_ops);
CREATE INDEX idx_sites_descrizione_gin ON public.sites USING GIN (descrizione gin_trgm_ops);
CREATE INDEX idx_sites_stato_validazione ON public.sites (stato_validazione);
CREATE INDEX idx_sites_created_by ON public.sites (created_by);

CREATE INDEX idx_province_geom ON public.province USING GIST (geom);
CREATE INDEX idx_comuni_geom ON public.comuni USING GIST (geom);

-- Full-text search index
CREATE INDEX idx_sites_fts ON public.sites USING GIN (to_tsvector('italian', toponimo || ' ' || COALESCE(descrizione, '')));

-- TRIGGERS

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sites_updated_at
    BEFORE UPDATE ON public.sites
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Normalize text fields
CREATE OR REPLACE FUNCTION public.normalize_site_text()
RETURNS TRIGGER AS $$
BEGIN
    NEW.toponimo = TRIM(NEW.toponimo);
    NEW.descrizione = TRIM(NEW.descrizione);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_sites_text
    BEFORE INSERT OR UPDATE ON public.sites
    FOR EACH ROW
    EXECUTE FUNCTION public.normalize_site_text();

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biblio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

-- Enable RLS on reference tables
ALTER TABLE public.ref_ubicazione_confidenza ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_posizione ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_cronologia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_definizione ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_tipo_rinvenimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_grado_esplorazione ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_strutture_componenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_contesti_stratigrafici ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_indicatori_cultuali ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_ambito_cultuale ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.province ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comuni ENABLE ROW LEVEL SECURITY;