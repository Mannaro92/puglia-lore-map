import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    
    // Extract z/x/y from URL path: /tiles/{z}/{x}/{y}.mvt
    const z = parseInt(pathParts[2]);
    const x = parseInt(pathParts[3]);
    const y = parseInt(pathParts[4]?.replace('.mvt', ''));

    if (isNaN(z) || isNaN(x) || isNaN(y)) {
      return new Response('Invalid tile coordinates', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Get query parameters for filtering
    const layer = url.searchParams.get('layer') || 'sites';
    const definizioni = url.searchParams.get('definizioni')?.split(',') || [];
    const cronologie = url.searchParams.get('cronologie')?.split(',') || [];
    const ambiti = url.searchParams.get('ambiti')?.split(',') || [];

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    let mvt: Uint8Array;

    if (layer === 'sites') {
      // Generate sites MVT
      const { data, error } = await supabase.rpc('mvt_sites_tile', {
        z,
        x,
        y,
        definizione_filters: definizioni.length > 0 ? definizioni : null,
        cronologia_filters: cronologie.length > 0 ? cronologie : null,
        ambito_filters: ambiti.length > 0 ? ambiti : null
      });

      if (error) {
        console.error('Database error:', error);
        return new Response('Database error', { 
          status: 500,
          headers: corsHeaders 
        });
      }

      mvt = data;
    } else if (layer === 'province') {
      // Generate province MVT
      const { data, error } = await supabase.rpc('mvt_province_tile', { z, x, y });
      
      if (error) {
        console.error('Database error:', error);
        return new Response('Database error', { 
          status: 500,
          headers: corsHeaders 
        });
      }

      mvt = data;
    } else if (layer === 'comuni') {
      // Generate comuni MVT
      const { data, error } = await supabase.rpc('mvt_comuni_tile', { z, x, y });
      
      if (error) {
        console.error('Database error:', error);
        return new Response('Database error', { 
          status: 500,
          headers: corsHeaders 
        });
      }

      mvt = data;
    } else {
      return new Response('Unknown layer', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Return MVT with appropriate headers
    return new Response(mvt, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.mapbox-vector-tile',
        'Cache-Control': 'public, max-age=3600',
        'ETag': `"${z}-${x}-${y}-${layer}"`,
      },
    });

  } catch (error) {
    console.error('Error generating tiles:', error);
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});