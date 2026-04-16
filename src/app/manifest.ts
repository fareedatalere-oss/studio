import { MetadataRoute } from 'next'

/**
 * @fileOverview Dynamic PWA Manifest.
 * REMOVED: Sofia AI shortcut.
 */

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'I-pay online world',
    short_name: 'I-pay',
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
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Dashboard',
        url: '/dashboard',
        icons: [{ src: '/logo.png', sizes: '192x192' }]
      }
    ]
  }
}
