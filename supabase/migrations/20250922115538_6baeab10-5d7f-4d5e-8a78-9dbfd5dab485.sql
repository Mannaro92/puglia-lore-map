-- Fix RLS policy syntax errors
DROP POLICY IF EXISTS "Site relationships follow site permissions" ON public.site_cronologia;
DROP POLICY IF EXISTS "Site relationships follow site permissions" ON public.site_definizione;
DROP POLICY IF EXISTS "Site relationships follow site permissions" ON public.site_tipo_rinvenimento;
DROP POLICY IF EXISTS "Site relationships follow site permissions" ON public.site_grado_esplorazione;
DROP POLICY IF EXISTS "Site relationships follow site permissions" ON public.site_strutture;
DROP POLICY IF EXISTS "Site relationships follow site permissions" ON public.site_contesti;
DROP POLICY IF EXISTS "Site relationships follow site permissions" ON public.site_indicatori;
DROP POLICY IF EXISTS "Site relationships follow site permissions" ON public.site_ambiti;
DROP POLICY IF EXISTS "Site bibliography follows site permissions" ON public.site_biblio;
DROP POLICY IF EXISTS "Itinerary sites follow site permissions" ON public.itinerario_sites;

-- Recreate M:N relationship policies with correct syntax
CREATE POLICY "Site cronologia access" ON public.site_cronologia 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND (stato_validazione = 'published' OR created_by = auth.uid())));

CREATE POLICY "Site definizione access" ON public.site_definizione 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND (stato_validazione = 'published' OR created_by = auth.uid())));

CREATE POLICY "Site tipo_rinvenimento access" ON public.site_tipo_rinvenimento 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND (stato_validazione = 'published' OR created_by = auth.uid())));

CREATE POLICY "Site grado_esplorazione access" ON public.site_grado_esplorazione 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND (stato_validazione = 'published' OR created_by = auth.uid())));

CREATE POLICY "Site strutture access" ON public.site_strutture 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND (stato_validazione = 'published' OR created_by = auth.uid())));

CREATE POLICY "Site contesti access" ON public.site_contesti 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND (stato_validazione = 'published' OR created_by = auth.uid())));

CREATE POLICY "Site indicatori access" ON public.site_indicatori 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND (stato_validazione = 'published' OR created_by = auth.uid())));

CREATE POLICY "Site ambiti access" ON public.site_ambiti 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND (stato_validazione = 'published' OR created_by = auth.uid())));

CREATE POLICY "Site bibliography access" ON public.site_biblio 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND (stato_validazione = 'published' OR created_by = auth.uid())));

CREATE POLICY "Itinerary sites access" ON public.itinerario_sites 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND (stato_validazione = 'published' OR created_by = auth.uid())));

-- Add sample data for testing
INSERT INTO public.province (nome, sigla) VALUES 
    ('Foggia', 'FG'),
    ('Bari', 'BA'),
    ('Brindisi', 'BR'),
    ('Lecce', 'LE'),
    ('Taranto', 'TA');

-- Get province IDs for sample data
INSERT INTO public.comuni (nome, codice_istat, provincia_id) 
SELECT 'Vieste', '071060', id FROM public.province WHERE sigla = 'FG'
UNION ALL
SELECT 'Oria', '074019', id FROM public.province WHERE sigla = 'BR';

-- Sample sites with proper geographic coordinates (Puglia region)
INSERT INTO public.sites (
    toponimo, 
    descrizione, 
    geom_point, 
    provincia_id, 
    comune_id,
    stato_validazione,
    fonte,
    created_by
) VALUES
(
    'Sant''Eufemia - Vieste',
    'Importante sito archeologico di epoca medievale situato sul Gargano. Il complesso presenta evidenze di frequentazione dal periodo tardoantico fino al medioevo, con strutture religiose e civili di notevole interesse storico-archeologico.',
    ST_SetSRID(ST_MakePoint(16.1758, 41.8826), 4326),
    (SELECT id FROM public.province WHERE sigla = 'FG'),
    (SELECT id FROM public.comuni WHERE nome = 'Vieste'),
    'published',
    'Archivio Soprintendenza ABAP per le Province di Bari, Brindisi, Foggia e Taranto',
    '00000000-0000-0000-0000-000000000000'
),
(
    'Monte Papalucio - Oria',
    'Sito archeologico di epoca messapica e romana localizzato nei pressi di Oria. Le ricerche hanno messo in luce evidenze di un insediamento con valenze religiose, frequentato dal VI secolo a.C. fino all''età romana.',
    ST_SetSRID(ST_MakePoint(17.6417, 40.5017), 4326),
    (SELECT id FROM public.province WHERE sigla = 'BR'),
    (SELECT id FROM public.comuni WHERE nome = 'Oria'),
    'published',
    'Università del Salento - Dipartimento di Scienze dell''Antichità',
    '00000000-0000-0000-0000-000000000000'
);

-- Add relationships for sample sites
INSERT INTO public.site_cronologia (site_id, cronologia_id)
SELECT s.id, c.id FROM public.sites s, public.ref_cronologia c 
WHERE s.toponimo = 'Sant''Eufemia - Vieste' AND c.label IN ('Età Tardoantica', 'Età Medievale');

