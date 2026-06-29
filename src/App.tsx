import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { router } from './router';
import { useAuthStore } from './stores/authStore';
import { TapHandLoader } from './components/ui/TapHandLoader';
import { PwaManager } from './components/pwa/PwaManager';
import { PushNotificationPrompt } from './components/pwa/PushNotificationPrompt';
import { PLATFORM_ICON, PLATFORM_NAME } from './lib/branding';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
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
      <div className="min-h-dvh flex items-center justify-center bg-navy-950 font-cairo content-grid-bg relative" dir="rtl">
        <div className="absolute inset-0 bg-gradient-radial from-gold-500/5 to-transparent pointer-events-none" />
        <div className="flex flex-col items-center gap-4 text-center px-4 relative">
          <img
            src={PLATFORM_ICON}
            alt={PLATFORM_NAME}
            className="w-16 h-16 rounded-2xl object-cover shadow-lg shadow-gold-500/20 animate-float"
          />
          <TapHandLoader label="جاري تحميل المنصة..." />
          {slowLoad && (
            <div className="mt-4 space-y-2">
              <p className="text-white/50 text-xs max-w-xs">
                التحميل يستغرق وقتاً أطول من المعتاد. جرّب تحديث الصفحة أو مسح بيانات الموقع.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-gold-400 text-sm hover:text-gold-300 transition-colors"
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <PwaManager />
      <PushNotificationPrompt />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#122548',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            fontFamily: 'Cairo, sans-serif',
            fontSize: '14px',
            direction: 'rtl',
          },
          success: {
            iconTheme: { primary: '#e6aa32', secondary: '#122548' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#122548' },
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
