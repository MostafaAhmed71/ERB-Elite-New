import { create } from 'zustand';
import {
  applyThemePreference,
  readStoredThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from '../lib/theme';

interface ThemeStore {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  syncFromSystem: () => void;
}

function persistPreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* ignore */
  }
}

const initialPreference = typeof window !== 'undefined' ? readStoredThemePreference() : 'dark';
const initialResolved =
  typeof window !== 'undefined' ? resolveTheme(initialPreference) : 'dark';

export const useThemeStore = create<ThemeStore>((set, get) => ({
  preference: initialPreference,
  resolved: initialResolved,
  setPreference: (preference) => {
    persistPreference(preference);
    const resolved = applyThemePreference(preference);
    set({ preference, resolved });
  },
  syncFromSystem: () => {
    const { preference } = get();
    if (preference !== 'system') return;
    const resolved = applyThemePreference('system');
    set({ resolved });
  },
}));
