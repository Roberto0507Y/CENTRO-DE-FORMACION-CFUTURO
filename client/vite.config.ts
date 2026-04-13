import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

const FRAME_SOURCES = [
  'https://pay.ebi.com.gt',
  'https://link.ebi.com.gt',
  'https://www.youtube.com',
  'https://player.vimeo.com',
]

function parseOrigin(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    return new URL(raw).origin
  } catch {
    return null
  }
}

function buildContentSecurityPolicy(apiOrigin: string | null): string {
  const connectSources = ["'self'", ...(apiOrigin ? [apiOrigin] : [])].join(' ')
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    "script-src 'self'",
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "style-src-elem 'self' 'unsafe-inline'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
    `frame-src 'self' ${FRAME_SOURCES.join(' ')}`,
    "media-src 'self' blob: data: https:",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join('; ')
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=(), browsing-topics=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy': 'same-site',
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiOrigin = parseOrigin(env.VITE_API_URL)
  const previewSecurityHeaders = {
    ...securityHeaders,
    'Content-Security-Policy': buildContentSecurityPolicy(apiOrigin),
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      headers: securityHeaders,
    },
    preview: {
      headers: previewSecurityHeaders,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('react-router')) return 'router'
            if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'motion'
            if (id.includes('axios')) return 'http'
            return 'vendor'
          },
        },
      },
    },
  }
})
