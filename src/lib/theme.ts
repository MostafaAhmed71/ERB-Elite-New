export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'erb-elite-theme';

export const THEME_LABELS: Record<ThemePreference, string> = {
  light: 'فاتح',
  dark: 'داكن',
  system: 'حسب الجهاز',
};

export const THEME_OPTIONS: ThemePreference[] = ['light', 'dark', 'system'];

export const THEME_COLOR_LIGHT = '#F7F9FC';
export const THEME_COLOR_DARK = '#162e54';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function readStoredThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(raw)) return raw;
  } catch {
    /* ignore */
  }
  return 'dark';
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return getSystemTheme();
  return preference;
}

/** يطبّق الثيم على <html> قبل/أثناء التحميل لمنع وميض خاطئ */
export function applyResolvedTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  root.dataset.theme = resolved;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute(
      'content',
      resolved === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT,
    );
  }
}

export function applyThemePreference(preference: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(preference);
  applyResolvedTheme(resolved);
  return resolved;
}
