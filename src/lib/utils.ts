import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
      return DEFAULT_IMAGES.AVATAR(name);
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
