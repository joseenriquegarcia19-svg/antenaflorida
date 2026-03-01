import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'url'

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'
  const reactPlugin = isDev
    ? react({
        babel: {
          plugins: ['react-dev-locator'],
        },
      })
    : react()

  return {
    cacheDir: './.vite',
    resolve: {
      alias: isDev ? {
        '@vercel/speed-insights/react': fileURLToPath(new URL('./src/components/SpeedInsightsStub.tsx', import.meta.url))
      } : ({} as Record<string, string>)
    },
    build: {
      sourcemap: 'hidden',
    },
    plugins: [
      reactPlugin,
      tsconfigPaths(),
    ],
    server: {
      proxy: {
        '/api/live365': {
          target: 'https://api.live365.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/live365/, ''),
        },
      },
    },
  }
})
