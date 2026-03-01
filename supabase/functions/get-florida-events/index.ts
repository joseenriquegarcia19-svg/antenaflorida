
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Estructura de la respuesta esperada por el frontend
interface FloridaEvent {
  id: string;
  name: string;
  date: string | null;
  venueName: string;
  venueCity: string;
  genre: string;
  image: string | null;
  url: string;
}

// Headers para habilitar CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejar la solicitud pre-vuelo (preflight) de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Obtener la clave de API de forma segura desde las variables de entorno de Supabase
    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!apiKey) {
      throw new Error('La clave de API de Ticketmaster no está configurada en el servidor.');
    }

    // 2. Construir la URL para la API de Ticketmaster
    const now = new Date().toISOString().split('.')[0] + 'Z'; // Formato YYYY-MM-DDTHH:mm:ssZ
    const apiUrl = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
    apiUrl.searchParams.set('apikey', apiKey);
    apiUrl.searchParams.set('stateCode', 'FL'); // Filtrar por estado de Florida
    apiUrl.searchParams.set('classificationName', 'Music'); // Enfocarse en eventos de música
    apiUrl.searchParams.set('sort', 'date,asc'); // Ordenar por fecha
    apiUrl.searchParams.set('startDateTime', now); // Solo eventos futuros
    apiUrl.searchParams.set('size', '100'); // Traer hasta 100 eventos

    // 3. Realizar la llamada a la API de Ticketmaster
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Error con la API de Ticketmaster: ${response.status} ${errorBody}`);
    }

    const data = await response.json();

    // 4. Transformar los datos al formato que el frontend espera
    const events: FloridaEvent[] = (data._embedded?.events || []).map((event: any) => {
      // Encontrar la mejor imagen (la de mayor calidad)
      const bestImage = event.images?.find((img: any) => img.ratio === '16_9' && img.width > 600) 
                       || event.images?.[0];

      return {
        id: event.id,
        name: event.name,
        date: event.dates?.start?.dateTime || null,
        venueName: event._embedded?.venues?.[0]?.name || 'Lugar no especificado',
        venueCity: event._embedded?.venues?.[0]?.city?.name || 'Ciudad no especificada',
        genre: event.classifications?.[0]?.genre?.name || 'Música',
        image: bestImage?.url || null,
        url: event.url,
      };
    });

    // 5. Devolver los eventos formateados
    return new Response(
      JSON.stringify({ events }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    // Manejar cualquier error que ocurra en el proceso
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
