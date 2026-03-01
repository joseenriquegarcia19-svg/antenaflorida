/**
 * Utility to fetch high-quality track artwork from external services.
 */

interface iTunesResult {
  artworkUrl100: string;
  artistName: string;
  trackName: string;
}

const artworkCache = new Map<string, string>();

/**
 * Fetches high-quality artwork for a given track and artist.
 * Priority: iTunes Search API -> Fallback
 */
export async function getTrackArtwork(title: string, artist: string): Promise<string | null> {
  const cacheKey = `${title}-${artist}`.toLowerCase();
  if (artworkCache.has(cacheKey)) {
    return artworkCache.get(cacheKey)!;
  }

  try {
    // Clean up title and artist for better matching (remove "con ...", "(Live)", etc.)
    const cleanTitle = title.split('(')[0].split('-')[0].trim();
    const cleanArtist = artist.split('(')[0].split('con')[0].split('&')[0].trim();
    
    const searchTerm = encodeURIComponent(`${cleanArtist} ${cleanTitle}`);
    const response = await fetch(`https://itunes.apple.com/search?term=${searchTerm}&limit=1&entity=song`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.resultCount > 0) {
        const result = data.results[0] as iTunesResult;
        // Upgrade 100x100 to 1000x1000 for high quality
        const highResArtwork = result.artworkUrl100.replace('100x100bb.jpg', '1000x1000bb.jpg');
        artworkCache.set(cacheKey, highResArtwork);
        return highResArtwork;
      }
    }
    
    // Fallback: Try just the artist
    const artistSearchTerm = encodeURIComponent(cleanArtist);
    const artistResponse = await fetch(`https://itunes.apple.com/search?term=${artistSearchTerm}&limit=1&entity=musicArtist`);
    
    if (artistResponse.ok) {
        const data = await artistResponse.json();
        if (data.resultCount > 0) {
            // Note: Artist entities don't always have artwork in the same way, 
            // but we can try to find a popular song by them.
            const songByArtistResponse = await fetch(`https://itunes.apple.com/search?term=${artistSearchTerm}&limit=1&entity=song`);
            if (songByArtistResponse.ok) {
                const songData = await songByArtistResponse.json();
                if (songData.resultCount > 0) {
                    const highResArtwork = songData.results[0].artworkUrl100.replace('100x100bb.jpg', '1000x1000bb.jpg');
                    artworkCache.set(cacheKey, highResArtwork);
                    return highResArtwork;
                }
            }
        }
    }

  } catch (error) {
    console.error('Error fetching artwork from iTunes:', error);
  }

  return null;
}
/**
 * Structured Data Generators (JSON-LD)
 */

interface SiteInfo {
  name: string;
  url: string;
  logo: string;
  description: string;
}

export function generateStationSchema(site: SiteInfo) {
  return {
    '@context': 'https://schema.org',
    '@type': 'RadioStation',
    'name': site.name,
    'url': site.url,
    'logo': site.logo,
    'image': site.logo,
    'description': site.description,
    'address': {
      '@type': 'PostalAddress',
      'addressLocality': 'Florida',
      'addressCountry': 'US'
    },
    'sameAs': [
      'https://www.facebook.com/antenaflorida',
      'https://www.instagram.com/antenaflorida',
      'https://twitter.com/antenaflorida'
    ]
  };
}

export function generateNewsSchema(news: { title: string; excerpt?: string; content?: string; image_url: string; created_at: string; updated_at?: string; profiles?: { full_name?: string; id?: string; slug?: string } }, siteName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    'headline': news.title,
    'description': news.excerpt || news.content?.substring(0, 160),
    'image': [news.image_url],
    'datePublished': news.created_at,
    'dateModified': news.updated_at || news.created_at,
    'author': [{
      '@type': 'Person',
      'name': news.profiles?.full_name || siteName,
      'url': news.profiles?.id ? `https://www.antenaflorida.com/equipo/${news.profiles.slug || news.profiles.id}` : undefined
    }],
    'publisher': {
      '@type': 'Organization',
      'name': siteName,
      'logo': {
        '@type': 'ImageObject',
        'url': 'https://www.antenaflorida.com/logo.jpg'
      }
    }
  };
}

export function generatePodcastSchema(podcast: { title: string; description?: string; episode_number?: string | number; duration?: string; created_at: string; audio_url?: string; category?: string }, siteName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    'name': podcast.title,
    'description': podcast.description,
    'episodeNumber': podcast.episode_number,
    'duration': podcast.duration,
    'datePublished': podcast.created_at,
    'associatedMedia': podcast.audio_url ? {
      '@type': 'MediaObject',
      'contentUrl': podcast.audio_url
    } : undefined,
    'partOfSeries': {
      '@type': 'PodcastSeries',
      'name': podcast.category || 'Podcasts Antena Florida',
      'url': 'https://www.antenaflorida.com/podcasts'
    },
    'publisher': {
      '@type': 'Organization',
      'name': siteName
    }
  };
}

export function generateShowSchema(show: { title: string; description?: string; image_url: string; slug?: string; id: string }, siteName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'RadioSeries',
    'name': show.title,
    'description': show.description,
    'image': show.image_url,
    'url': `https://www.antenaflorida.com/programa/${show.slug || show.id}`,
    'publisher': {
      '@type': 'Organization',
      'name': siteName
    }
  };
}

export function generatePersonSchema(person: { name?: string; full_name?: string; bio?: string; summary?: string; image_url?: string; avatar_url?: string; role?: string; position?: string; slug?: string; id: string; social_links?: Record<string, string> }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    'name': person.name || person.full_name,
    'description': person.bio || person.summary,
    'image': person.image_url || person.avatar_url,
    'jobTitle': person.role || person.position,
    'url': `https://www.antenaflorida.com/${person.slug ? 'invitado' : 'equipo'}/${person.slug || person.id}`,
    'sameAs': person.social_links ? Object.values(person.social_links).filter(Boolean) : []
  };
}
