import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { withTimeout } from '../lib/utils/asyncUtils';
import { getCurrentUserProfile,
  parseRoleFromMetadata,
  resolveAuthRole,
  resolveLoginTarget,
  getLoginPathForRole,
  rememberPreferredLoginPath,
} from '../lib/auth';
import { touchUserLastSeen } from '../lib/platformAdoption';
import type { DbUser, UserRole } from '../types';

interface AuthStore {
  session: Session | null;
  user: DbUser | null;
  role: UserRole | null;
  loading: boolean;
  initialized: boolean;
  setSession: (session: Session | null) => void;
  initialize: () => Promise<void>;
  refreshUser: () => Promise<DbUser | null>;
  applySession: (session: Session) => void;
  redirectAfterLogin: (session: Session) => void;
  setAuthSession: (session: Session) => Promise<DbUser | null>;
  logout: () => Promise<void>;
}

const PROFILE_TIMEOUT_MS = 15_000;
const SESSION_TIMEOUT_MS = 10_000;

let initPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  user: null,
  role: null,
  loading: true,
  initialized: false,

  setSession: (session) => set({ session }),

  applySession: (session: Session) => {
    const metaRole = parseRoleFromMetadata(session.user.user_metadata?.role);
    set({
      session,
      role: metaRole,
      loading: false,
      initialized: true,
    });
  },

  redirectAfterLogin: (session: Session) => {
    void (async () => {
      try {
        const profile = await get().setAuthSession(session);
        window.location.replace(resolveLoginTarget(session, profile));
      } catch {
        window.location.replace(resolveLoginTarget(session, get().user));
      }
    })();
  },

  setAuthSession: async (session: Session) => {
    get().applySession(session);
    if (!get().session) {
      set({ loading: true });
    }
    try {
      const profile = await withTimeout(
        getCurrentUserProfile(),
        PROFILE_TIMEOUT_MS,
        'getCurrentUserProfile'
      );
      set({
        session,
        user: profile,
        role: resolveAuthRole(session, profile),
        loading: false,
        initialized: true,
      });
      rememberPreferredLoginPath(getLoginPathForRole(resolveAuthRole(session, profile)));
      void touchUserLastSeen();
      return profile;
    } catch (err) {
      console.warn('Profile sync after auth:', err);
      set({ loading: false });
      return null;
    }
  },

  initialize: async () => {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      set({ loading: true });
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          SESSION_TIMEOUT_MS,
          'getSession'
        );

        if (!session) {
          set({ session: null, user: null, role: null, loading: false, initialized: true });
          return;
        }

        const metaRole = parseRoleFromMetadata(session.user.user_metadata?.role);
        set({
          session,
          role: metaRole,
          loading: true,
          initialized: true,
        });

        try {
          const profile = await withTimeout(
            getCurrentUserProfile(),
            PROFILE_TIMEOUT_MS,
            'getCurrentUserProfile'
          );
          set({
            user: profile,
            role: resolveAuthRole(session, profile) ?? metaRole,
            loading: false,
          });
          rememberPreferredLoginPath(getLoginPathForRole(resolveAuthRole(session, profile) ?? metaRole));
          void touchUserLastSeen();
        } catch (profileErr) {
          // الشبكة البطيئة أو RLS — الجلسة تبقى صالحة بالدور من metadata
          console.warn('Profile load skipped (session kept):', profileErr);
          set({ loading: false });
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        initPromise = null; // BUG-003: السماح بإعادة المحاولة عند الفشل
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // ignore
        }
        set({ session: null, user: null, role: null, loading: false, initialized: true });
      }
    })();

    return initPromise;
  },

  refreshUser: async () => {
    try {
      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(),
        SESSION_TIMEOUT_MS,
        'getSession'
      );
      if (!session) {
        set({ session: null, user: null, role: null, loading: false });
        return null;
      }

      const profile = await withTimeout(
        getCurrentUserProfile(),
        PROFILE_TIMEOUT_MS,
        'getCurrentUserProfile'
      );
      set({
        session,
        user: profile,
        role: resolveAuthRole(session, profile),
        loading: false,
      });
      return profile;
    } catch (err) {
      console.warn('refreshUser failed — keeping current state:', err);
      return get().user;
    }
  },

  logout: async () => {
    const loginPath = getLoginPathForRole(get().role);
    rememberPreferredLoginPath(loginPath);
    try {
      const { clearDevDebugMode } = await import('../lib/devDebugMode');
      clearDevDebugMode();
    } catch {
      /* ignore */
    }
    await supabase.auth.signOut();
    set({ session: null, user: null, role: null });
    window.location.replace(loginPath);
  },
}));

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'INITIAL_SESSION') return;

  if (event === 'SIGNED_OUT') {
    useAuthStore.setState({
      session: null,
      user: null,
      role: null,
      loading: false,
      initialized: true,
    });
    return;
  }

  if (event === 'TOKEN_REFRESHED' && session) {
    useAuthStore.getState().setSession(session);
    return;
  }

  // SIGNED_IN يُعالَج من /auth/callback أو LoginPage عبر navigate — لا نُعدّ التوجيه هنا
  if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
    const currentSession = useAuthStore.getState().session;
    const currentUser = useAuthStore.getState().user;
    // إذا كان المستخدم مسجل دخوله بالفعل، نقوم فقط بتحديث التوكن دون مقاطعة واجهة المستخدم
    if (currentSession?.user.id === session.user.id && currentUser) {
      useAuthStore.getState().setSession(session);
      return;
    }
    void useAuthStore.getState().setAuthSession(session);
  }
});
