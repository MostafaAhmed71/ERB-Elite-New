import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';
import { PLATFORM_NAME, PLATFORM_NAME_SHORT, PLATFORM_TAGLINE } from './src/lib/branding';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['icon.jpeg', 'favicon.svg', 'apple-touch-icon.svg', 'icons.svg'],
      injectManifest: {
        // الحزمة الرئيسية تجاوزت 4.7MB بعد إضافة تصدير Word/PPT ومساعد الذكاء
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff2,woff,ttf}'],
      },
      manifest: {
        name: PLATFORM_NAME,
        short_name: PLATFORM_NAME_SHORT,
        description: `${PLATFORM_TAGLINE} — نقاط، أنشطة، اختبارات، وحضور`,
        start_url: '/',
        scope: '/',
        id: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#162e54',
        theme_color: '#162e54',
        lang: 'ar',
        dir: 'rtl',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: '/icon.jpeg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any',
          },
          {
            src: '/icon.jpeg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-media-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [200] },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
      // مهم: لا تفعّل SW في التطوير — يخزّن شاشات المسابقة القديمة ويظهر أن «لا شيء تغيّر»
      devOptions: {
        enabled: false,
      },
    }),
  ],
  // لا تستخدم alias باسم "@" وحده — يتعارض مع حزم npm ذات النطاق مثل @microsoft/clarity
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: `${fileURLToPath(new URL('./src/', import.meta.url))}`,
      },
    ],
  },
  optimizeDeps: {
    include: ['@microsoft/clarity'],
  },
  server: {
    port: 5173,
    strictPort: true,
    // localhost صريح يجنّب فشل WebSocket (400) مع host: true على بعض البيئات
    host: 'localhost',
    open: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      clientPort: 5173,
    },
    watch: {
      // ملف QA الثابت يسبب إعادة تحميل متكررة بدون فائدة للتطبيق
      ignored: ['**/public/manual-qa.html'],
    },
  },
});
