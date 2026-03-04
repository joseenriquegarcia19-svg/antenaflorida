import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { draft_id } = await req.json()

    if (!draft_id) {
      throw new Error('Se requiere draft_id')
    }

    // Procesar de forma síncrona para que el borrador se complete y se envíe la notificación.
    // (En muchos entornos Edge, waitUntil no garantiza que la tarea en segundo plano termine.)
    await processQueue(draft_id);

    return new Response(JSON.stringify({ status: 'completed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})

async function processQueue(draft_id: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars')
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // 1. Fetch draft
    const { data: draft, error: fetchError } = await supabase
      .from('news_drafts_queue')
      .select('*')
      .eq('id', draft_id)
      .single()

    if (fetchError || !draft) {
      console.error('Draft not found', fetchError)
      return;
    }

    // 2. Update to processing and reset attempt count
    await supabase.from('news_drafts_queue').update({
      status: 'processing',
      updated_at: new Date().toISOString(),
      attempt_count: 0
    }).eq('id', draft_id)

    // 3. Loop and retry
    const maxRetries = 10;
    let attempt = 0;
    let success = false;
    let resultData = null;
    let finalError = '';

    while (attempt < maxRetries && !success) {
      attempt++;
      await supabase.from('news_drafts_queue').update({
        attempt_count: attempt,
        updated_at: new Date().toISOString()
      }).eq('id', draft_id);
      console.log(`Processing draft ${draft_id}, attempt ${attempt}`);

      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/generate-news`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ idea: draft.prompt_url, target: null })
        });

        const data = await res.json();

        if (res.ok && !data.error) {
          resultData = data;
          success = true;
        } else {
          throw new Error(data.error || 'Unknown error from generate-news');
        }

      } catch (err: any) {
        const errMsg = err.message || '';
        console.error(`Attempt ${attempt} failed:`, errMsg);
        
        const isQuotaError = errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('rate limit');
        
        if (isQuotaError && attempt < maxRetries) {
          // Read wait time or default to 60s
          const match = errMsg.match(/retry in (\d+(\.\d+)?)s/i);
          const waitTime = match ? Math.ceil(parseFloat(match[1])) + 5 : 65;
          console.log(`Quota limit hit. Sleeping for ${waitTime} seconds...`);
          await new Promise(r => setTimeout(r, waitTime * 1000));
        } else {
          finalError = errMsg;
          break; // Break if not quota error or max retries reached
        }
      }
    }

    if (success && resultData) {
      // 4. Save success (borrador terminado para que el usuario lo revise y pueda editar antes de publicar)
      const { error: updateErr } = await supabase.from('news_drafts_queue').update({ 
        status: 'success', 
        result_data: resultData,
        attempt_count: attempt,
        updated_at: new Date().toISOString() 
      }).eq('id', draft_id);

      if (updateErr) {
        console.error('Error al guardar result_data en borrador:', updateErr);
      }

      // 5. Notify user (link_url para que al tocar la notificación vaya a Borradores)
      await supabase.from('notifications').insert({
        user_id: draft.user_id,
        type: 'system',
        title: 'Noticia generada',
        message: 'El Agente IA ha terminado de generar tu noticia. Revisa la pestaña de Borradores.',
        link_url: '/admin/news?tab=drafts'
      });

    } else {
      // Save error
      await supabase.from('news_drafts_queue').update({ 
        status: 'error', 
        error_msg: finalError || 'Límite de intentos agotado',
        attempt_count: attempt,
        updated_at: new Date().toISOString() 
      }).eq('id', draft_id);

      // Notify user of error (link_url para ir a Borradores y reintentar)
      await supabase.from('notifications').insert({
        user_id: draft.user_id,
        type: 'system',
        title: 'Error al generar noticia',
        message: 'El Agente IA no pudo generar tu noticia después de varios intentos.',
        link_url: '/admin/news?tab=drafts'
      });
    }

  } catch (err) {
    console.error('Critical error in processQueue', err);
  }
}
