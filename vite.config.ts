
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'DailyQuest',
        short_name: 'DailyQuest',
        description: 'Gör vardagens rutiner till små framsteg.',
        theme_color: '#e8eee7',
        background_color: '#f8f7f2',
        display: 'standalone',
        start_url: '/',
        lang: 'sv',
        icons: [
          {
            src: '/app-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/app-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})