INSERT INTO public.site_cronologia (site_id, cronologia_id)
SELECT s.id, c.id FROM public.sites s, public.ref_cronologia c 
WHERE s.toponimo = 'Monte Papalucio - Oria' AND c.label IN ('Età Arcaica', 'Età Classica', 'Età Romana');

INSERT INTO public.site_definizione (site_id, definizione_id)
SELECT s.id, d.id FROM public.sites s, public.ref_definizione d 
WHERE s.toponimo = 'Sant''Eufemia - Vieste' AND d.label IN ('area sacra', 'chiesa');

INSERT INTO public.site_definizione (site_id, definizione_id)
SELECT s.id, d.id FROM public.sites s, public.ref_definizione d 
WHERE s.toponimo = 'Monte Papalucio - Oria' AND d.label IN ('santuario extraurbano', 'area sacra');

INSERT INTO public.site_ambiti (site_id, ambito_id)
SELECT s.id, a.id FROM public.sites s, public.ref_ambito_cultuale a 
WHERE s.toponimo = 'Sant''Eufemia - Vieste' AND a.label = 'cristiano';

INSERT INTO public.site_ambiti (site_id, ambito_id)
SELECT s.id, a.id FROM public.sites s, public.ref_ambito_cultuale a 
WHERE s.toponimo = 'Monte Papalucio - Oria' AND a.label IN ('messapico', 'romano');

INSERT INTO public.site_indicatori (site_id, indicatore_id)
SELECT s.id, i.id FROM public.sites s, public.ref_indicatori_cultuali i 
WHERE s.toponimo = 'Sant''Eufemia - Vieste' AND i.label IN ('ceramica', 'iscrizioni');

INSERT INTO public.site_indicatori (site_id, indicatore_id)
SELECT s.id, i.id FROM public.sites s, public.ref_indicatori_cultuali i 
WHERE s.toponimo = 'Monte Papalucio - Oria' AND i.label IN ('ceramica', 'coroplastica', 'bronzi/metalli');

-- Sample bibliography
INSERT INTO public.biblio (autore, titolo, anno, editore) VALUES
    ('Volpe, G.', 'Il Gargano tardoantico e medievale', 2015, 'Edipuglia'),
    ('De Juliis, E.M.', 'I Messapi: territorio e cultura materiale', 2018, 'Congedo Editore');

-- Link bibliography to sites
INSERT INTO public.site_biblio (site_id, biblio_id, citazione_pagina)
SELECT s.id, b.id, 'pp. 125-145'
FROM public.sites s, public.biblio b
WHERE s.toponimo = 'Sant''Eufemia - Vieste' AND b.autore = 'Volpe, G.';

INSERT INTO public.site_biblio (site_id, biblio_id, citazione_pagina)
SELECT s.id, b.id, 'pp. 78-92'
FROM public.sites s, public.biblio b
WHERE s.toponimo = 'Monte Papalucio - Oria' AND b.autore = 'De Juliis, E.M.';

-- Sample itineraries
INSERT INTO public.itinerari (titolo, descrizione, slug, published_at, created_by) VALUES
    (
        'Santuari costieri del Gargano',
        'Un percorso attraverso i luoghi sacri della costa garganica, dall''antichità al medioevo',
        'santuari-costieri-gargano',
        now(),
        '00000000-0000-0000-0000-000000000000'
    ),
    (
        'Cripte bizantine del Salento',
        'Itinerario alla scoperta delle testimonianze dell''arte e della spiritualità bizantina nel territorio salentino',
        'cripte-bizantine-salento',
        now(),
        '00000000-0000-0000-0000-000000000000'
    );

-- Link sites to itineraries
INSERT INTO public.itinerario_sites (itinerario_id, site_id, ordine, testo_storytelling)
SELECT i.id, s.id, 1, 'Punto di partenza del nostro viaggio attraverso i santuari del Gargano. Il sito di Sant''Eufemia rappresenta uno dei più significativi esempi di continuità cultuale dal tardoantico al medioevo.'
FROM public.itinerari i, public.sites s
WHERE i.slug = 'santuari-costieri-gargano' AND s.toponimo = 'Sant''Eufemia - Vieste';

INSERT INTO public.itinerario_sites (itinerario_id, site_id, ordine, testo_storytelling)
SELECT i.id, s.id, 1, 'Nel cuore del Salento, Monte Papalucio ci racconta la storia del sacro messapico e della sua trasformazione in epoca romana.'
FROM public.itinerari i, public.sites s
WHERE i.slug = 'cripte-bizantine-salento' AND s.toponimo = 'Monte Papalucio - Oria';

-- Sample layer configuration
INSERT INTO public.layers (nome, descrizione, categoria, tipo, default_visibility, default_opacity, order_index) VALUES
    ('Siti Archeologici', 'Layer dei siti archeologici e luoghi del sacro', 'Dati Progetto', 'vector', true, 1.0, 1),
    ('Province', 'Confini amministrativi delle province pugliesi', 'Cartografia di Base', 'vector', true, 0.7, 2),
    ('Comuni', 'Confini comunali', 'Cartografia di Base', 'vector', false, 0.5, 3),
    ('Vincoli Archeologici', 'Aree sottoposte a vincolo archeologico', 'Vincoli', 'vector', false, 0.8, 4),
    ('Cartografia Storica', 'Carte storiche georeferenziate', 'Cartografia Storica', 'raster', false, 0.7, 5);