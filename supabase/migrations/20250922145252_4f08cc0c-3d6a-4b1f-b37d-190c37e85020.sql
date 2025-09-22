-- Create user profiles and roles system
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS policies for user_roles  
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    new.id, 
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  
  -- Give editor role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'editor');
  
  RETURN new;
END;
$$;

-- Trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC function to get all lookups
CREATE OR REPLACE FUNCTION public.rpc_get_lookups()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB := '{}';
BEGIN
    -- Get all reference tables
    SELECT jsonb_build_object(
        'ubicazione_confidenza', (SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order)) FROM ref_ubicazione_confidenza WHERE is_active = true ORDER BY sort_order),
        'posizione', (SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order)) FROM ref_posizione WHERE is_active = true ORDER BY sort_order),
        'cronologia', (SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order)) FROM ref_cronologia WHERE is_active = true ORDER BY sort_order),
        'definizione', (SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order)) FROM ref_definizione WHERE is_active = true ORDER BY sort_order),
        'tipo_rinvenimento', (SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order)) FROM ref_tipo_rinvenimento WHERE is_active = true ORDER BY sort_order),
        'grado_esplorazione', (SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order)) FROM ref_grado_esplorazione WHERE is_active = true ORDER BY sort_order),
        'strutture_componenti', (SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order)) FROM ref_strutture_componenti WHERE is_active = true ORDER BY sort_order),
        'contesti_stratigrafici', (SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order)) FROM ref_contesti_stratigrafici WHERE is_active = true ORDER BY sort_order),
        'indicatori_cultuali', (SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order)) FROM ref_indicatori_cultuali WHERE is_active = true ORDER BY sort_order),
        'ambito_cultuale', (SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order)) FROM ref_ambito_cultuale WHERE is_active = true ORDER BY sort_order)
    ) INTO result;
    
    RETURN result;
END;
$$;

