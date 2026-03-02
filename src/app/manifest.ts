
import { MetadataRoute } from 'next'

/**
 * @fileOverview PWA Manifest Configuration.
 * Optimized with high-res icons and mandatory fields to trigger the "Install App" prompt on Android.
 */

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'I-Pay Online',
    short_name: 'I-Pay',
    description: 'I-Pay: New world of online business and transactions',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#0284c7',
    icons: [
      {
        src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=192&h=192&fit=crop&q=80',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=512&h=512&fit=crop&q=80',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
