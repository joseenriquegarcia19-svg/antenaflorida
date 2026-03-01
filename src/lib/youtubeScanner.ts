import { getYoutubeThumbnail } from './utils';

export interface ScannedVideo {
  id: string;
  title: string;
  url: string;
  description?: string;
  duration?: string;
  published_at: Date;
  thumbnail_url: string;
  views?: string;
}

export const parseRelativeTime = (timeText: string): Date => {
  const now = new Date();
  
  // Try to parse absolute date formats first (e.g. "Feb 6, 2026", "2026-02-06")
  if (!timeText.match(/ago|hace/i)) {
     const cleanText = timeText.replace(/Published on|Estrenado el|Publicado el|Streamed live on|Emitido en directo el/i, '').trim();
     const absoluteDate = new Date(cleanText);
     if (!isNaN(absoluteDate.getTime())) {
        return absoluteDate;
     }
  }

  const numMatch = timeText.match(/\d+/);
  if (!numMatch) return now;
  
  const num = parseInt(numMatch[0]);
  const lowerText = timeText.toLowerCase();
  
  if (lowerText.includes('second') || lowerText.includes('segundo')) {
    now.setSeconds(now.getSeconds() - num);
  } else if (lowerText.includes('minute') || lowerText.includes('minuto')) {
    now.setMinutes(now.getMinutes() - num);
  } else if (lowerText.includes('hour') || lowerText.includes('hora')) {
    now.setHours(now.getHours() - num);
  } else if (lowerText.includes('day') || lowerText.includes('día') || lowerText.includes('dia')) {
    now.setDate(now.getDate() - num);
  } else if (lowerText.includes('week') || lowerText.includes('semana')) {
    now.setDate(now.getDate() - (num * 7));
  } else if (lowerText.includes('month') || lowerText.includes('mes')) {
    now.setMonth(now.getMonth() - num);
  } else if (lowerText.includes('year') || lowerText.includes('año')) {
    now.setFullYear(now.getFullYear() - num);
  }
  
  return now;
};

