import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

function detectDevice(ua: string) {
  const lower = ua.toLowerCase();
  if (lower.includes('bot') || lower.includes('spider') || lower.includes('crawler') || lower.includes('googlebot')) return 'bot';
  
  if (lower.includes('smart tv') || lower.includes('smarttv') || lower.includes('appletv') || lower.includes('crkey') || lower.includes('roku') || lower.includes('xbox') || lower.includes('playstation') || lower.includes('nintendo') || lower.includes('webos') || lower.includes('tizen')) return 'smart_tv';

  if (lower.includes('ipad') || lower.includes('tablet') || lower.includes('playbook') || lower.includes('silk') || lower.includes('kindle')) return 'tablet';
  if (lower.includes('android') && !lower.includes('mobile')) return 'tablet';

  if (lower.includes('mobi') || lower.includes('iphone') || lower.includes('ipod') || lower.includes('android') || lower.includes('blackberry') || lower.includes('windows phone')) return 'mobile';

  return 'desktop';
}

function detectBrowser(ua: string) {
  const lower = ua.toLowerCase();
  if (lower.includes('edg/')) return 'edge';
  if (lower.includes('opr/') || lower.includes('opera')) return 'opera';
  if (lower.includes('chrome/') && !lower.includes('edg/') && !lower.includes('opr/') && !lower.includes('brave')) return 'chrome';
  if (lower.includes('safari/') && !lower.includes('chrome/')) return 'safari';
  if (lower.includes('firefox/')) return 'firefox';
  if (lower.includes('trident/') || lower.includes('msie')) return 'ie';
  return 'unknown';
}

function detectOS(ua: string) {
  const lower = ua.toLowerCase();
  if (lower.includes('windows')) return 'windows';
  if (lower.includes('mac os') || lower.includes('macos')) return 'macos';
  if (lower.includes('android')) return 'android';
  if (lower.includes('iphone') || lower.includes('ipad') || lower.includes('ios')) return 'ios';
  if (lower.includes('linux')) return 'linux';
  return 'unknown';
}

async function sha256Base64Url(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const data = new Uint8Array(digest);
  let binary = '';
  for (const b of data) binary += String.fromCharCode(b);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function getOrCreateVisitorId() {
  const key = 'rt_visitor_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

export function useTrackPageView() {
  const location = useLocation();

  useEffect(() => {
    // No trackear el panel de administración para no ensuciar las métricas
    if (location.pathname.startsWith('/admin')) return;

    const transportKey = 'rt_analytics_transport';
    const preferredTransport = localStorage.getItem(transportKey);

    const fullPath = `${location.pathname}${location.search || ''}${location.hash || ''}`;
    const key = `pv:${fullPath}`;
    const now = Date.now();
    const last = Number(sessionStorage.getItem(key) || '0');
    
    // Evitar duplicados rápidos (10 segundos)
    if (last && now - last < 10_000) return;
    sessionStorage.setItem(key, String(now));

    const ua = navigator.userAgent || '';
    const visitorId = getOrCreateVisitorId();
    
    const baseProperties = {
      referrer: document.referrer || undefined,
      device: detectDevice(ua),
      browser: detectBrowser(ua),
      os: detectOS(ua),
      lang: (navigator.language || 'unknown').slice(0, 20),
      tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown').slice(0, 40),
    };

    (async () => {
      let visitor_hash = '';
      try {
        visitor_hash = await sha256Base64Url(visitorId);
      } catch {
        visitor_hash = visitorId; // Fallback if crypto fails
      }

      // Intentar obtener datos precisos de IP y geolocalización
      let country = 'Desconocido';
      const city = 'Desconocido';
      const ip = 'anon';

      // IP y localización: En el navegador es mejor dejarlo al servidor/Edge Function
      // pero mantenemos la lógica de inferencia por zona horaria para el fallback de DB
      const tz = baseProperties.tz.toLowerCase();
      if (tz.includes('madrid') || tz.includes('canary') || tz.includes('europe/madrid')) country = 'Spain';
      else if (tz.includes('buenos_aires') || tz.includes('argentina')) country = 'Argentina';
      else if (tz.includes('america/new_york') || tz.includes('america/chicago') || tz.includes('america/los_angeles') || tz.includes('america/miami')) country = 'United States';
      else if (tz.includes('mexico')) country = 'Mexico';
      else if (tz.includes('bogota') || tz.includes('colombia')) country = 'Colombia';
      else if (tz.includes('santiago')) country = 'Chile';
      else if (tz.includes('lima')) country = 'Peru';
      else if (tz.includes('caracas') || tz.includes('venezuela')) country = 'Venezuela';
      else if (tz.includes('havana') || tz.includes('cuba')) country = 'Cuba';
      else if (tz.includes('montevideo')) country = 'Uruguay';
      else if (tz.includes('santo_domingo') || tz.includes('dominican')) country = 'Dominican Republic';
      else if (tz.includes('panama')) country = 'Panama';
      else if (tz.includes('quito') || tz.includes('ecuador')) country = 'Ecuador';
      else if (tz.includes('asuncion')) country = 'Paraguay';
      else if (tz.includes('la_paz')) country = 'Bolivia';
      else if (tz.includes('san_jose')) country = 'Costa Rica';
      else if (tz.includes('guatemala')) country = 'Guatemala';
      else if (tz.includes('san_salvador')) country = 'El Salvador';
      else if (tz.includes('tegucigalpa')) country = 'Honduras';
      else if (tz.includes('managua')) country = 'Nicaragua';
      else if (tz.includes('san_juan')) country = 'Puerto Rico';

      // Intentar obtener IP de forma silenciosa solo si es necesario y sabemos que no dará CORS
      // Pero por ahora, confiamos en la Edge Function para detectar la IP real del request.

      // Intentar enviar a través de la Edge Function (recomendado para IP/País exacto)
      if (preferredTransport !== 'db') {
        try {
          const { error } = await supabase.functions.invoke('track-visit', {
            body: {
              path: fullPath,
              visitor_id: visitorId,
              visitor_hash,
              ...baseProperties,
              country, // Enviar datos enriquecidos si la Edge Function los acepta
              city,
              ip
            },
          });

          if (!error) return;
          console.warn('Analytics Edge Function error, falling back to DB:', error);
        } catch {
          console.warn('Analytics Edge Function exception, falling back to DB');
        }
      }

      // Fallback: Inserción directa en DB
      try {
        await supabase.from('analytics_events').insert({
          event_type: 'page_view',
          path: fullPath,
          visitor_hash,
          properties: {
            ...baseProperties,
            country,
            city,
            ip: 'anonymized', // No guardar IP real en DB directa por privacidad si se desea
            is_fallback: true,
            provider: 'ipapi'
          },
        });
        
        // También registrar en el log de vistas de noticias si es una noticia
        if (location.pathname.startsWith('/noticias/') && !location.pathname.includes('/seccion/') && !location.pathname.endsWith('/relacionado')) {
           const newsId = location.pathname.split('/').pop();
           if (newsId && newsId.length > 10) { // Validación básica de UUID
             await supabase.from('news_views_log').insert({
               news_id: newsId,
               visitor_hash,
               viewed_at: new Date().toISOString()
             });
             
             // Incrementar contador en la tabla news (opcional, mejor hacerlo con trigger o función RPC)
             await supabase.rpc('increment_news_view', { news_id: newsId });
           }
        }
        
      } catch {
        // Fallback final silencioso
      }
    })();
  }, [location.pathname, location.search, location.hash]);
}
