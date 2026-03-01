
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'I-Pay Online',
    short_name: 'I-Pay',
    description: 'I-pay new world of online business and transactions',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#001f3f',
    theme_color: '#0284c7',
    icons: [
      {
        src: 'https://picsum.photos/seed/ipay-pwa-192/192/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'https://picsum.photos/seed/ipay-pwa-512/512/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
