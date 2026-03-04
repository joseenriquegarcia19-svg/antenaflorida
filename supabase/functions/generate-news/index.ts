import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { idea, target, provider: customProvider, model: customModel } = await req.json()

    if (!idea && target !== 'debug') {
      throw new Error('Se requiere una idea, URL o contexto para generar contenido.')
    }

    // Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    // Fetch configuration
    const { data: settingsData } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value')

    const config: Record<string, string> = {}
    if (settingsData) {
      settingsData.forEach((item: any) => {
        config[item.setting_key] = item.setting_value
      })
    }

    const aiProvider = customProvider || config['ai_provider'] || 'openai'
    const openAiKey = config['openai_api_key'] || Deno.env.get('OPENAI_API_KEY')
    const googleKey = config['google_api_key'] || Deno.env.get('GOOGLE_API_KEY')
    const openaiModel = customModel || config['openai_model'] || 'gpt-4o'
    const googleModel = customModel || config['google_model'] || 'gemini-1.5-flash'

    if (target === 'debug') {
      return new Response(JSON.stringify({
        status: 'ok',
        provider: aiProvider,
        model: aiProvider === 'google' ? googleModel : openaiModel,
        hasOpenAiKey: !!openAiKey,
        hasGoogleKey: !!googleKey,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let context = idea;

    // Detect if idea is a URL
    if (idea.trim().startsWith('http')) {
      console.log('Detectada URL, intentando extraer contenido...');
      try {
        const res = await fetch(idea.trim());
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        
        const title = doc?.querySelector('title')?.textContent || '';
        const pTags = doc?.querySelectorAll('p');
        let body = '';
        if (pTags) {
          for (const p of pTags) {
            if (p.textContent.length > 50) body += p.textContent + '\n\n';
          }
        }
        context = `Contenido extraído de la URL (${idea}):\nTítulo: ${title}\n\nCuerpo:\n${body.substring(0, 10000)}`;
      } catch (e) {
        console.error('Error al scrapear URL:', e);
        // Fallback to use the URL as a string if scraping fails
      }
    }

    // Fetch existing categories to guide the AI
    const { data: categoriesData } = await supabase
      .from('news_categories')
      .select('name')
    
    const existingCategories = categoriesData?.map((c: any) => c.name).join(', ') || 'General, Política, Deportes, Tecnología, Entretenimiento';

    const systemPrompt = config['news_prompt_system'] || 'Eres un periodista profesional. Genera contenido EXCLUSIVAMENTE en español neutro, sin importar el idioma de la fuente o idea original. Usa HTML puro. REGLA DE ORO: Cada párrafo DEBE estar envuelto en etiquetas <p></p>. NO uses saltos de línea \n para separar párrafos, usa etiquetas <p>. Si usas subtítulos, usa <h2>. El resultado debe ser HTML listo para un editor rich-text.';

    let promptGoal = ""
    switch (target) {
      case 'title': promptGoal = 'Genera un titular atractivo en ESPAÑOL (máx 70 caracteres). El JSON debe tener la clave "title".'; break;
      case 'summary': promptGoal = 'Genera un resumen en ESPAÑOL de exactamente 2 oraciones. El JSON debe tener la clave "summary".'; break;
      case 'category': promptGoal = `Elige las categorías más adecuadas en ESPAÑOL de esta lista: [${existingCategories}]. Puedes elegir hasta 3. IMPORTANTE: Sepáralas únicamente con comas (,) y NUNCA uses la palabra "y" o "and". Ej: "Política, Internacional". Responde SOLO con el nombre de las categorías en la clave "category".`; break;
      case 'tags': promptGoal = 'Genera 5 etiquetas en ESPAÑOL separadas por comas (como un solo string). El JSON debe tener la clave "tags".'; break;
      case 'sidebar_content': promptGoal = 'Genera exactamente 3 datos curiosos o de interés breves sobre esta noticia. Responde con un objeto JSON que tenga la clave "sidebar_facts" que sea un ARRAY de 3 strings (Ejemplo: ["Dato 1", "Dato 2", "Dato 3"]). Cada dato debe ser una sola oración corta (máx 15 palabras). NO uses HTML, NO uses "Sabías que".'; break;
      case 'image_url': promptGoal = 'Genera un prompt descriptivo y detallado en INGLÉS para DALL-E 3 que ilustre esta noticia. El JSON debe tener la clave "image_prompt".'; break;
      default: promptGoal = `Genera una noticia completa TOTALMENTE EN ESPAÑOL. El JSON debe incluir: "title" (string en español), "content" (HTML string en español donde CADA párrafo es un <p>...), "category" (string en español: elige hasta 3 de [${existingCategories}] o crea nuevas si es necesario, sepáralas SIEMPRE con comas, NUNCA uses "y" o "and", ej: "Política, Internacional"), "tags" (string en español separado por comas), "summary" (string en español), "sidebar_facts" (un ARRAY de strings JSON válido con exactamente 3 datos curiosos breves. Ejemplo: ["Dato 1", "Dato 2", "Dato 3"]) y "image_prompt" (un prompt en inglés para generar la imagen de la noticia).`;
    }

    const fullPrompt = `${systemPrompt}\n\nIdea/Contexto/Fuente: ${context}\n\nTarea: ${promptGoal}\n\nIMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido.`;

    let generated: any = {}

    try {
      if (aiProvider === 'google') {
        if (!googleKey) throw new Error('Google API Key no configurada.')
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent?key=${googleKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error?.message || 'Error en Google Gemini')
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        generated = JSON.parse(text.replace(/```json|```/g, '').trim())
      } else {
        if (!openAiKey) throw new Error('OpenAI API Key no configurada.')
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAiKey}`
          },
          body: JSON.stringify({
            model: openaiModel,
            messages: [{ role: 'system', content: fullPrompt }],
            response_format: { type: "json_object" }
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error?.message || 'Error en OpenAI')
        generated = JSON.parse(data.choices[0].message.content)
      }
    } catch (e) {
      console.error('Error en generación de texto:', e);
      throw new Error(`Error al generar el texto: ${e.message}`);
    }

    // Sanitize category to ensure no " y " or " and " is used
    if (generated.category) {
      if (typeof generated.category === 'string') {
        generated.category = generated.category.replace(/\s+y\s+/gi, ', ').replace(/\s+and\s+/gi, ', ').replace(/,\s*,/g, ',').trim();
      } else if (Array.isArray(generated.category)) {
        generated.category = generated.category.join(', ').replace(/\s+y\s+/gi, ', ').replace(/\s+and\s+/gi, ', ').replace(/,\s*,/g, ',').trim();
      }
    }

    // IMAGE GENERATION LOGIC
    if (target === 'image_url' || !target) {
      if (!openAiKey) {
        console.log('OpenAI API Key no configurada para imágenes.');
        if (target === 'image_url') {
          return new Response(JSON.stringify({ error: 'La API Key de OpenAI no está configurada en los ajustes de administración. Se requiere para generar imágenes con DALL-E.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          });
        }
      } else {
        console.log('Iniciando generación de imagen con DALL-E...');
        try {
          // Robust prompt extraction
          let imagePrompt = generated.image_prompt || generated.prompt;
          
          if (!imagePrompt && target === 'image_url') {
            // If we only wanted an image and the AI returned a JSON with other keys, take the first string value
            const values = Object.values(generated).filter(v => typeof v === 'string');
            if (values.length > 0) imagePrompt = values[0] as string;
          }
          
          imagePrompt = imagePrompt || generated.title || context;
          
          console.log('Prompt final para DALL-E:', imagePrompt);

          const imgRes = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openAiKey}`
            },
            body: JSON.stringify({
              model: "dall-e-3",
              prompt: `Professional news editorial photography, high resolution, 16:9 aspect ratio, cinematic lighting, realistic style, journalistic quality. Subject: ${imagePrompt}`,
              n: 1,
              size: "1024x1024",
              quality: "standard"
            })
          })
          
          const imgData = await imgRes.json();
          if (imgRes.ok && imgData.data?.[0]?.url) {
            const tempUrl = imgData.data[0].url;
            
            try {
              console.log('Descargando y guardando imagen en Storage...');
              const imageFetch = await fetch(tempUrl);
              const imageBlob = await imageFetch.blob();
              
              const fileName = `ai_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.png`;
              const filePath = `news/${fileName}`;
              
              const { error: uploadError } = await supabase.storage
                .from('content')
                .upload(filePath, imageBlob, {
                  contentType: 'image/png',
                  upsert: true
                });
                
              if (uploadError) throw uploadError;
              
              const { data: publicUrlData } = supabase.storage
                .from('content')
                .getPublicUrl(filePath);
                
              generated.image_url = publicUrlData.publicUrl;
              generated.image_source = "AI Generated (DALL-E 3)";
              console.log('Imagen guardada exitosamente:', generated.image_url);
            } catch (storageError) {
              console.error('Error al guardar en storage, usando URL temporal:', storageError);
              generated.image_url = tempUrl;
              generated.image_source = "AI Generated (DALL-E 3) - Link Temporal";
            }
          } else {
            const errorMsg = imgData.error?.message || 'Error desconocido en OpenAI DALL-E';
            console.error('Error DALL-E:', errorMsg);
            if (target === 'image_url') {
              return new Response(JSON.stringify({ error: `Error de OpenAI: ${errorMsg}` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
              });
            }
          }
        } catch (e) {
          console.error('Error crítico en generación de imagen:', e);
          if (target === 'image_url') {
            return new Response(JSON.stringify({ error: `Error crítico: ${e.message}` }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            });
          }
        }
      }
    }

    return new Response(JSON.stringify(generated), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }
})
