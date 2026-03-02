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
 
 window.addEventListener('error', (e) => {
   document.body.innerHTML += `<div style="color: red; position: fixed; top: 0; left: 0; z-index: 9999; background: white; padding: 20px;">Global Error: ${e.message}</div>`;
 });
 window.addEventListener('unhandledrejection', (e) => {
   document.body.innerHTML += `<div style="color: red; position: fixed; top: 50px; left: 0; z-index: 9999; background: white; padding: 20px;">Unhandled Promise: ${e.reason}</div>`;
 });

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* @ts-ignore */}
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SiteConfigProvider>
            <ToastProvider>
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
            </ToastProvider>
          </SiteConfigProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
)
