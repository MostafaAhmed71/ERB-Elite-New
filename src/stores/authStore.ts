import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getCurrentUserProfile,
  parseRoleFromMetadata,
  resolveAuthRole,
  resolveLoginTarget,
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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    }),
  ]);
}

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
    const { user } = get();
    const metaRole = parseRoleFromMetadata(session.user.user_metadata?.role);
    set({
      session,
      role: resolveAuthRole(session, user) ?? metaRole,
      loading: false,
      initialized: true,
    });
    window.location.replace(resolveLoginTarget(session, user));
  },

  setAuthSession: async (session: Session) => {
    get().applySession(session);
    try {
      const profile = await withTimeout(
        getCurrentUserProfile(),
        8000,
        'getCurrentUserProfile'
      );
      set({
        session,
        user: profile,
        role: resolveAuthRole(session, profile),
        loading: false,
        initialized: true,
      });
      void touchUserLastSeen();
      return profile;
    } catch (err) {
      console.warn('Profile sync after auth:', err);
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
          8000,
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
          loading: false,
          initialized: true,
        });

        try {
          const profile = await withTimeout(
            getCurrentUserProfile(),
            8000,
            'getCurrentUserProfile'
          );
          set({
            user: profile,
            role: resolveAuthRole(session, profile) ?? metaRole,
          });
          void touchUserLastSeen();
        } catch (profileErr) {
          console.warn('Profile load skipped:', profileErr);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      set({ session: null, user: null, role: null, loading: false });
      return null;
    }

    const profile = await getCurrentUserProfile();
    set({
      session,
      user: profile,
      role: resolveAuthRole(session, profile),
      loading: false,
    });
    return profile;
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, role: null });
    window.location.replace('/login');
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

  // SIGNED_IN يُعالَج من صفحة الدخول عبر redirectAfterLogin — لا نفعل شيئاً هنا
});
