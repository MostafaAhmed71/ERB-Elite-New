import { useAuthStore } from '../../stores/authStore';
import { useAppRealtime } from '../../hooks/useAppRealtime';

/** مكوّن خفي — يفعّل Realtime لكل الشاشات بعد تسجيل الدخول */
export function AppRealtimeSync() {
  const { user } = useAuthStore();
  useAppRealtime(!!user);
  return null;
}
