export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  link_url?: string;
  created_at: string;
}

export interface News {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  image_url: string;
  category: string;
  author_id?: string;
  featured?: boolean;
  sidebar_content?: string;
  views?: number;
  shares?: number;
  created_at: string;
  updated_at: string;
  news_likes?: { count: number }[];
  news_comments?: { count: number }[];
}

export interface Comment {
  id: string;
  news_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    full_name: string;
    avatar_url: string;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface SiteConfig {
  site_name: string;
  slogan: string;
  logo_url: string;
  maintenance_mode: boolean;
  news_carousel_interval?: number;
  news_pinned_news_id?: string;
  news_pinned_categories?: string[];
  news_carousel_effect?: 'slide' | 'fade';
  news_hashtags?: string;
  enable_ai_post_generator?: boolean;
  enable_supabase_image_transformations?: boolean; // Added this line
  social_links?: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    x?: string;
    tiktok?: string;
  };
  keywords?: string;
}

export interface Station {
  id: string;
  name: string;
  stream_url: string;
  logo_url?: string;
  description?: string;
}

export interface Promotion {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  link_url?: string;
}

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}
