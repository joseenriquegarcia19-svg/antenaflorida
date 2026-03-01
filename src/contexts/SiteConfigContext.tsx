import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface SiteConfig {
  id: string;
  site_name: string | null;
  slogan: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_address: string | null;
  social_facebook: string | null;
  social_x: string | null;
  social_instagram: string | null;
  social_youtube: string | null;
  social_tiktok: string | null;
  social_whatsapp: string | null;
  frequency_value: string | null;
  frequency_type: string | null;
  news_hashtags: string | null;
  creation_date: string | null;
  top_bar_enabled?: boolean;
  top_bar_left_items?: string[];
  top_bar_right_items?: string[];
  top_bar_left_mode?: 'sequence' | 'random';
  top_bar_right_mode?: 'sequence' | 'random';
  top_bar_bg_color?: string;
  top_bar_text_color?: string;
  promotions_interval?: number;
  station_description?: string;
  listening_platforms_live365?: string;
  listening_platforms_radioline?: string;
  listening_platforms_roku?: string;
  listening_platforms_tunein?: string;
  ceo_member_id?: string;
  news_pinned_categories?: string[];
  enable_ai_post_generator?: boolean;
  header_bg_image_url?: string | null;
  header_bg_position_x?: number;
  header_bg_position_y?: number;
  header_bg_scale?: number;
  header_bg_rotation?: number;
  header_bg_opacity?: number;
  header_bg_grayscale?: boolean;
  enable_supabase_image_transformations?: boolean;
  keywords?: string | null;
  robots?: string | null;
}

export interface PageMaintenance {
  route: string;
  maintenance_enabled: boolean;
  maintenance_message: string | null;
}

interface SiteConfigContextType {
  config: SiteConfig | null;
  categories: string[];
  popularCategories: string[];
  categoryStats: [string, number][];
  popularTags: { tag: string; views: number }[];
  loading: boolean;
  refresh: () => Promise<void>;
  updateConfig: (newConfig: Partial<SiteConfig>) => Promise<void>; // Add this
  getMaintenanceForPath: (pathname: string) => { enabled: boolean; message: string };
}

const SiteConfigContext = createContext<SiteConfigContextType | undefined>(undefined);

function normalizePathname(pathname: string) {
  const clean = pathname.split('?')[0].split('#')[0];
  if (clean.length > 1 && clean.endsWith('/')) return clean.slice(0, -1);
  return clean;
}

function matchRoute(pattern: string, pathname: string) {
  const p = normalizePathname(pattern);
  const path = normalizePathname(pathname);

  if (!p.includes(':')) return p === path;

  const pParts = p.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (pParts.length !== pathParts.length) return false;

  for (let i = 0; i < pParts.length; i += 1) {
    const pp = pParts[i];
    const ap = pathParts[i];
    if (pp.startsWith(':')) continue;
    if (pp !== ap) return false;
  }
  return true;
}

export const SiteConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [maintenance, setMaintenance] = useState<PageMaintenance[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [popularCategories, setPopularCategories] = useState<string[]>([]);
  const [categoryStats, setCategoryStats] = useState<[string, number][]>([]);
  const [popularTags, setPopularTags] = useState<{ tag: string; views: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [
      { data: cfgData }, 
      { data: maintData }, 
      { data: catsData },
      { data: newsStats }
    ] = await Promise.all([
      supabase.from('site_config').select('*').limit(1).maybeSingle(),
      supabase.from('page_maintenance').select('route, maintenance_enabled, maintenance_message'),
      supabase.from('news_categories').select('name').order('name'),
      supabase.from('news').select('category, views, tags').order('created_at', { ascending: false }).limit(100),
    ]);

    if (cfgData) setConfig(cfgData as SiteConfig);
    if (maintData) setMaintenance(maintData as PageMaintenance[]);
    if (catsData) setCategories(catsData.map(c => c.name));

    // Calculate popular categories and tags
    if (newsStats) {
      const catViews: Record<string, number> = {};
      const catCounts: Record<string, number> = {};
      const tagCounts: Record<string, number> = {};

      const tagViews: Record<string, number> = {};

      newsStats.forEach(item => {
        // Categories
        if (item.category) {
          const cats = item.category.split(',').map(c => c.trim()).filter(Boolean);
          cats.forEach(cat => {
            catViews[cat] = (catViews[cat] || 0) + (item.views || 0);
            catCounts[cat] = (catCounts[cat] || 0) + 1;
          });
        }

        // Tags
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach(tag => {
            if (tag) {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
              tagViews[tag] = (tagViews[tag] || 0) + (item.views || 0);
            }
          });
        }
      });

      // Popular Categories (by views)
      const sortedByViews = Object.entries(catViews)
        .sort(([, a], [, b]) => b - a)
        .map(([name]) => name);
      setPopularCategories(sortedByViews.slice(0, 10));

      // Category Stats (by frequency, for cloud)
      const stats = Object.entries(catCounts)
        .sort(([, a], [, b]) => b - a);
      setCategoryStats(stats);

      // Popular Tags (by views)
      const sortedTags = Object.entries(tagViews)
        .sort(([, a], [, b]) => b - a)
        .map(([tag, views]) => ({ tag, views }));
      setPopularTags(sortedTags.slice(0, 50));
    }
  };

  const updateConfig = async (newConfig: Partial<SiteConfig>) => {
    if (!config) throw new Error('Config not loaded');
    const { data, error } = await supabase
      .from('site_config')
      .update(newConfig)
      .eq('id', config.id)
      .select();

    if (error) throw error;
    if (data) setConfig(data[0]);
  };

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();

    // Subscribe to site_config changes
    const configChannel = supabase
      .channel('site_config_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_config' }, () => {
        refresh();
      })
      .subscribe();

    // Subscribe to news_categories changes
    const categoriesChannel = supabase
      .channel('news_categories_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news_categories' }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(configChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, []);

  useEffect(() => {
    if (config) {
      // Safari macOS specific: Update HTML background to tint the window
      // And update theme-color meta tag for Mobile Safari / Chrome
      const color = (config.top_bar_enabled && config.top_bar_bg_color) ? config.top_bar_bg_color : '#38761D';
      
      const metaThemeColor = document.getElementById('theme-color');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', color);
      }
    }
  }, [config]);

  const getMaintenanceForPath = useMemo(() => {
    return (pathname: string) => {
      const path = normalizePathname(pathname);
      for (const rule of maintenance) {
        if (!rule.maintenance_enabled) continue;
        if (matchRoute(rule.route, path)) {
          return {
            enabled: true,
            message: rule.maintenance_message || 'Estamos en mantenimiento. Vuelve pronto.',
          };
        }
      }
      return { enabled: false, message: '' };
    };
  }, [maintenance]);

  return (
    <SiteConfigContext.Provider
      value={{
        config,
        categories,
        popularCategories,
        categoryStats,
        popularTags,
        loading,
        refresh,
        updateConfig, // Add this
        getMaintenanceForPath,
      }}
    >
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) throw new Error('useSiteConfig must be used within a SiteConfigProvider');
  return ctx;
}

