import { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { PLATFORM_NAME_SHORT } from '../../lib/branding';
import {
  dismissIosInstall,
  isIos,
  isStandalonePwa,
  wasIosInstallDismissed,
} from '../../lib/pwaPlatform';
import { IosInstallGuide } from './IosInstallGuide';
import clsx from 'clsx';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** يُستدعى من InstallAppButton على Android */
let androidInstallHandler: (() => void) | null = null;

export function triggerAndroidInstall(): void {
  androidInstallHandler?.();
}

/** تسجيل SW للتحديثات — إنتاج فقط مع إشعار للمستخدم بدلاً من إعادة التحميل القسري */
function PwaUpdateBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [applying, setApplying] = useState(false);
  const [hasExternalUpdate, setHasExternalUpdate] = useState(false);
  const applyingRef = useRef(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: false,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // نتحقق من التحديث بعد فترة بهدوء وبشكل متباعد، دون أي استماع لـ visibilitychange أو pageshow
      const check = () => {
        void registration.update().catch(() => undefined);
      };
      const initialTimer = window.setTimeout(check, 60_000);
      const interval = window.setInterval(check, 60 * 60 * 1000); // كل ساعة
      return () => {
        window.clearTimeout(initialTimer);
        window.clearInterval(interval);
      };
    },
    onRegisterError() {
      /* optional */
    },
  });

  // التحكم بإعادة التحميل عند تغيير الـ Service Worker:
  // يُعاد التحميل فقط إذا كان المستخدم قد وافق وضغط على زر التحديث
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      if (applyingRef.current) {
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  // فحص إصدار المنصة بهدوء كل 30 دقيقة بدون إعادة تحميل تلقائية
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    let stopped = false;
    const KEY = 'erb_build_id';
    const poll = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string; builtAt?: string };
        const id = `${data.version ?? ''}|${data.builtAt ?? ''}`;
        const prev = sessionStorage.getItem(KEY);
        if (prev && prev !== id) {
          // إظهار إشعار التحديث بدلاً من إعادة تحميل الصفحة في وجه المستخدم
          setHasExternalUpdate(true);
          return;
        }
        sessionStorage.setItem(KEY, id);
      } catch {
        /* شبكة */
      }
    };
    const t = window.setInterval(() => {
      if (!stopped) void poll();
    }, 30 * 60 * 1000);
    return () => {
      stopped = true;
      window.clearInterval(t);
    };
  }, []);

  const showPrompt = (needRefresh || hasExternalUpdate) && !dismissed;

  const handleApplyUpdate = async () => {
    applyingRef.current = true;
    setApplying(true);
    try {
      if (needRefresh) {
        await updateServiceWorker(true);
      } else {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  if (!showPrompt) return null;

  return (
    <div
      className={clsx(
        'fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[80]',
        'p-4 rounded-2xl border border-cyan-500/30 bg-navy-900/95 backdrop-blur-xl shadow-2xl pb-safe-offset animate-in fade-in slide-in-from-bottom-3 duration-300',
      )}
      dir="rtl"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center flex-shrink-0">
          <RefreshCw className={clsx('w-5 h-5 text-cyan-400', applying && 'animate-spin')} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">تحديث جديد متوفر</p>
          <p className="text-white/60 text-xs mt-1 leading-relaxed">
            يتوفر إصدار جديد من المنصة مع تحسينات جديدة. اضغط لتطبيق التحديث.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              disabled={applying}
              onClick={handleApplyUpdate}
              className="flex-1 px-3 py-2 rounded-xl bg-cyan-500 text-navy-950 text-xs font-bold hover:bg-cyan-400 transition-colors disabled:opacity-50"
            >
              {applying ? 'جاري التحديث…' : 'تحديث الآن'}
            </button>
            <button
              type="button"
              disabled={applying}
              onClick={() => setDismissed(true)}
              className="px-3 py-2 rounded-xl border border-white/10 text-white/60 text-xs hover:bg-white/5 transition-colors"
            >
              لاحقاً
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 text-white/30 hover:text-white/70 transition-colors flex-shrink-0"
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function PwaManager() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroidInstall, setShowAndroidInstall] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const dismissedAndroid = useRef(false);

  useEffect(() => {
    androidInstallHandler = () => {
      if (installEvent) setShowAndroidInstall(true);
    };
    return () => {
      androidInstallHandler = null;
    };
  }, [installEvent]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      if (dismissedAndroid.current) return;
      setInstallEvent(e as BeforeInstallPromptEvent);
      setShowAndroidInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (isStandalonePwa() || !isIos() || wasIosInstallDismissed()) return;

    const timer = window.setTimeout(() => setShowIosGuide(true), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  const handleAndroidInstall = async () => {
    if (!installEvent) {
      setShowAndroidInstall(true);
      return;
    }
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') {
      setShowAndroidInstall(false);
      setInstallEvent(null);
    }
  };

  const dismissAndroid = () => {
    dismissedAndroid.current = true;
    setShowAndroidInstall(false);
  };

  const dismissIos = () => {
    dismissIosInstall();
    setShowIosGuide(false);
  };

  return (
    <>
      {showAndroidInstall && !isIos() && (
        <div
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[70] p-4 rounded-2xl border border-gold-500/25 bg-navy-900/95 backdrop-blur-xl shadow-2xl pb-safe-offset"
          dir="rtl"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-500/25 flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-gold-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">تثبيت التطبيق</p>
              <p className="text-white/50 text-xs mt-1 leading-relaxed">
                ثبّت {PLATFORM_NAME_SHORT} على جهازك للوصول السريع والعمل دون اتصال جزئي.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleAndroidInstall}
                  className="flex-1 px-3 py-2 rounded-xl bg-gold-500 text-navy-950 text-xs font-bold hover:bg-gold-400 transition-colors"
                >
                  تثبيت
                </button>
                <button
                  type="button"
                  onClick={dismissAndroid}
                  className="px-3 py-2 rounded-xl border border-white/10 text-white/60 text-xs hover:bg-white/5 transition-colors"
                >
                  لاحقاً
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissAndroid}
              className="p-1 text-white/30 hover:text-white/70 transition-colors flex-shrink-0"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <IosInstallGuide open={showIosGuide} onClose={dismissIos} />

      {import.meta.env.PROD ? <PwaUpdateBanner /> : null}
    </>
  );
}
