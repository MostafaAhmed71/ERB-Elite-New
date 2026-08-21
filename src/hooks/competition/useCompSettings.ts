import { useQuery } from '@tanstack/react-query';
import { getCompSettings } from '../../lib/competition/api';
import { DEFAULT_COMP_SETTINGS } from '../../lib/competition/types';

export const COMP_SETTINGS_KEY = ['comp', 'settings'] as const;

export function useCompSettings() {
  const query = useQuery({
    queryKey: COMP_SETTINGS_KEY,
    queryFn: getCompSettings,
    staleTime: 15_000,
    // لا نستخدم placeholderData حتى لا يبدأ العرض بوقت 8:50 الافتراضي قبل الحفظ الحقيقي
  });

  return {
    ...query,
    data: query.data ?? DEFAULT_COMP_SETTINGS,
    /** true فقط بعد وصول إعدادات السيرفر (أو فشل مع الافتراضي بعد المحاولة) */
    settingsReady: query.isSuccess || query.isError,
  };
}
