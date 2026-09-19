import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PLATFORM_NAME, PLATFORM_NAME_SHORT, PLATFORM_TAGLINE } from './src/lib/branding';

function readPlatformVersion(): string {
  try {
    const md = readFileSync(resolve(fileURLToPath(new URL('./VERSION.md', import.meta.url))), 'utf8');
    const m = md.match(/Version:\s*(v[\d.]+)/);
    return m?.[1] ?? 'v0';
  } catch {
    return 'v0';
  }
}

function erbVersionJsonPlugin() {
  return {
    name: 'erb-version-json',
    closeBundle() {
      const dir = resolve(fileURLToPath(new URL('./dist', import.meta.url)));
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        resolve(dir, 'version.json'),
        `${JSON.stringify({ version: readPlatformVersion(), builtAt: new Date().toISOString() })}\n`,
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    erbVersionJsonPlugin(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['icon.jpeg', 'favicon.svg', 'apple-touch-icon.svg', 'icons.svg'],
      injectManifest: {
        // الحزمة الرئيسية تجاوزت 4.7MB بعد إضافة تصدير Word/PPT ومساعد الذكاء
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // لا نضمّن html في التخزين المؤقت المسبق لضمان تحميل أحدث نسخة دائماً دون الحاجة لـ Ctrl+Shift+R
        globPatterns: ['**/*.{js,css,ico,png,jpg,jpeg,svg,woff2,woff,ttf}'],
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
        shortcuts: [
          {
            name: 'دخول الطاقم',
            short_name: 'طاقم',
            url: '/login/staff',
            icons: [{ src: '/icon.jpeg', sizes: '512x512', type: 'image/jpeg' }],
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /version\.json$/],
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
    // @headlessui/react → react-aria يستورد مساراً داخلياً غير مُصدَّر في react-stately
    alias: [
      {
        find: 'react-stately/private/flags/flags',
        replacement: fileURLToPath(
          new URL('./node_modules/react-stately/dist/exports/private/flags/flags.mjs', import.meta.url),
        ),
      },
      {
        find: /^@\//,
        replacement: `${fileURLToPath(new URL('./src/', import.meta.url))}`,
      },
    ],
    dedupe: ['react-stately', 'react-aria', '@react-aria/interactions', '@react-aria/focus'],
  },
  optimizeDeps: {
    include: [
      '@microsoft/clarity',
      '@headlessui/react',
      'react-stately',
      '@react-aria/interactions',
      '@react-aria/focus',
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('docx') ||
              id.includes('pptxgenjs') ||
              id.includes('jspdf') ||
              id.includes('xlsx') ||
              id.includes('jszip')
            ) {
              return 'vendor-docs';
            }
            if (id.includes('recharts') || id.includes('@nivo')) {
              return 'vendor-charts';
            }
            if (id.includes('framer-motion') || id.includes('lucide-react')) {
              return 'vendor-ui';
            }
            if (id.includes('@supabase') || id.includes('@tanstack')) {
              return 'vendor-data';
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 1200,
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
      // Versions/ يحتوي ZIPs كبيرة — مراقبتها تسبب EBUSY أثناء الإنشاء
      ignored: ['**/public/manual-qa.html', '**/Versions/**', '**/*.zip'],
    },
  },
});
