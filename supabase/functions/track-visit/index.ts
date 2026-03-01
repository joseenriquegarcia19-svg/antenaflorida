import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';

type TrackBody = {
  path?: string;
  referrer?: string;
  visitor_id?: string;
  visitor_hash?: string; // Client-side generated hash
  device?: string;
  browser?: string;
  os?: string;
  lang?: string;
  tz?: string;
};

// ISO 3166-1 alpha-2 to Country Name mapping (Top countries for the radio)
const COUNTRY_MAP: Record<string, string> = {
  'es': 'España',
  'us': 'Estados Unidos',
  'ar': 'Argentina',
  'mx': 'México',
  'co': 'Colombia',
  'cl': 'Chile',
  'pe': 'Perú',
  've': 'Venezuela',
  'ec': 'Ecuador',
  'gt': 'Guatemala',
  'cu': 'Cuba',
  'bo': 'Bolivia',
  'do': 'República Dominicana',
  'hn': 'Honduras',
  'py': 'Paraguay',
  'sv': 'El Salvador',
  'ni': 'Nicaragua',
  'cr': 'Costa Rica',
  'uy': 'Uruguay',
  'pa': 'Panamá',
  'pr': 'Puerto Rico',
  'br': 'Brasil',
  'pt': 'Portugal',
  'fr': 'Francia',
  'it': 'Italia',
  'de': 'Alemania',
  'gb': 'Reino Unido',
  'ca': 'Canadá',
  'jp': 'Japón',
  'cn': 'China',
  'ru': 'Rusia',
  'ie': 'Irlanda',
  'se': 'Suecia',
  'no': 'Noruega',
  'dk': 'Dinamarca',
  'fi': 'Finlandia',
  'nl': 'Países Bajos',
  'be': 'Bélgica',
  'ch': 'Suiza',
  'at': 'Austria',
  'gr': 'Grecia',
  'tr': 'Turquía',
  'il': 'Israel',
  'sa': 'Arabia Saudita',
  'ae': 'Emiratos Árabes',
  'in': 'India',
  'au': 'Australia',
  'nz': 'Nueva Zelanda',
  'za': 'Sudáfrica',
  'ma': 'Marruecos',
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, x-vercel-ip-country, cf-ipcountry',
      'access-control-allow-methods': 'POST, OPTIONS',
    },
  });
}

function detectDevice(ua: string) {
  const lower = ua.toLowerCase();
  if (lower.includes('bot') || lower.includes('spider') || lower.includes('crawler')) return 'bot';
  if (lower.includes('smart tv') || lower.includes('smarttv') || lower.includes('appletv')) return 'smart_tv';
  if (lower.includes('ipad') || lower.includes('tablet')) return 'tablet';
  if (lower.includes('mobi') || lower.includes('iphone') || lower.includes('android')) return 'mobile';
  return 'desktop';
}

function detectBrowser(ua: string) {
  const lower = ua.toLowerCase();
  if (lower.includes('edg/')) return 'edge';
  if (lower.includes('opr/') || lower.includes('opera')) return 'opera';
  if (lower.includes('chrome/') && !lower.includes('edg/') && !lower.includes('opr/')) return 'chrome';
  if (lower.includes('safari/') && !lower.includes('chrome/')) return 'safari';
  if (lower.includes('firefox/')) return 'firefox';
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

async function fetchGeoIp(ip: string): Promise<string | null> {
  try {
    // Fallback to external GeoIP service if headers are missing
    // Using ipapi.co (Free tier: 1000 req/day). 
    // For high traffic, consider a paid plan or ensuring CDN headers are present.
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    if (res.ok) {
      const data = await res.json();
      return data.country_name || null;
    }
  } catch (e) {
    console.error('GeoIP fetch error:', e);
  }
  return null;
}

async function getCountryName(headers: Headers, ip: string | null) {
  // Try various headers provided by different CDNs/Platforms
  const code = (
    headers.get('cf-ipcountry') || 
    headers.get('x-vercel-ip-country') || 
    headers.get('x-country-code') ||
    headers.get('x-country') ||
    headers.get('cloudfront-viewer-country') || 
    'unknown'
  ).toLowerCase();
  
  if (code !== 'unknown' && code.length === 2) {
    return COUNTRY_MAP[code] || code.toUpperCase();
  }

  // If headers failed, try external API with IP
  if (ip && ip.length > 6 && ip !== '127.0.0.1' && ip !== '::1') {
    const geoCountry = await fetchGeoIp(ip);
    if (geoCountry) return geoCountry;
  }

  return 'Desconocido';
}

function getClientIp(headers: Headers) {
  const xff = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  
  return realIp || null;
}

async function sha256Base64Url(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse(200, { ok: true });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'missing_supabase_env' });
  }

  const salt = Deno.env.get('ANALYTICS_HASH_SALT') || 'radio-tito';

  let body: TrackBody;
  try {
    body = (await req.json()) as TrackBody;
  } catch {
    return jsonResponse(400, { error: 'invalid_json' });
  }

  const path = typeof body.path === 'string' ? body.path.slice(0, 500) : '/';
  const referrer = typeof body.referrer === 'string' ? body.referrer.slice(0, 1000) : null;
  const ua = req.headers.get('user-agent') || '';
  const lang =
    (typeof body.lang === 'string' && body.lang.slice(0, 20)) ||
    (req.headers.get('accept-language') || '').split(',')[0]?.trim().slice(0, 20) ||
    'unknown';
  
  const ip = getClientIp(req.headers) || '';
  const country = await getCountryName(req.headers, ip);

  // Use client-side hash if provided, otherwise generate one consistently
  let visitor_hash = body.visitor_hash;
  if (!visitor_hash) {
    const visitorId = typeof body.visitor_id === 'string' ? body.visitor_id.slice(0, 200) : null;
    // Consistent fallback: if no visitorId, use IP + UA
    const hashInput = visitorId ? visitorId : `ipua|${ip}|${ua}`;
    visitor_hash = await sha256Base64Url(hashInput);
  }

  const properties = {
    referrer,
    country,
    device: (typeof body.device === 'string' && body.device.slice(0, 20)) || detectDevice(ua),
    browser: (typeof body.browser === 'string' && body.browser.slice(0, 20)) || detectBrowser(ua),
    os: (typeof body.os === 'string' && body.os.slice(0, 20)) || detectOS(ua),
    lang,
    tz: typeof body.tz === 'string' ? body.tz.slice(0, 40) : undefined,
    ip_lookup: false // Marker that we used header-based lookup
  };

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from('analytics_events').insert({
    event_type: 'page_view',
    path,
    visitor_hash,
    properties,
  });

  if (error) return jsonResponse(500, { error: 'insert_failed' });
  return jsonResponse(200, { ok: true });
});
