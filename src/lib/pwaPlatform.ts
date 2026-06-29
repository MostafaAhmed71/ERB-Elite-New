/** هل التطبيق مثبّتاً كـ PWA (بدون شريط المتصفح) */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone / iPad */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOs =
    navigator.platform === 'MacIntel' && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOs;
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

/** هل المتصفح الحالي Safari على iOS */
export function isIosSafari(): boolean {
  if (!isIos()) return false;
  const ua = navigator.userAgent;
  const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return !isOtherBrowser;
}

export function canShowInstallPrompt(): boolean {
  return !isStandalonePwa() && (isIos() || isAndroid() || typeof window !== 'undefined');
}

const IOS_DISMISS_KEY = 'erb_pwa_ios_install_dismissed';

export function wasIosInstallDismissed(): boolean {
  try {
    return localStorage.getItem(IOS_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissIosInstall(): void {
  try {
    localStorage.setItem(IOS_DISMISS_KEY, '1');
  } catch {
    /* ignore */
  }
}
