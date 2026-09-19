import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { router } from './router';
import { useAuthStore } from './stores/authStore';
import { TapHandLoader } from './components/ui/TapHandLoader';
import { PwaManager } from './components/pwa/PwaManager';
import { PushNotificationPrompt } from './components/pwa/PushNotificationPrompt';
import { PlatformErrorBoundary } from './components/dev/PlatformErrorBoundary';
import { ThemeProvider } from './components/theme/ThemeProvider';
import { PLATFORM_ICON, PLATFORM_NAME } from './lib/branding';
import { reportMildIssue } from './lib/platformErrors';
import { normalizeUnknownError, safeStringify } from './lib/errorDiagnostics';
import { useThemeStore } from './stores/themeStore';
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const normalized = normalizeUnknownError(error);
      const keyStr = safeStringify(query.queryKey, 120) || 'query';
      reportMildIssue({
        message: normalized.message,
        error,
        source: 'frontend',
        severity: 'warning',
        context: {
          type: 'react_query',
          kind: 'query',
          queryKey: query.queryKey,
          error_name: normalized.name,
          stack_short: normalized.stackShort,
        },
        fingerprint: `rq:q:${keyStr}:${normalized.message.slice(0, 80)}`,
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      const normalized = normalizeUnknownError(error);
      reportMildIssue({
        message: normalized.message,
        error,
        source: 'frontend',
        severity: 'warning',
        context: {
          type: 'react_query',
          kind: 'mutation',
          mutationKey: mutation.options.mutationKey,
          error_name: normalized.name,
          stack_short: normalized.stackShort,
        },
        fingerprint: `rq:m:${String(mutation.options.mutationKey ?? 'anon').slice(0, 80)}:${normalized.message.slice(0, 80)}`,
      });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false, // لا تعيد تحميل الاستعلامات وحجب الواجهة عند تبديل التبويبات
    },
  },
});

function AppContent() {
  const { initialize, initialized } = useAuthStore();
  const [slowLoad, setSlowLoad] = useState(false);

  useEffect(() => {
    initialize();
    const timer = setTimeout(() => setSlowLoad(true), 10000);
    return () => clearTimeout(timer);
  }, [initialize]);

  if (!initialized) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background font-cairo relative" dir="rtl">
        <div className="flex flex-col items-center gap-4 text-center px-4 relative">
          <img
            src={PLATFORM_ICON}
            alt={PLATFORM_NAME}
            className="w-16 h-16 rounded-2xl object-cover border border-[var(--border)] animate-float"
          />
          <TapHandLoader label="جاري تحميل المنصة..." />
          {slowLoad && (
            <div className="mt-4 space-y-2">
              <p className="text-text-secondary text-xs max-w-xs">
                التحميل يستغرق وقتاً أطول من المعتاد. جرّب تحديث الصفحة أو مسح بيانات الموقع.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-accent text-sm hover:opacity-80 transition-opacity"
              >
                إعادة تحميل الصفحة
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

function ThemedToaster() {
  const resolved = useThemeStore((s) => s.resolved);
  const isDark = resolved === 'dark';
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3500,
        style: {
          background: isDark ? '#122548' : '#FFFFFF',
          color: isDark ? '#fff' : '#172B4D',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #D9E2EC',
          borderRadius: '12px',
          fontFamily: 'Cairo, sans-serif',
          fontSize: '14px',
          direction: 'rtl',
        },
        success: {
          iconTheme: {
            primary: isDark ? '#e6aa32' : '#C99A2E',
            secondary: isDark ? '#122548' : '#FFFFFF',
          },
        },
        error: {
          iconTheme: {
            primary: isDark ? '#ef4444' : '#D64545',
            secondary: isDark ? '#122548' : '#FFFFFF',
          },
        },
      }}
    />
  );
}

function App() {
  return (
    <PlatformErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AppContent />
          <PwaManager />
          <PushNotificationPrompt />
          <ThemedToaster />
        </ThemeProvider>
      </QueryClientProvider>
    </PlatformErrorBoundary>
  );
}

export default App;
