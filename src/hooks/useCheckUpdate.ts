import { useEffect } from 'react';
import versionData from '../../version.json';

const CHECK_INTERVAL = 1000 * 60 * 15; // 15 minutes

export function useCheckUpdate() {
  useEffect(() => {
    // Only run in production
    if (import.meta.env.DEV) return;

    let checkTimeout: NodeJS.Timeout;

    const checkVersion = async () => {
      try {
        // Fetch with cache-busting just in case, though vercel.json should handle it
        const response = await fetch('/version.json?t=' + Date.now(), {
          cache: 'no-store'
        });
        
        if (response.ok) {
          const remoteData = await response.json();
          if (remoteData.version && remoteData.version !== versionData.version) {
            console.log('Nueva versión detectada:', remoteData.version);
            
            // Optional: You could show a toast here instead of immediate reload
            // For now, let's do immediate reload if it's been some time
            window.location.reload();
          }
        }
      } catch (error) {
        console.error('Error checking version:', error);
      }
      
      checkTimeout = setTimeout(checkVersion, CHECK_INTERVAL);
    };

    checkVersion();

    return () => clearTimeout(checkTimeout);
  }, []);
}
