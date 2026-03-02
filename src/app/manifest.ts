
import { MetadataRoute } from 'next'

/**
 * @fileOverview PWA Manifest Configuration.
 * Optimized to trigger the "Install App" button on Android Chrome.
 * Uses consistent icons and required PWA properties.
 */

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'I-Pay Online',
    short_name: 'I-Pay',
    description: 'I-Pay: New world of online business and transactions',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0284c7',
    icons: [
      {
        src: 'https://picsum.photos/seed/ipaybranding/192/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'https://picsum.photos/seed/ipaybranding/512/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