-- RPC function to upsert site
CREATE OR REPLACE FUNCTION public.rpc_upsert_site(payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    site_id UUID;
    coords JSONB;
    geom_point GEOMETRY;
BEGIN
    -- Validate required fields
    IF payload->>'toponimo' IS NULL OR trim(payload->>'toponimo') = '' THEN
        RAISE EXCEPTION 'Campo obbligatorio: Toponimo';
    END IF;
    
    IF payload->>'descrizione' IS NULL OR trim(payload->>'descrizione') = '' THEN
        RAISE EXCEPTION 'Campo obbligatorio: Descrizione';
    END IF;
    
    IF payload->>'ubicazione_confidenza_id' IS NULL THEN
        RAISE EXCEPTION 'Campo obbligatorio: Ubicazione confidenza';
    END IF;
    
    -- Parse coordinates if provided
    coords := payload->'coordinates';
    IF coords IS NOT NULL AND coords->>'lon' IS NOT NULL AND coords->>'lat' IS NOT NULL THEN
        geom_point := ST_SetSRID(ST_MakePoint(
            (coords->>'lon')::DOUBLE PRECISION,
            (coords->>'lat')::DOUBLE PRECISION
        ), 4326);
    END IF;
    
    -- Insert or update site
    IF payload->>'id' IS NOT NULL THEN
        -- Update existing
        site_id := (payload->>'id')::UUID;
        UPDATE sites SET
            toponimo = payload->>'toponimo',
            descrizione = payload->>'descrizione',
            ubicazione_confidenza_id = (payload->>'ubicazione_confidenza_id')::UUID,
            posizione_id = CASE WHEN payload->>'posizione_id' != '' THEN (payload->>'posizione_id')::UUID ELSE NULL END,
            indirizzo_libero = payload->>'indirizzo_libero',
            geom_point = COALESCE(geom_point, sites.geom_point),
            stato_validazione = COALESCE((payload->>'stato_validazione')::stato_validazione, stato_validazione),
            updated_at = NOW()
        WHERE id = site_id AND created_by = auth.uid();
    ELSE
        -- Insert new
        INSERT INTO sites (
            toponimo, descrizione, ubicazione_confidenza_id, posizione_id,
            indirizzo_libero, geom_point, stato_validazione, created_by
        ) VALUES (
            payload->>'toponimo',
            payload->>'descrizione',
            (payload->>'ubicazione_confidenza_id')::UUID,
            CASE WHEN payload->>'posizione_id' != '' THEN (payload->>'posizione_id')::UUID ELSE NULL END,
            payload->>'indirizzo_libero',
            geom_point,
            COALESCE((payload->>'stato_validazione')::stato_validazione, 'draft'::stato_validazione),
            auth.uid()
        ) RETURNING id INTO site_id;
    END IF;
    
    -- Handle many-to-many relationships
    IF payload->'cronologia_ids' IS NOT NULL THEN
        DELETE FROM site_cronologia WHERE site_id = site_id;
        INSERT INTO site_cronologia (site_id, cronologia_id)
        SELECT site_id, (jsonb_array_elements_text(payload->'cronologia_ids'))::UUID;
    END IF;
    
    IF payload->'definizione_ids' IS NOT NULL THEN
        DELETE FROM site_definizione WHERE site_id = site_id;
        INSERT INTO site_definizione (site_id, definizione_id)
        SELECT site_id, (jsonb_array_elements_text(payload->'definizione_ids'))::UUID;
    END IF;
    
    IF payload->'tipo_rinvenimento_ids' IS NOT NULL THEN
        DELETE FROM site_tipo_rinvenimento WHERE site_id = site_id;
        INSERT INTO site_tipo_rinvenimento (site_id, tipo_rinvenimento_id)
        SELECT site_id, (jsonb_array_elements_text(payload->'tipo_rinvenimento_ids'))::UUID;
    END IF;
    
    IF payload->'grado_esplorazione_ids' IS NOT NULL THEN
        DELETE FROM site_grado_esplorazione WHERE site_id = site_id;
        INSERT INTO site_grado_esplorazione (site_id, grado_id)
        SELECT site_id, (jsonb_array_elements_text(payload->'grado_esplorazione_ids'))::UUID;
    END IF;
    
    IF payload->'strutture_ids' IS NOT NULL THEN
        DELETE FROM site_strutture WHERE site_id = site_id;
        INSERT INTO site_strutture (site_id, struttura_id)
        SELECT site_id, (jsonb_array_elements_text(payload->'strutture_ids'))::UUID;
    END IF;
    
    IF payload->'contesti_ids' IS NOT NULL THEN
        DELETE FROM site_contesti WHERE site_id = site_id;
        INSERT INTO site_contesti (site_id, contesto_id)
        SELECT site_id, (jsonb_array_elements_text(payload->'contesti_ids'))::UUID;
    END IF;
    
    IF payload->'indicatori_ids' IS NOT NULL THEN
        DELETE FROM site_indicatori WHERE site_id = site_id;
        INSERT INTO site_indicatori (site_id, indicatore_id)
        SELECT site_id, (jsonb_array_elements_text(payload->'indicatori_ids'))::UUID;
    END IF;
    
    IF payload->'ambiti_ids' IS NOT NULL THEN
        DELETE FROM site_ambiti WHERE site_id = site_id;
        INSERT INTO site_ambiti (site_id, ambito_id)
        SELECT site_id, (jsonb_array_elements_text(payload->'ambiti_ids'))::UUID;
    END IF;
    
    RETURN site_id;
END;
$$;

-- RPC to get sites as GeoJSON
CREATE OR REPLACE FUNCTION public.rpc_list_sites_bbox(bbox_geom GEOMETRY DEFAULT NULL, include_drafts BOOLEAN DEFAULT FALSE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    WITH site_features AS (
        SELECT jsonb_build_object(
            'type', 'Feature',
            'id', s.id,
            'geometry', CASE 
                WHEN s.geom_point IS NOT NULL THEN ST_AsGeoJSON(s.geom_point)::jsonb
                ELSE NULL
            END,
            'properties', jsonb_build_object(
                'id', s.id,
                'toponimo', s.toponimo,
                'descrizione', s.descrizione,
                'stato_validazione', s.stato_validazione,
                'created_by', s.created_by,
                'is_owner', s.created_by = auth.uid()
            )
        ) AS feature
        FROM sites s
        WHERE s.geom_point IS NOT NULL
          AND (
            s.stato_validazione = 'published'
            OR (include_drafts AND s.created_by = auth.uid())
          )
          AND (bbox_geom IS NULL OR ST_Intersects(s.geom_point, bbox_geom))
    )
    SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', jsonb_agg(feature)
    ) INTO result
    FROM site_features;
    
    RETURN COALESCE(result, '{"type": "FeatureCollection", "features": []}'::jsonb);
END;
$$;