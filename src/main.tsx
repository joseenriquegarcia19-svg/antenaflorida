import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { PaletteProvider } from './contexts/PaletteContext'
import { PlayerProvider } from './contexts/PlayerContext'
import { SiteConfigProvider } from './contexts/SiteConfigContext'
import { WeatherProvider } from './contexts/WeatherContext'
import { ToastProvider } from './contexts/ToastContext'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is fresh for 5 minutes
      staleTime: 1000 * 60 * 5,
      // Cache data for 30 minutes
      gcTime: 1000 * 60 * 30,
      // Retry failed queries 1 time
      retry: 1,
      // Refetch on window focus (optional, maybe disable to save even more requests)
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* @ts-ignore */}
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <SiteConfigProvider>
          <ToastProvider>
            <AuthProvider>
              <PaletteProvider>
                <ThemeProvider>
                  <WeatherProvider>
                    <PlayerProvider>
                      <App />
                      <Analytics />
                    </PlayerProvider>
                  </WeatherProvider>
                </ThemeProvider>
              </PaletteProvider>
            </AuthProvider>
          </ToastProvider>
        </SiteConfigProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
)