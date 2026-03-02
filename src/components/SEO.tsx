import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { getValidImageUrl } from '@/lib/utils';
import { DEFAULT_SITE_CONFIG } from '@/lib/constants';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'podcast' | 'profile' | 'video';
  themeColor?: string;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
  favicon?: string;
  keywords?: string;
  robots?: string;
  schema?: any;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  image,
  url,
  type = 'website',
  themeColor,
  article,
  favicon,
  keywords,
  robots = 'index, follow',
  schema,
}) => {
  const { config } = useSiteConfig();
  
  // Wait for config to be loaded to have correct site name/slogan in meta tags
  // but provide fallbacks for initial render
  const siteName = config?.site_name || DEFAULT_SITE_CONFIG.name;
  const siteSlogan = config?.slogan || DEFAULT_SITE_CONFIG.slogan;
  
  const seoTitle = title 
    ? `${title} | ${siteName}` 
    : `${siteName} - ${siteSlogan}`;
  
  // Fix: use description property correctly or fallback
  const siteDescription = config?.station_description || DEFAULT_SITE_CONFIG.description;
  const rawDescription = description || siteDescription;
  
  // Truncate description to safe SEO length (~160-300 chars)
  const seoDescription = rawDescription?.length > 300 
    ? `${rawDescription.substring(0, 297)}...` 
    : rawDescription;
  
  const seoKeywords = keywords || config?.keywords || DEFAULT_SITE_CONFIG.keywords || '';

  const seoImage = image || getValidImageUrl(config?.logo_url, 'logo') || DEFAULT_SITE_CONFIG.defaultImage;
  const seoUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  const HelmetAny = Helmet as any;
  const finalThemeColor = themeColor || (config?.top_bar_enabled && config?.top_bar_bg_color ? config.top_bar_bg_color : undefined);

  return (
    <HelmetAny>
      {/* Basic Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      {seoKeywords && <meta name="keywords" content={seoKeywords} />}
      <meta name="robots" content={robots} />
      <link rel="canonical" href={seoUrl} />
      {favicon && <link rel="icon" href={favicon} />}

      {/* Structured Data (JSON-LD) */}
      {schema && (
        <script 
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={seoUrl} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={seoImage} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={seoUrl} />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={seoImage} />

      {/* Article Specific Tags */}
      {type === 'article' && article && (
        <>
          {article.publishedTime && (
            <meta property="article:published_time" content={article.publishedTime} />
          )}
          {article.modifiedTime && (
            <meta property="article:modified_time" content={article.modifiedTime} />
          )}
          {article.author && <meta property="article:author" content={article.author} /> }
          {article.section && <meta property="article:section" content={article.section} /> }
          {article.tags && article.tags.map(tag => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        </>
      )}

      {/* Theme Color & Mobile App Tags */}
      {finalThemeColor && (
        <>
          <meta name="theme-color" content={finalThemeColor} />
          <meta name="theme-color" content={finalThemeColor} media="(prefers-color-scheme: light)" />
          <meta name="theme-color" content={finalThemeColor} media="(prefers-color-scheme: dark)" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        </>
      )}
    </HelmetAny>
  );
};