const parseDuration = (text: string): string => {
  if (!text) return '00:00';
  if (/^(\d+:)?\d+:\d+$/.test(text)) return text;
  
  let minutes = 0;
  let seconds = 0;
  
  const minMatch = text.match(/(\d+)\s*(minute|minuto)/i);
  const secMatch = text.match(/(\d+)\s*(second|segundo)/i);
  
  if (minMatch) minutes = parseInt(minMatch[1]);
  if (secMatch) seconds = parseInt(secMatch[1]);
  
  if (minMatch || secMatch) {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return text;
};


interface YouTubeData {
  videoId?: string;
  title?: string | { runs?: { text: string }[]; simpleText?: string };
  headline?: string | { runs?: { text: string }[]; simpleText?: string };
  lengthText?: { simpleText?: string; accessibility?: { accessibilityData?: { label?: string } } };
  thumbnailOverlays?: { 
    thumbnailOverlayTimeStatusRenderer?: { 
      text?: { simpleText?: string }; 
      style?: string;
    } 
  }[];
  descriptionSnippet?: { runs?: { text: string }[] };
  accessibility?: { accessibilityData?: { label?: string } };
  viewCountText?: { simpleText?: string; runs?: { text: string }[] };
  shortViewCountText?: { simpleText?: string; runs?: { text: string }[] };
  publishedTimeText?: { simpleText?: string };
  microformat?: {
    playerMicroformatRenderer?: {
      publishDate?: string;
      uploadDate?: string;
      title?: { simpleText?: string };
    }
  };
  upcomingEventData?: { startTime?: string };
  videoPrimaryInfoRenderer?: {
    title?: { runs?: { text: string }[] };
    viewCount?: { videoViewCountRenderer?: { viewCount?: { simpleText?: string } } };
  };
  videoSecondaryInfoRenderer?: {
    description?: { runs?: { text: string }[] };
    dateText?: { simpleText?: string };
  };
}

interface YouTubeItem extends Record<string, unknown> {
  videoId?: string;
}

const findVideoItems = (obj: Record<string, unknown>, found: YouTubeItem[] = []) => {
  if (!obj || typeof obj !== 'object') return found;

  const item = obj as unknown as YouTubeItem;
  if (typeof item.videoId === 'string' && item.videoId.length === 11) {
    found.push(item);
  }

  Object.values(obj).forEach(value => {
    if (Array.isArray(value)) {
      value.forEach(v => {
        if (v && typeof v === 'object') {
          findVideoItems(v as Record<string, unknown>, found);
        }
      });
    } else if (value && typeof value === 'object') {
      findVideoItems(value as Record<string, unknown>, found);
    }
  });

  return found;
};

const extractVideoDetails = (itemInput: Record<string, unknown>) => {
   const item = itemInput as unknown as YouTubeData;
   const id = item.videoId || '';
   
   // Title extraction strategies
   let title = '';
   if (typeof item.title === 'string') title = item.title;
   else if (item.title?.runs?.[0]?.text) title = item.title.runs[0].text;
   else if (item.title?.simpleText) title = item.title.simpleText;

   if (!title) {
     if (typeof item.headline === 'string') title = item.headline;
     else if (item.headline?.runs?.[0]?.text) title = item.headline.runs[0].text;
     else if (item.headline?.simpleText) title = item.headline.simpleText;
   }
   
   if (!title && item.videoPrimaryInfoRenderer?.title?.runs?.[0]?.text) {
     title = item.videoPrimaryInfoRenderer.title.runs[0].text;
   }
   
   if (!title && item.microformat?.playerMicroformatRenderer?.title?.simpleText) {
     title = item.microformat.playerMicroformatRenderer.title.simpleText;
   }

   // Fallback for title from accessibility label
   if (!title || title.includes(id)) {
      const label = item.accessibility?.accessibilityData?.label;
      if (label) {
         const byMatch = label.match(/\s+(by|de)\s+/);
         if (byMatch && byMatch.index && byMatch.index > 0) {
            title = label.substring(0, byMatch.index).trim();
         } else {
            title = label.split('\n')[0].substring(0, 100);
         }
      }
   }

   // Duration extraction
   let rawDuration = '';
   if (item.lengthText?.simpleText) rawDuration = item.lengthText.simpleText;
   else if (item.thumbnailOverlays) {
      item.thumbnailOverlays.forEach(overlay => {
         const renderer = overlay.thumbnailOverlayTimeStatusRenderer;
         if (renderer?.text?.simpleText) {
            rawDuration = renderer.text.simpleText;
         }
      });
   }

   if (!rawDuration && item.accessibility?.accessibilityData?.label) {
      const timeMatch = item.accessibility.accessibilityData.label.match(/(\d+)\s+(seconds?|minutes?|hours?|segundos?|minutos?|horas?)/i);
      if (timeMatch) {
          rawDuration = timeMatch[0];
      }
   }
   
   // Description
   let description = '';
   if (item.descriptionSnippet?.runs?.[0]?.text) description = item.descriptionSnippet.runs[0].text;
   else if (item.videoSecondaryInfoRenderer?.description?.runs?.[0]?.text) {
     description = item.videoSecondaryInfoRenderer.description.runs[0].text;
   }

   // Published At
   let publishedText = '';
   let absoluteDate = null;

   if (item.microformat?.playerMicroformatRenderer?.publishDate) {
      absoluteDate = item.microformat.playerMicroformatRenderer.publishDate;
   } else if (item.microformat?.playerMicroformatRenderer?.uploadDate) {
      absoluteDate = item.microformat.playerMicroformatRenderer.uploadDate;
   } else if (item.upcomingEventData?.startTime) {
      absoluteDate = new Date(parseInt(item.upcomingEventData.startTime) * 1000).toISOString();
      publishedText = 'Scheduled';
   }

   if (item.publishedTimeText?.simpleText) publishedText = item.publishedTimeText.simpleText;
   else if (item.videoSecondaryInfoRenderer?.dateText?.simpleText) publishedText = item.videoSecondaryInfoRenderer.dateText.simpleText;
   
   if (!publishedText && !absoluteDate && item.accessibility?.accessibilityData?.label) {
       const label = item.accessibility.accessibilityData.label;
       const agoMatch = label.match(/(\d+)\s+(seconds?|minutes?|hours?|days?|weeks?|months?|years?)\s+ago/i);
       const haceMatch = label.match(/hace\s+(\d+)\s+(segundos?|minutos?|horas?|días?|semanas?|meses?|años?)/i);
       
       if (agoMatch) publishedText = agoMatch[0];
       else if (haceMatch) publishedText = haceMatch[0];
   }

   // View Count extraction
   let views = '';
   if (item.viewCountText?.simpleText) views = item.viewCountText.simpleText;
   else if (item.viewCountText?.runs?.[0]?.text) views = item.viewCountText.runs[0].text;
   else if (item.shortViewCountText?.simpleText) views = item.shortViewCountText.simpleText;
   else if (item.shortViewCountText?.runs?.[0]?.text) views = item.shortViewCountText.runs[0].text;
   else if (item.videoPrimaryInfoRenderer?.viewCount?.videoViewCountRenderer?.viewCount?.simpleText) {
      views = item.videoPrimaryInfoRenderer.viewCount.videoViewCountRenderer.viewCount.simpleText;
   } else if (item.accessibility?.accessibilityData?.label) {
      const label = item.accessibility.accessibilityData.label;
      const viewsMatch = label.match(/(\d+[,.]?\d*)\s+(views|vistas)/i);
      if (viewsMatch) {
         views = viewsMatch[1];
      }
   }

   return {
      id,
      title: title || `Video ${id}`,
      rawDuration,
      description,
      publishedText,
      absoluteDate,
      views
   };
};

export const scanYoutubeUrl = async (url: string, mode: 'shorts' | 'videos'): Promise<ScannedVideo[]> => {
  if (!url) return [];
  
  try {
    const encodedUrl = encodeURIComponent(url);
    const proxyUrl = `https://api.allorigins.win/get?url=${encodedUrl}`;
    
    const response = await fetch(proxyUrl);
    const data = await response.json();
    
    if (!data.contents) {
      throw new Error('No se pudo obtener el contenido de la página.');
    }

    const html = data.contents;
    const videos: ScannedVideo[] = [];
    const seenIds = new Set<string>();

    // Strategy 1: Parse ytInitialData
    const ytInitialDataMatch = html.match(/var ytInitialData = (\{[\s\S]*?\});/);
    if (ytInitialDataMatch) {
      try {
        const ytData = JSON.parse(ytInitialDataMatch[1]);
        const items = findVideoItems(ytData);
        
        items.forEach(item => {
           const details = extractVideoDetails(item);
           if (details.id && !seenIds.has(details.id)) {
              seenIds.add(details.id);
              
              let published_at = new Date();
              if (details.absoluteDate) {
                 published_at = new Date(details.absoluteDate);
              } else if (details.publishedText) {
                 published_at = parseRelativeTime(details.publishedText);
              }

              let duration = '00:00';
              if (details.rawDuration) {
                 duration = parseDuration(details.rawDuration);
              } else if (mode === 'shorts') {
                 duration = '00:60';
              } else if (item.thumbnailOverlays && Array.isArray(item.thumbnailOverlays)) {
                 const isLive = (item.thumbnailOverlays as Record<string, any>[]).some((overlay: Record<string, any>) => 
                    overlay.thumbnailOverlayTimeStatusRenderer?.style === 'LIVE' || 
                    overlay.thumbnailOverlayTimeStatusRenderer?.text?.simpleText === 'LIVE' ||
                    overlay.thumbnailOverlayTimeStatusRenderer?.text?.simpleText === 'EN VIVO'
                 );
                 if (isLive) duration = 'LIVE';
              }

              videos.push({
                 id: details.id,
                 title: details.title === 'Video Desconocido' ? `Video ${details.id}` : details.title,
                 url: mode === 'shorts' ? `https://www.youtube.com/shorts/${details.id}` : `https://www.youtube.com/watch?v=${details.id}`,
                 duration,
                 description: details.description,
                 published_at,
                 thumbnail_url: getYoutubeThumbnail(mode === 'shorts' ? `https://www.youtube.com/shorts/${details.id}` : `https://www.youtube.com/watch?v=${details.id}`) || '',
                 views: details.views
              });
           }
        });
      } catch (e) {
         console.error('Error parsing ytInitialData:', e);
      }
    }

    // Strategy 2: ytInitialPlayerResponse
    const ytPlayerMatch = html.match(/var ytInitialPlayerResponse = (\{[\s\S]*?\});/);
    if (ytPlayerMatch) {
       try {
          const playerData = JSON.parse(ytPlayerMatch[1]);
          // Merge microformat into details to ensure date extraction works
          const details = extractVideoDetails({ 
             ...(playerData.videoDetails || {}), 
             microformat: playerData.microformat 
          });
          
          let isLive = false;
          if (playerData.microformat?.playerMicroformatRenderer?.liveBroadcastDetails?.isLiveNow) {
             isLive = true;
             details.rawDuration = 'LIVE';
          }

          if (details.id && !seenIds.has(details.id)) {
             seenIds.add(details.id);

             let published_at = new Date();
             if (details.absoluteDate) {
                published_at = new Date(details.absoluteDate);
             } else if (details.publishedText) {
                published_at = parseRelativeTime(details.publishedText);
             }

             let duration = '00:00';
             if (isLive) duration = 'LIVE';
             else if (details.rawDuration) duration = parseDuration(details.rawDuration);
             else if (mode === 'shorts') duration = '00:60';

             videos.push({
                id: details.id,
                title: details.title,
                url: mode === 'shorts' ? `https://www.youtube.com/shorts/${details.id}` : `https://www.youtube.com/watch?v=${details.id}`,
                duration,
                description: details.description,
                published_at,
                thumbnail_url: getYoutubeThumbnail(mode === 'shorts' ? `https://www.youtube.com/shorts/${details.id}` : `https://www.youtube.com/watch?v=${details.id}`) || '',
                views: details.views
             });
          }
       } catch (e) {
          console.error('Error parsing ytInitialPlayerResponse:', e);
       }
    }

     // Strategy 3: Regex Fallback
     if (videos.length === 0) {
        const videoObjectRegex = /\{"videoId":"([a-zA-Z0-9_-]{11})","title":\{"runs":\[\{"text":"(.*?)"\}\]/g;
        const shortsObjectRegex = /\{"videoId":"([a-zA-Z0-9_-]{11})","headline":\{"simpleText":"(.*?)"\}/g;
        const altObjectRegex = /"title":"(.*?)"\s*,\s*"videoId":"([a-zA-Z0-9_-]{11})"/g;
        
        // Try to find a global publication date for the page if it's a single video/short
        let pagePublishedAt = new Date();
        const dateMatch = html.match(/"(publishDate|uploadDate|datePublished)":"(.*?)"/);
        if (dateMatch) {
           pagePublishedAt = new Date(dateMatch[2]);
        }

        let objMatch;
        const addRegexVideo = (id: string, title: string) => {
           if (!seenIds.has(id) && id.length === 11) {
              seenIds.add(id);
              const cleanTitle = title.replace(/\\u0026/g, '&').replace(/\\"/g, '"').replace(/&amp;/g, '&');
              
              // If we're on a single video/short page, the page date is the video date
              // Otherwise (channel page), we don't have per-video dates in regex strategy easily
              videos.push({
                 id,
                 title: cleanTitle,
                 url: mode === 'shorts' ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`,
                 published_at: pagePublishedAt,
                 duration: url.includes('/live') ? 'LIVE' : (mode === 'shorts' ? '00:60' : '00:00'),
                 thumbnail_url: getYoutubeThumbnail(mode === 'shorts' ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`) || ''
              });
           }
        };

        while ((objMatch = videoObjectRegex.exec(html)) !== null) addRegexVideo(objMatch[1], objMatch[2]);
        videoObjectRegex.lastIndex = 0;
        while ((objMatch = shortsObjectRegex.exec(html)) !== null) addRegexVideo(objMatch[1], objMatch[2]);
        while ((objMatch = altObjectRegex.exec(html)) !== null) addRegexVideo(objMatch[2], objMatch[1]);
     }

    return videos;
  } catch (err) {
    console.error('Error scanning URL:', err);
    throw err;
  }
};
