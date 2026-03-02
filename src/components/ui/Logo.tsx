import React, { useEffect, useRef } from 'react';
import { isVideo, getValidImageUrl } from '@/lib/utils';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { useGlobalVideoSync } from '@/contexts/GlobalVideoContext';

interface LogoProps {
  className?: string;
  autoPlay?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-full h-full object-contain", autoPlay = true }) => {
  const { config } = useSiteConfig();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Try to use sync context, but fallback gracefully if not present
  let syncContext;
  try {
    syncContext = useGlobalVideoSync();
  } catch (e) {
    syncContext = null;
  }

  useEffect(() => {
    const video = videoRef.current;
    if (video && syncContext) {
      syncContext.registerVideo(video);
      return () => syncContext.unregisterVideo(video);
    }
  }, [syncContext]);

  if (isVideo(config?.logo_url)) {
    return (
      <video 
        ref={videoRef}
        src={config?.logo_url || ''} 
        className={`${className} object-cover`}
        autoPlay={autoPlay}
        muted 
        loop 
        playsInline 
      />
    );
  }

  return (
    <img 
      src={getValidImageUrl(config?.logo_url, 'logo')} 
      alt={config?.site_name || 'Logo'} 
      className={`${className} bg-transparent`}
      width={128}
      height={128}
    />
  );
};