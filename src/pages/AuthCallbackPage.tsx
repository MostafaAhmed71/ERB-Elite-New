import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { resolveLoginTarget } from '../lib/auth';
import { useAuthStore } from '../stores/authStore';
import {
  claimTeacherSignup,
  clearTeacherSignupIntent,
  completeTeacherProfile,
  consumePendingGoogleTeacherProfile,
  hasTeacherSignupIntent,
  readTeacherSignupCode,
  resolveTeacherPostLoginPath,
} from '../lib/teacherSignup';
import { TapHandLoader } from '../components/ui/TapHandLoader';
import { PLATFORM_ICON, PLATFORM_NAME } from '../lib/branding';

async function waitForSession(timeoutMs = 12_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session;
    await new Promise((r) => setTimeout(r, 150));
  }
  return null;
}

/**
 * نقطة عودة Google OAuth — تعرض تحميلاً فقط ثم توجّه للوجهة النهائية
 * دون إظهار شاشة تسجيل الدخول.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const setAuthSession = useAuthStore((s) => s.setAuthSession);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const session = await waitForSession();
        if (cancelled) return;

        if (!session) {
          setError('تعذّر إكمال تسجيل الدخول عبر Google — حاول مجدداً');
          return;
        }

        let profile = await setAuthSession(session);
        if (cancelled) return;

        const intentTeacher = hasTeacherSignupIntent(window.location.search);
        const signupCode = readTeacherSignupCode();

        if (intentTeacher && signupCode) {
          try {
            await claimTeacherSignup(signupCode);
            const pending = consumePendingGoogleTeacherProfile();
            if (pending) {
              try {
                await completeTeacherProfile(pending.fullName, pending.phone);
              } catch {
                // يبقى التوجيه لـ /teacher/onboarding إن فشل حفظ الجوال
              }
            }
            clearTeacherSignupIntent();
            profile = await setAuthSession(session);
          } catch (claimErr) {
            clearTeacherSignupIntent();
            if (cancelled) return;
            setError(claimErr instanceof Error ? claimErr.message : 'تعذّر تفعيل حساب المعلم');
            return;
          }
        } else if (intentTeacher && !signupCode) {
          clearTeacherSignupIntent();
          setError('انتهت صلاحية كود التفعيل — أعد التسجيل من رابط المعلمين');
          return;
        }

        if (cancelled) return;

        try {
          const stored = sessionStorage.getItem('post_login_redirect');
          if (stored && stored.startsWith('/') && !stored.startsWith('//')) {
            sessionStorage.removeItem('post_login_redirect');
            navigate(stored, { replace: true });
            return;
          }
        } catch {
          /* ignore */
        }

        const teacherTarget = await resolveTeacherPostLoginPath(profile);
        const target = teacherTarget ?? resolveLoginTarget(session, profile);
        navigate(target, { replace: true });
      } catch {
        if (!cancelled) {
          setError('حدث خطأ أثناء تسجيل الدخول — حاول مجدداً');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, setAuthSession]);

  return (
    <div
      className="min-h-dvh flex items-center justify-center bg-navy-950 font-cairo relative"
      dir="rtl"
    >
      <div className="absolute inset-0 bg-gradient-radial from-gold-500/5 to-transparent pointer-events-none" />
      <div className="flex flex-col items-center gap-4 text-center px-4 relative">
        <img
          src={PLATFORM_ICON}
          alt={PLATFORM_NAME}
          className="w-16 h-16 rounded-2xl object-cover shadow-lg shadow-gold-500/20"
        />
        {error ? (
          <>
            <p className="text-red-300 text-sm max-w-xs">{error}</p>
            <button
              type="button"
              className="text-gold-400 text-sm hover:text-gold-300"
              onClick={() => navigate('/register/teacher', { replace: true })}
            >
              العودة لتسجيل المعلمين
            </button>
            <button
              type="button"
              className="text-white/40 text-sm hover:text-white/60"
              onClick={() => navigate('/login', { replace: true })}
            >
              تسجيل الدخول العادي
            </button>
          </>
        ) : (
          <TapHandLoader label="جاري إكمال تسجيل الدخول..." />
        )}
      </div>
    </div>
  );
}
