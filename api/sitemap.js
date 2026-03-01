import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const baseUrl = process.env.VITE_SITE_URL || 'https://www.antenaflorida.com';

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Missing Supabase credentials' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Fetch dynamic routes
  const [news, shows, podcasts, team, videos, reels] = await Promise.all([
    supabase.from('news').select('slug, id, created_at').eq('is_published', true),
    supabase.from('shows').select('slug, id, created_at'),
    supabase.from('podcasts').select('slug, id, created_at'),
    supabase.from('team_members').select('slug, id, created_at'),
    supabase.from('videos').select('id, created_at'),
    supabase.from('reels').select('id, created_at'),
  ]);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Routes -->
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/schedule</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/news</loc>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/programas</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/podcasts</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/videos</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/reels</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/galeria</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/equipo</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;

  // Helper to add URL
  const addUrl = (path, date, priority = 0.7) => {
    xml += `
  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${new Date(date).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
  };

  // 1. Dynamic News Items
  news.data?.forEach(item => {
    const identifier = item.slug || item.id;
    if (identifier) {
      addUrl(`/news/${identifier}`, item.created_at, 0.7);
    }
  });

  // 2. Dynamic Shows
  shows.data?.forEach(item => {
    const identifier = item.slug || item.id;
    if (identifier) {
      addUrl(`/programa/${identifier}`, item.created_at, 0.7);
    }
  });

  // 3. Dynamic Podcasts
  podcasts.data?.forEach(item => {
    const identifier = item.slug || item.id;
    if (identifier) {
      addUrl(`/podcasts/${identifier}`, item.created_at, 0.6);
    }
  });

  // 4. Dynamic Team Members
  team.data?.forEach(item => {
    const identifier = item.slug || item.id;
    if (identifier) {
      addUrl(`/equipo/${identifier}`, item.created_at, 0.5);
    }
  });

  // 4b. Dynamic Guests (from guests table - assuming it exists or using similar logic)
  const { data: guests } = await supabase.from('guests').select('slug, id, created_at');
  guests?.forEach(item => {
    const identifier = item.slug || item.id;
    if (identifier) {
      addUrl(`/invitado/${identifier}`, item.created_at, 0.5);
    }
  });

  // 5. Dynamic Videos
  videos.data?.forEach(item => {
    if (item.id) {
      addUrl(`/videos/${item.id}`, item.created_at, 0.5);
    }
  });

  // 6. Dynamic Reels
  reels.data?.forEach(item => {
    if (item.id) {
      addUrl(`/reels/${item.id}`, item.created_at, 0.5);
    }
  });

  xml += `
</urlset>`;

  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.status(200).send(xml);
}
