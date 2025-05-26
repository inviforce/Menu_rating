import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Automatically update the service worker
      injectRegister: 'auto',     // Auto inject registration code into your app
      manifest: {
        name: 'Menu Rating',
        short_name: 'Menu Rating',
        description: 'Menu Rating App',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        orientation: 'portrait',
        icons: [
          {
            src: '/logo192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/logo512.png',
            sizes: '512x512',
            type: 'image/png',
          }
        ],
      },
      includeAssets: [
        'favicon.ico', // Ensure favicon is included in the build
      ]
    }),
  ],
})
