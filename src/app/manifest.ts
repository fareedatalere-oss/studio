
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'I-Pay Online',
    short_name: 'I-Pay',
    description: 'I-pay new world of online business and transactions',
    start_url: '/',
    display: 'standalone',
    background_color: '#001f3f',
    theme_color: '#0284c7',
    icons: [
      {
        src: '/logo.png', // Reference internal public icon for Android installability
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
  }
}
