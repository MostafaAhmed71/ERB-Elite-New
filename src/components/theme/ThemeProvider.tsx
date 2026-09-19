import { useEffect } from 'react';
import { applyThemePreference } from '../../lib/theme';
import { useThemeStore } from '../../stores/themeStore';

/** يزامن class على <html> ويستمع لتغيير إعدادات النظام عند اختيار «حسب الجهاز» */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useThemeStore((s) => s.preference);
  const syncFromSystem = useThemeStore((s) => s.syncFromSystem);

  useEffect(() => {
    applyThemePreference(preference);
  }, [preference]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => syncFromSystem();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [syncFromSystem]);

  return <>{children}</>;
}
