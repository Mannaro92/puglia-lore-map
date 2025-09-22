import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const q = url.searchParams.get('q');
    const format = url.searchParams.get('format') || 'json';
    const limit = url.searchParams.get('limit') || '10';
    const countrycodes = url.searchParams.get('countrycodes') || 'it';
    const bounded = url.searchParams.get('bounded') || '1';
    const viewbox = url.searchParams.get('viewbox') || '6.6272658,35.2889616,18.7844746,47.095196'; // Italy bbox

    if (!q) {
      return new Response('Missing search query', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Proxy request to Nominatim
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
    nominatimUrl.searchParams.set('q', q);
    nominatimUrl.searchParams.set('format', format);
    nominatimUrl.searchParams.set('limit', limit);
    nominatimUrl.searchParams.set('countrycodes', countrycodes);
    nominatimUrl.searchParams.set('bounded', bounded);
    nominatimUrl.searchParams.set('viewbox', viewbox);
    nominatimUrl.searchParams.set('addressdetails', '1');
    nominatimUrl.searchParams.set('dedupe', '1');

    const response = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': 'MEMOIR-GIS/1.0 (Archaeological WebGIS)',
      },
    });

    if (!response.ok) {
      return new Response('Geocoding service unavailable', { 
        status: 502,
        headers: corsHeaders 
      });
    }

    const data = await response.json();

    // Filter results to prioritize places in Puglia
    const pugliaResults = data.filter((result: any) => 
      result.address && (
        result.address.state === 'Puglia' || 
        result.address.region === 'Puglia' ||
        result.address.state === 'Apulia'
      )
    );

    const otherResults = data.filter((result: any) => 
      !pugliaResults.includes(result)
    );

    // Return Puglia results first, then others
    const sortedResults = [...pugliaResults, ...otherResults];

    return new Response(JSON.stringify(sortedResults), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
      },
    });

  } catch (error) {
    console.error('Geocoding error:', error);
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});