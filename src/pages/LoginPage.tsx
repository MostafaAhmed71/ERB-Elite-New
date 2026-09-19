import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { signIn, resolveLoginTarget, rememberPreferredLoginPath } from '../lib/auth';
import { toLoginErrorMessage } from '../lib/errors';
import { resolveTeacherPostLoginPath } from '../lib/teacherSignup';
import { useAuthStore } from '../stores/authStore';
import { LoginIllustration } from '../components/auth/LoginIllustration';
import { TapHandLoader } from '../components/ui/TapHandLoader';
import { PLATFORM_ICON, PLATFORM_NAME, PLATFORM_TAGLINE } from '../lib/branding';
import { ThemeAppearanceControl } from '../components/theme/ThemeAppearanceControl';
import './LoginPage.css';

function hasOAuthReturnParams(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.has('code') || params.has('error')) return true;
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return false;
  const hashParams = new URLSearchParams(hash);
  return hashParams.has('access_token') || hashParams.has('refresh_token');
}

/** شاشة دخول العائلة — طالب / ولي أمر (إيميل + كلمة مرور) */
export function LoginPage() {
  const navigate = useNavigate();
  const { session, initialized, setAuthSession } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirectingRef = useRef(false);
  const oauthReturn = hasOAuthReturnParams();

  useEffect(() => {
    rememberPreferredLoginPath('/login');
  }, []);

  const getRedirectTarget = () => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      try { sessionStorage.removeItem('post_login_redirect'); } catch { /* ignore */ }
      return redirect;
    }
    try {
      const stored = sessionStorage.getItem('post_login_redirect');
      if (stored && stored.startsWith('/') && !stored.startsWith('//')) {
        sessionStorage.removeItem('post_login_redirect');
        return stored;
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  useEffect(() => {
    if (!initialized || !session || redirectingRef.current) return;
    redirectingRef.current = true;
    void (async () => {
      const profile = await setAuthSession(session);
      const redirectTarget = getRedirectTarget();
      if (redirectTarget) {
        navigate(redirectTarget, { replace: true });
        return;
      }
      const teacherTarget = await resolveTeacherPostLoginPath(profile);
      navigate(teacherTarget ?? resolveLoginTarget(session, profile), { replace: true });
    })();
  }, [initialized, session, setAuthSession, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { session: newSession } = await signIn(email, password);
      redirectingRef.current = true;
      const profile = await setAuthSession(newSession);
      const role = profile?.role;
      if (role && !['student', 'parent'].includes(role)) {
        setError('هذه الشاشة لدخول الطالب وولي الأمر. استخدم دخول الطاقم.');
        setLoading(false);
        redirectingRef.current = false;
        await supabaseSignOutQuiet();
        return;
      }
      const redirectTarget = getRedirectTarget();
      if (redirectTarget) {
        navigate(redirectTarget, { replace: true });
        return;
      }
      const teacherTarget = await resolveTeacherPostLoginPath(profile);
      navigate(teacherTarget ?? resolveLoginTarget(newSession, profile), { replace: true });
    } catch (err: unknown) {
      setError(toLoginErrorMessage(err));
      setLoading(false);
      redirectingRef.current = false;
    }
  };

  const busy = loading;
  const showRedirectLoader = !initialized || !!session || oauthReturn || redirectingRef.current;

  if (showRedirectLoader) {
    return (
      <div className="login-shell" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <img
            src={PLATFORM_ICON}
            alt={PLATFORM_NAME}
            className="w-16 h-16 rounded-2xl object-cover shadow-lg shadow-gold-500/20"
          />
          <TapHandLoader
            label={
              oauthReturn || !!session ? 'جاري إكمال تسجيل الدخول...' : 'جاري التحميل...'
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="login-shell" dir="rtl">
      <div className="login-theme-dock">
        <ThemeAppearanceControl variant="icon" />
      </div>
      <div className="login-container">
        <div className="login-form-side">
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-brand">
              <img src={PLATFORM_ICON} alt={PLATFORM_NAME} className="login-brand-logo" />
              <h1>{PLATFORM_NAME}</h1>
              <p>{PLATFORM_TAGLINE}</p>
              <p className="login-audience-badge">دخول الطالب وولي الأمر</p>
            </div>

            {error && <div className="login-error">{error}</div>}

            <div className="login-field">
              <label htmlFor="login-email" className="login-field-label">
                البريد الإلكتروني
              </label>
              <input
                id="login-email"
                className="login-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                dir="ltr"
                disabled={busy}
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password" className="login-field-label">
                كلمة المرور
              </label>
              <div className="login-input-wrap">
                <input
                  id="login-password"
                  className="login-input login-input--password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={busy}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  disabled={busy}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-actions">
              <button id="login-submit" type="submit" className="login-submit" disabled={busy}>
                {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </button>
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 text-center">
              <Link
                to={(() => {
                  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
                  const redir = params?.get('redirect');
                  return redir ? `/login/staff?redirect=${encodeURIComponent(redir)}` : '/login/staff';
                })()}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-300 hover:bg-gold-500/20 hover:text-gold-200 text-xs font-semibold transition-colors"
              >
                <span>تسجيل الدخول للمنح (الكادر التعليمي) ←</span>
              </Link>
            </div>
          </form>
        </div>

        <div className="login-art-side" aria-hidden>
          <div className="login-art">
            <LoginIllustration />
          </div>
        </div>
      </div>
    </div>
  );
}

async function supabaseSignOutQuiet() {
  try {
    const { supabase } = await import('../lib/supabase');
    await supabase.auth.signOut();
  } catch {
    /* ignore */
  }
}
