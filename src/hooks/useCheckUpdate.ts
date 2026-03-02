import { useEffect } from 'react';
import versionData from '../../version.json';

const CHECK_INTERVAL = 1000 * 60 * 15; // 15 minutes
const UPDATE_AVAILABLE_KEY = 'af_update_available';

export function useCheckUpdate() {
  useEffect(() => {
    // Only run in production
    if (import.meta.env.DEV) return;

    let checkTimeout: NodeJS.Timeout;

    const checkVersion = async () => {
      try {
        const response = await fetch('/version.json?t=' + Date.now(), {
          cache: 'no-store'
        });
        
        if (response.ok) {
          const remoteData = await response.json();
          if (remoteData.version && remoteData.version !== versionData.version) {
            console.log('Nueva versión detectada:', remoteData.version);
            // Marcar que hay actualización (el usuario puede recargar manualmente)
            sessionStorage.setItem(UPDATE_AVAILABLE_KEY, remoteData.version);
            // Disparar evento para que un banner/toast pueda mostrarse
            window.dispatchEvent(new CustomEvent('af-update-available', { detail: { version: remoteData.version } }));
            // Ya no recargamos automáticamente para no interrumpir al usuario
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

export { UPDATE_AVAILABLE_KEY };
