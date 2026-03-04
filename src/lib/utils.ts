import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Nombre a mostrar para comentarios/mensajes: full_name, parte del email o "Anónimo". Nunca "Usuario". */
export function getDisplayName(profile: { full_name?: string | null; email?: string | null } | null | undefined): string {
  if (!profile) return 'Anónimo';
  const name = profile.full_name?.trim();
  if (name) return name;
  const email = profile.email?.trim();
  if (email) return email.includes('@') ? email.split('@')[0] : email;
  return 'Anónimo';
}

export function getYoutubeId(url: string): string | null {
  if (!url) return null;
  
  // YouTube Shorts
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) return shortsMatch[1];
  
  // Regular YouTube
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export function embedVideoLinksInHtml(html: string): string {
  if (!html) return '';

  // 1. Reemplazar enlaces en formato <a href="...">...</a> que apuntan a YouTube
  let processedHtml = html.replace(
    /<a[^>]*href=["'](https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]+)[^"']*["'][^>]*>.*?<\/a>/gi,
    (match, url) => {
      const embedUrl = getYoutubeEmbedUrl(url);
      if (embedUrl) {
        return `<div class="aspect-video w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-lg my-6"><iframe src="${embedUrl}" class="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
      }
      return match;
    }
  );

  // 2. Reemplazar enlaces crudos de YouTube que no están en una etiqueta <a> (están sueltos en el texto)
  // Lookbehind for > or space to avoid replacing inside existing HTML attributes.
  processedHtml = processedHtml.replace(
    /(?:^|\s|<p>|<br>)(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]+(?:[&?][a-zA-Z0-9_=&-]+)?)(?:$|\s|<\/p>|<br>)/gi,
    (match, url) => {
      const embedUrl = getYoutubeEmbedUrl(url);
      if (embedUrl) {
        const replacement = `<div class="aspect-video w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-lg my-6"><iframe src="${embedUrl}" class="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
        return match.replace(url, replacement);
      }
      return match;
    }
  );

  // 3. Reemplazar enlaces de Facebook Video (en formato <a>)
  processedHtml = processedHtml.replace(
    /<a[^>]*href=["'](https?:\/\/(?:www\.)?facebook\.com\/[^/]+\/videos\/[0-9]+(?:\/)?)[^"']*["'][^>]*>.*?<\/a>/gi,
    (match, url) => {
      const embedUrl = getFacebookEmbedUrl(url);
      if (embedUrl) {
        return `<div class="aspect-video w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-lg my-6"><iframe src="${embedUrl}" class="w-full h-full border-0" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
      }
      return match;
    }
  );

  // 4. Reemplazar enlaces de Vimeo
  processedHtml = processedHtml.replace(
    /<a[^>]*href=["'](https?:\/\/(?:www\.)?vimeo\.com\/[0-9]+)[^"']*["'][^>]*>.*?<\/a>/gi,
    (match, url) => {
      const vimeoIdMatch = url.match(/vimeo\.com\/([0-9]+)/);
      if (vimeoIdMatch && vimeoIdMatch[1]) {
        const embedUrl = `https://player.vimeo.com/video/${vimeoIdMatch[1]}?title=0&byline=0&portrait=0`;
        return `<div class="aspect-video w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-lg my-6"><iframe src="${embedUrl}" class="w-full h-full border-0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
      }
      return match;
    }
  );
  
  // 4.5. Reemplazar iframes directos (ya sea de Apple u otros) o limpiarlos si ya vienen como iframes válidos
  // Apple Newsroom u otros que pones directamente el iframe
  processedHtml = processedHtml.replace(
    /&lt;iframe\s+src=["'](https:\/\/share\.newsroom\.apple[a-zA-Z0-9_/?=&.-]+)["'][^>]*&gt;&lt;\/iframe&gt;/gi,
    (match, url) => {
      return `<div class="aspect-video w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-lg my-6"><iframe src="${url}" class="w-full h-full border-0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
    }
  );
  
  // Si pusiste el iframe directamente como html y no escapado
  processedHtml = processedHtml.replace(
    /<iframe\s+src=["'](https:\/\/share\.newsroom\.apple[a-zA-Z0-9_/?=&.-]+)["'][^>]*><\/iframe>/gi,
    (match, url) => {
      return `<div class="aspect-video w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-lg my-6"><iframe src="${url}" class="w-full h-full border-0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
    }
  );

  // 4.6. Enlaces crudos o en tag A de Apple Newsroom
  processedHtml = processedHtml.replace(
    /(?:<a[^>]*href=["']|)(https:\/\/(?:www\.)?apple\.com\/newsroom\/[0-9/]+\/[a-zA-Z0-9_-]+\/\?videoid=([a-zA-Z0-9]+))(?:["'][^>]*>.*?<\/a>|)/gi,
    (match, fullUrl, videoId) => {
      const embedUrl = `https://share.newsroom.apple/newsroom/embed/videos/?embedvideoid=${videoId}`;
      return `<div class="aspect-video w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-lg my-6"><iframe src="${embedUrl}" class="w-full h-full border-0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
    }
  );

  // 5. Reemplazar enlaces de X / Twitter (status o pic.x.com) en formato <a>
  processedHtml = processedHtml.replace(
    /<a[^>]*href=["'](https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/(?:[^/]+\/status\/[0-9]+|[^"']+)|https?:\/\/pic\.x\.com\/[^"']+)["'][^>]*>.*?<\/a>/gi,
    (match, url) => {
      return `<div class="flex justify-center w-full my-6"><blockquote class="twitter-tweet" data-theme="dark"><a href="${url}"></a></blockquote></div>`;
    }
  );

  // 6. Enlaces crudos de X / Twitter
  processedHtml = processedHtml.replace(
    /(?:^|\s|<p>|<br>)(https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/(?:[^/]+\/status\/[0-9]+)|https?:\/\/pic\.x\.com\/[a-zA-Z0-9_]+)(?:$|\s|<\/p>|<br>)/gi,
    (match, url) => {
      const replacement = `<div class="flex justify-center w-full my-6"><blockquote class="twitter-tweet" data-theme="dark"><a href="${url}"></a></blockquote></div>`;
      return match.replace(url, replacement);
    }
  );

  // 7. Enlaces de pic.x.com sin http
  processedHtml = processedHtml.replace(
    /(?:^|\s|<p>|<br>)(pic\.x\.com\/[a-zA-Z0-9_]+)(?:$|\s|<\/p>|<br>)/gi,
    (match, url) => {
      const replacement = `<div class="flex justify-center w-full my-6"><blockquote class="twitter-tweet" data-theme="dark"><a href="https://${url}"></a></blockquote></div>`;
      return match.replace(url, replacement);
    }
  );

  // 8. Reemplazar enlaces a archivos de video directos (.mp4, .webm, .ogg) en formato <a>
  processedHtml = processedHtml.replace(
    /<a[^>]*href=["'](https?:\/\/[^\s"'<>]+\.(?:mp4|webm|ogg)(?:[?#][^\s"']*)?)["'][^>]*>.*?<\/a>/gi,
    (match, url) => {
      return `<div class="aspect-video w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-lg my-6"><video src="${url}" controls class="w-full h-full object-cover" preload="metadata"></video></div>`;
    }
  );

  // 9. Enlaces crudos a archivos de video directos
  processedHtml = processedHtml.replace(
    /(?:^|\s|<p>|<br>)(https?:\/\/[^\s"'<>]+\.(?:mp4|webm|ogg)(?:[?#][^\s"']*)?)(?:$|\s|<\/p>|<br>)/gi,
    (match, url) => {
      const replacement = `<div class="aspect-video w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-lg my-6"><video src="${url}" controls class="w-full h-full object-cover" preload="metadata"></video></div>`;
      return match.replace(url, replacement);
    }
  );

  return processedHtml;
}

export function getYoutubeChannelId(url: string): string | null {
  if (!url) return null;
  
  // Direct channel ID (starts with UC)
  const channelIdMatch = url.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/);
  if (channelIdMatch) return channelIdMatch[1];
  
  // Also try to catch it without /channel/ if it's just the ID
  if (url.startsWith('UC') && url.length === 24) return url;

  return null;
}

export function getYoutubeThumbnail(url: string): string | null {
  const id = getYoutubeId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
}

/** Avatar por defecto cuando el usuario no tiene imagen de perfil: antena de radio (hasta que suba la suya). */
export const DEFAULT_AVATAR_URL = '/avatar-antenna.svg';

/** Avatares extra para galería: radio, USA, Cuba, animales, Disney, libertad, paz, Avatar (película), Harry Potter (DiceBear 7.x). */
export const EXTRA_AVATARS_GALLERY = [
  // Radio
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Radio',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Antenna',
  'https://api.dicebear.com/7.x/notionists/svg?seed=DJ',
  'https://api.dicebear.com/7.x/micah/svg?seed=Broadcast',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Microphone',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Studio',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Wave',
  'https://api.dicebear.com/7.x/notionists/svg?seed=FM',
  // USA
  'https://api.dicebear.com/7.x/avataaars/svg?seed=America',
  'https://api.dicebear.com/7.x/micah/svg?seed=Eagle',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Liberty',
  // Cuba
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Cuba',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Havana',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Caribbean',
  // Animales
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Cat',
  'https://api.dicebear.com/7.x/micah/svg?seed=Dog',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Lion',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Fox',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Bear',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Bird',
  // Disney
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Disney',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Magic',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Prince',
  'https://api.dicebear.com/7.x/micah/svg?seed=Princess',
  // Libertad
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Libertad',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Freedom',
  // Paz
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Paz',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Peace',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Dove',
  // Película Avatar
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Avatar',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Neytiri',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Pandora',
  // Harry Potter
  'https://api.dicebear.com/7.x/avataaars/svg?seed=HarryPotter',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Hogwarts',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Wizard',
  'https://api.dicebear.com/7.x/micah/svg?seed=Hermione',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Owl',
  // Más variedad
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Star',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Moon',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Sun',
  'https://api.dicebear.com/7.x/micah/svg?seed=Ocean',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Hero',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Dream',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Joy',
  // Banderas reales de países visitantes (FlagCDN, mismos países detectados en la web)
  'https://flagcdn.com/w160/us.png',
  'https://flagcdn.com/w160/cu.png',
  'https://flagcdn.com/w160/es.png',
  'https://flagcdn.com/w160/mx.png',
  'https://flagcdn.com/w160/ar.png',
  'https://flagcdn.com/w160/co.png',
  'https://flagcdn.com/w160/ve.png',
  'https://flagcdn.com/w160/pe.png',
  'https://flagcdn.com/w160/ec.png',
  'https://flagcdn.com/w160/cl.png',
  'https://flagcdn.com/w160/do.png',
  'https://flagcdn.com/w160/pr.png',
  'https://flagcdn.com/w160/pa.png',
  'https://flagcdn.com/w160/cr.png',
  'https://flagcdn.com/w160/gt.png',
  'https://flagcdn.com/w160/hn.png',
  'https://flagcdn.com/w160/ni.png',
  'https://flagcdn.com/w160/sv.png',
  'https://flagcdn.com/w160/bo.png',
  'https://flagcdn.com/w160/uy.png',
  'https://flagcdn.com/w160/py.png',
  'https://flagcdn.com/w160/ca.png',
  'https://flagcdn.com/w160/br.png',
  'https://flagcdn.com/w160/gb.png',
  'https://flagcdn.com/w160/fr.png',
  'https://flagcdn.com/w160/de.png',
  'https://flagcdn.com/w160/it.png',
  'https://flagcdn.com/w160/ie.png',
  'https://flagcdn.com/w160/au.png',
  'https://flagcdn.com/w160/in.png',
  'https://flagcdn.com/w160/nl.png',
  'https://flagcdn.com/w160/tr.png',
  'https://flagcdn.com/w160/se.png',
  'https://flagcdn.com/w160/pk.png',
];

/** Lista base de avatares predeterminados (antes de la galería extra). */
const AVATAR_GALLERY_BASE = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Precious',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Buddy',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Caleb',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Lolia',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Milo',
  'https://api.dicebear.com/7.x/shapes/svg?seed=Circle',
  'https://api.dicebear.com/7.x/shapes/svg?seed=Triangle',
  'https://api.dicebear.com/7.x/shapes/svg?seed=Square',
  'https://api.dicebear.com/7.x/shapes/svg?seed=Polygon',
  'https://api.dicebear.com/7.x/micah/svg?seed=Willow',
  'https://api.dicebear.com/7.x/micah/svg?seed=Nala',
  'https://api.dicebear.com/7.x/micah/svg?seed=Oliver',
  'https://api.dicebear.com/7.x/micah/svg?seed=George',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Fun',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Smile',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=Thumbs',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=Up',
];

/** Todas las URLs de avatares de la galería (base + extra). */
export const ALL_AVATARS_GALLERY = [...AVATAR_GALLERY_BASE, ...EXTRA_AVATARS_GALLERY];

/** Número total de avatares en la galería. */
export const AVATAR_GALLERY_TOTAL = ALL_AVATARS_GALLERY.length;

export const DEFAULT_IMAGES = {
  LOGO: '/logo.jpg',
  OG: '/og-image.png',
  AVATAR: (name?: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=317127&color=fff`,
  NEWS_FALLBACK: '/og-image.png',
  SHOW_FALLBACK: '/og-image.png',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getValidImageUrl(url: string | null | undefined, type: 'logo' | 'og' | 'avatar' | 'news' | 'show' = 'og', name?: string, width?: number, config?: any): string {
  if (url && url.trim() !== '') {
    // Check if it's a Supabase Storage URL and transformations are enabled
    const useTransformations = config?.enable_supabase_image_transformations || config?.config?.enable_supabase_image_transformations;
    
    if (useTransformations && url.includes('supabase.co/storage/v1/object/public/')) {
       const effectiveWidth = width || 800; // Sensible default if transformations are enabled
       const separator = url.includes('?') ? '&' : '?';
       return `${url}${separator}width=${effectiveWidth}&quality=80&format=origin`;
    }
    
    return url;
  }

  switch (type) {
    case 'logo':
      return DEFAULT_IMAGES.LOGO;
    case 'avatar':
      return DEFAULT_AVATAR_URL;
    case 'news':
      return DEFAULT_IMAGES.NEWS_FALLBACK;
    case 'show':
      return DEFAULT_IMAGES.SHOW_FALLBACK;
    case 'og':
    default:
      return DEFAULT_IMAGES.OG;
  }
}

export function getYoutubeEmbedUrl(url: string): string | null {
  const id = getYoutubeId(url);
  if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
  
  const channelId = getYoutubeChannelId(url);
  if (channelId) return `https://www.youtube.com/embed/live_stream?channel=${channelId}&autoplay=1&rel=0`;
  
  return null;
}

export function getFacebookEmbedUrl(url: string): string | null {
  if (!url) return null;
  if (!url.includes('facebook.com')) return null;
  
  // Encode the full URL to use it in the Facebook embed plugin
  const encodedUrl = encodeURIComponent(url);
  return `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=0&autoplay=1`;
}

export function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return getYoutubeEmbedUrl(url);
  }
  
  if (url.includes('facebook.com')) {
    return getFacebookEmbedUrl(url);
  }

  if (url.includes('streema.com')) {
    return url; // Streema URLs are often already players or can be embedded directly if they are player URLs
  }
  
  return null;
}

export const countryToCode: Record<string, string> = {
  'colombia': 'co',
  'estados unidos': 'us',
  'usa': 'us',
  'españa': 'es',
  'espana': 'es',
  'méxico': 'mx',
  'mexico': 'mx',
  'argentina': 'ar',
  'chile': 'cl',
  'venezuela': 've',
  'ecuador': 'ec',
  'perú': 'pe',
  'peru': 'pe',
  'república dominicana': 'do',
  'republica dominicana': 'do',
  'dominicana': 'do',
  'panamá': 'pa',
  'panama': 'pa',
  'puerto rico': 'pr',
  'costa rica': 'cr',
  'guatemala': 'gt',
  'honduras': 'hn',
  'nicaragua': 'ni',
  'el salvador': 'sv',
  'bolivia': 'bo',
  'uruguay': 'uy',
  'paraguay': 'py',
  'cuba': 'cu',
  'canadá': 'ca',
  'canada': 'ca',
  'brasil': 'br',
  'brazil': 'br',
  'reino unido': 'gb',
  'uk': 'gb',
  'francia': 'fr',
  'france': 'fr',
  'alemania': 'de',
  'germany': 'de',
  'italia': 'it',
  'italy': 'it'
};

export function isVideo(url: string | null | undefined): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.match(/\.(mp4|webm|ogg|mov)$/) !== null || 
         lowerUrl.includes('youtube.com') || 
         lowerUrl.includes('youtu.be') || 
         lowerUrl.includes('facebook.com/plugins/video.php');
}

export function getCountryCode(countryName?: string): string | null {
  if (!countryName) return null;
  const normalized = countryName.toLowerCase().trim();
  return countryToCode[normalized] || null;
}

export function formatTime(timeStr: string | undefined | null, is24h: boolean): string {
  if (!timeStr) return '';
  if (is24h) return timeStr.substring(0, 5); // Ensure HH:mm format
  const [hStr, mStr] = timeStr.split(':');
  if (!hStr || !mStr) return timeStr;
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h.toString().padStart(2, '0')}:${mStr.substring(0, 2)} ${ampm}`;
}

export function formatDateTime(dateStr: string | undefined | null, is24h: boolean, includeSeconds: boolean = false): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  const h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  
  if (is24h) {
    return `${day}/${month}/${year} ${h.toString().padStart(2, '0')}:${m}${includeSeconds ? `:${s}` : ''}`;
  } else {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${day}/${month}/${year} ${h12.toString().padStart(2, '0')}:${m}${includeSeconds ? `:${s}` : ''} ${ampm}`;
  }
}

/**
 * Calculates the YIQ contrast of a hex color to determine if text should be black or white.
 * Returns 'text-slate-900' for light backgrounds and 'text-white' for dark backgrounds.
 */
export function getContrastYIQ(color: string | undefined | null): string {
  if (!color) return 'text-white';
  
  let r = 0, g = 0, b = 0;
  
  if (color.includes(',')) {
    // Handling "R, G, B" format
    const parts = color.split(',').map(p => parseInt(p.trim(), 10));
    r = parts[0] || 0;
    g = parts[1] || 0;
    b = parts[2] || 0;
  } else {
    // Handling Hex format
    let hex = color.replace('#', '');
    
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    
    if (hex.length !== 6) return 'text-white';
    
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  }
  
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  return (yiq >= 128) ? 'text-slate-900' : 'text-white';
}
