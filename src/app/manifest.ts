import { MetadataRoute } from 'next'

/**
 * @fileOverview Master PWA Manifest.
 * Strictly configured to trigger "Install" prompts and show the logo.
 */

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'I-Pay Online',
    short_name: 'I-Pay',
    description: 'New world of online business and transactions',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#0284c7',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Dashboard',
        url: '/dashboard',
        icons: [{ src: '/logo.png', sizes: '192x192' }]
      },
      {
        name: 'Sofia AI',
        url: '/dashboard/ai-chat',
        icons: [{ src: '/logo.png', sizes: '192x192' }]
      }
    ]
  }
}
