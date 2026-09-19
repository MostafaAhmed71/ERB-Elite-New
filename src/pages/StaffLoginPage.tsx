import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { signIn, signInWithGoogle, resolveLoginTarget, rememberPreferredLoginPath, parseRoleFromMetadata } from '../lib/auth';
import { toArabicErrorMessage, toLoginErrorMessage } from '../lib/errors';
import { resolveTeacherPostLoginPath } from '../lib/teacherSignup';

const STAFF_ROLES = new Set<string>([
  'teacher',
  'admin',
  'activity_leader',
  'principal',
  'deputy',
  'platform_developer',
]);
import {
  requestTeacherLoginOtp,
  verifyTeacherLoginOtp,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
} from '../lib/authPhoneOtp';
import { useAuthStore } from '../stores/authStore';
import { LoginIllustration } from '../components/auth/LoginIllustration';
import { GoogleGlyph } from '../components/auth/GoogleGlyph';
import { TapHandLoader } from '../components/ui/TapHandLoader';
import { PLATFORM_ICON, PLATFORM_NAME, PLATFORM_TAGLINE } from '../lib/branding';
import { ThemeAppearanceControl } from '../components/theme/ThemeAppearanceControl';
import './LoginPage.css';

type StaffTab = 'teacher' | 'admin' | 'forgot';

type OtpStep = 'phone' | 'code' | 'new_password';

export function StaffLoginPage() {
  const navigate = useNavigate();
  const { session, initialized, setAuthSession } = useAuthStore();
  const [tab, setTab] = useState<StaffTab>('teacher');
  const redirectingRef = useRef(false);

  // Admin email form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // OTP flows
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<OtpStep>('phone');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    rememberPreferredLoginPath('/login/staff');
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

    const userRole = (useAuthStore.getState().role ?? parseRoleFromMetadata(session.user.user_metadata?.role)) as string | undefined;

    // إذا كانت الجلسة لطالب أو ولي أمر، لا توجهه بعيداً بل دعه يسجل دخوله ككادر
    if (userRole === 'student' || userRole === 'parent') {
      return;
    }

    if (userRole && STAFF_ROLES.has(userRole)) {
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
    }
  }, [initialized, session, setAuthSession, navigate]);

  const switchTab = (next: StaffTab) => {
    setTab(next);
    setError(null);
    setInfo(null);
    setOtpStep('phone');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const finishSession = async () => {
    const { data } = await import('../lib/supabase').then((m) => m.supabase.auth.getSession());
    const s = data.session;
    if (!s) throw new Error('لم تُنشأ جلسة');
    redirectingRef.current = true;
    const profile = await setAuthSession(s);
    const redirectTarget = getRedirectTarget();
    if (redirectTarget) {
      navigate(redirectTarget, { replace: true });
      return;
    }
    const teacherTarget = await resolveTeacherPostLoginPath(profile);
    navigate(teacherTarget ?? resolveLoginTarget(s, profile), { replace: true });
  };

  const handleEmailPasswordLogin = async () => {
    if (!email.trim() || !password) {
      setError('أدخل البريد الإلكتروني وكلمة المرور');
      return;
    }
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const { session: newSession } = await signIn(email, password);
      redirectingRef.current = true;
      const profile = await setAuthSession(newSession);
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

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleEmailPasswordLogin();
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle('/auth/callback');
    } catch (err: unknown) {
      setError(toLoginErrorMessage(err));
      setGoogleLoading(false);
    }
  };

  const handleRequestTeacherOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const msg = await requestTeacherLoginOtp(phone);
      setInfo(msg);
      setOtpStep('code');
    } catch (err: unknown) {
      // رقم غير مسجّل أو فشل الإرسال — ابقَ على شاشة إدخال الجوال
      setError(toArabicErrorMessage(err));
      setOtpStep('phone');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTeacherOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await verifyTeacherLoginOtp(phone, otpCode);
      await finishSession();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'رمز غير صحيح');
      setLoading(false);
      redirectingRef.current = false;
    }
  };

  const handleRequestResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const msg = await requestPasswordResetOtp(phone);
      setInfo(msg);
      setOtpStep('code');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر إرسال الرمز');
    } finally {
      setLoading(false);
    }
  };

  const handleResetCodeNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError('أدخل رمز التحقق المكوّن من 6 أرقام');
      return;
    }
    setError(null);
    setOtpStep('new_password');
  };

  const handleApplyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (newPassword.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    setLoading(true);
    try {
      const msg = await verifyPasswordResetOtp(phone, otpCode, newPassword);
      setInfo(msg);
      setTab('admin');
      setOtpStep('phone');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر تحديث كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  const busy = loading || googleLoading;

  const userRole = (useAuthStore.getState().role ?? parseRoleFromMetadata(session?.user.user_metadata?.role)) as string | undefined;
  const isStaffSession = Boolean(session && userRole && STAFF_ROLES.has(userRole));

  if (!initialized || (isStaffSession && redirectingRef.current)) {
    return (
      <div className="login-shell" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <img
            src={PLATFORM_ICON}
            alt={PLATFORM_NAME}
            className="w-16 h-16 rounded-2xl object-cover shadow-lg shadow-gold-500/20"
          />
          <TapHandLoader label="جاري التحميل..." />
        </div>
      </div>
    );
  }

  if (isStaffSession && !redirectingRef.current) {
    return (
      <div className="login-shell" dir="rtl">
        <TapHandLoader label="جاري إكمال تسجيل الدخول..." />
      </div>
    );
  }

  return (
    <div className="login-shell" dir="rtl">
      <div className="login-theme-dock">
        <ThemeAppearanceControl variant="icon" />
      </div>
      <div className="login-container login-container--staff">
        <div className="login-form-side login-form-side--wide">
          <div className="login-form">
            <div className="login-brand">
              <img src={PLATFORM_ICON} alt={PLATFORM_NAME} className="login-brand-logo" />
              <h1>{PLATFORM_NAME}</h1>
              <p>{PLATFORM_TAGLINE}</p>
              <p className="login-audience-badge">دخول الطاقم</p>
            </div>

            <div className="login-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                className={tab === 'teacher' ? 'login-tab active' : 'login-tab'}
                onClick={() => switchTab('teacher')}
              >
                معلم
              </button>
              <button
                type="button"
                role="tab"
                className={tab === 'admin' ? 'login-tab active' : 'login-tab'}
                onClick={() => switchTab('admin')}
              >
                إدارة
              </button>
              <button
                type="button"
                role="tab"
                className={tab === 'forgot' ? 'login-tab active' : 'login-tab'}
                onClick={() => switchTab('forgot')}
              >
                نسيت كلمة المرور
              </button>
            </div>

            {error && (
              <div className="login-error">
                <p>{error}</p>
                {/غير مسجّل|تسجيل معلم جديد/i.test(error) && (
                  <Link to="/register/teacher" className="login-error-cta">
                    إنشاء حساب معلم الآن
                  </Link>
                )}
              </div>
            )}
            {info && <div className="login-info">{info}</div>}

            {tab === 'teacher' && otpStep === 'phone' && (
              <div className="login-tab-panel">
                <form onSubmit={handleRequestTeacherOtp}>
                  <p className="login-hint">
                    أدخل رقم جوالك المسجّل ليصلك رمز واتساب، أو ادخل مباشرة بحساب جيميل — دون بريد وكلمة مرور يدويين.
                  </p>
                  <div className="login-field">
                    <label htmlFor="staff-phone" className="login-field-label">
                      رقم الجوال
                    </label>
                    <input
                      id="staff-phone"
                      className="login-input"
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="05xxxxxxxx"
                      dir="ltr"
                      disabled={busy}
                      autoComplete="tel"
                    />
                  </div>
                  <button type="submit" className="login-submit" disabled={busy}>
                    {loading ? 'جاري الإرسال...' : 'إرسال رمز واتساب'}
                  </button>
                </form>
                <div className="login-divider" role="separator">
                  <span>أو بحساب جيميل</span>
                </div>
                <button
                  type="button"
                  className="login-google"
                  onClick={handleGoogle}
                  disabled={busy}
                >
                  <GoogleGlyph />
                  <span>{googleLoading ? 'جاري التحويل...' : 'الدخول عبر Google / جيميل'}</span>
                </button>
              </div>
            )}

            {tab === 'teacher' && otpStep === 'code' && (
              <form onSubmit={handleVerifyTeacherOtp} className="login-tab-panel">
                <p className="login-hint">أدخل الرمز المكوّن من 6 أرقام الذي وصلك على واتساب.</p>
                <div className="login-field">
                  <label htmlFor="staff-otp" className="login-field-label">
                    رمز التحقق
                  </label>
                  <input
                    id="staff-otp"
                    className="login-input"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    placeholder="••••••"
                    dir="ltr"
                    disabled={busy}
                    autoComplete="one-time-code"
                  />
                </div>
                <button type="submit" className="login-submit" disabled={busy || otpCode.length !== 6}>
                  {loading ? 'جاري التحقق...' : 'دخول'}
                </button>
                <button
                  type="button"
                  className="login-link-btn"
                  disabled={busy}
                  onClick={() => {
                    setOtpStep('phone');
                    setOtpCode('');
                    setInfo(null);
                  }}
                >
                  تغيير الرقم / إعادة الإرسال
                </button>
              </form>
            )}

            {tab === 'admin' && (
              <form onSubmit={handleAdminSubmit} className="login-tab-panel">
                <p className="login-hint">مدير المدرسة ورائد النشاط — البريد وكلمة المرور.</p>
                <div className="login-field">
                  <label htmlFor="staff-email" className="login-field-label">
                    البريد الإلكتروني
                  </label>
                  <input
                    id="staff-email"
                    className="login-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="admin@school.sa"
                    dir="ltr"
                    disabled={busy}
                  />
                </div>
                <div className="login-field">
                  <label htmlFor="staff-password" className="login-field-label">
                    كلمة المرور
                  </label>
                  <div className="login-input-wrap">
                    <input
                      id="staff-password"
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
                      aria-label={showPassword ? 'إخفاء' : 'إظهار'}
                      disabled={busy}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="login-submit" disabled={busy}>
                  {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
                </button>
                <div className="login-divider" role="separator">
                  <span>أو</span>
                </div>
                <button
                  type="button"
                  className="login-google"
                  onClick={handleGoogle}
                  disabled={busy}
                >
                  <GoogleGlyph />
                  <span>{googleLoading ? 'جاري التحويل...' : 'المتابعة عبر Google'}</span>
                </button>
                <button type="button" className="login-link-btn" onClick={() => switchTab('forgot')}>
                  نسيت كلمة المرور؟
                </button>
              </form>
            )}

            {tab === 'forgot' && otpStep === 'phone' && (
              <form onSubmit={handleRequestResetOtp} className="login-tab-panel">
                <p className="login-hint">
                  أدخل رقم الجوال المسجّل في ملفك (بما فيه حسابات Google التي أضافت جوالاً) — يصلك رمز
                  إعادة التعيين عبر واتساب، ثم تعيّن كلمة مرور جديدة للدخول من تبويب الإدارة أو الجوال.
                </p>
                <div className="login-field">
                  <label htmlFor="reset-phone" className="login-field-label">
                    رقم الجوال
                  </label>
                  <input
                    id="reset-phone"
                    className="login-input"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                    disabled={busy}
                  />
                </div>
                <button type="submit" className="login-submit" disabled={busy}>
                  {loading ? 'جاري الإرسال...' : 'إرسال رمز واتساب'}
                </button>
              </form>
            )}

            {tab === 'forgot' && otpStep === 'code' && (
              <form onSubmit={handleResetCodeNext} className="login-tab-panel">
                <p className="login-hint">أدخل رمز واتساب ثم عيّن كلمة مرور جديدة.</p>
                <div className="login-field">
                  <label htmlFor="reset-otp" className="login-field-label">
                    رمز التحقق
                  </label>
                  <input
                    id="reset-otp"
                    className="login-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    placeholder="••••••"
                    dir="ltr"
                    disabled={busy}
                  />
                </div>
                <button type="submit" className="login-submit" disabled={busy || otpCode.length !== 6}>
                  متابعة
                </button>
                <button
                  type="button"
                  className="login-link-btn"
                  onClick={() => {
                    setOtpStep('phone');
                    setOtpCode('');
                  }}
                >
                  رجوع
                </button>
              </form>
            )}

            {tab === 'forgot' && otpStep === 'new_password' && (
              <form onSubmit={handleApplyReset} className="login-tab-panel">
                <div className="login-field">
                  <label htmlFor="reset-new" className="login-field-label">
                    كلمة المرور الجديدة
                  </label>
                  <div className="login-input-wrap">
                    <input
                      id="reset-new"
                      className="login-input login-input--password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      disabled={busy}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="login-password-toggle"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      disabled={busy}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="login-field">
                  <label htmlFor="reset-confirm" className="login-field-label">
                    تأكيد كلمة المرور
                  </label>
                  <input
                    id="reset-confirm"
                    className="login-input"
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={busy}
                    autoComplete="new-password"
                  />
                </div>
                <button type="submit" className="login-submit" disabled={busy}>
                  {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
                </button>
              </form>
            )}

            <div className="login-links">
              <Link to="/register/teacher" className="login-teacher-register-cta">
                <UserPlus className="login-teacher-register-cta__icon" aria-hidden />
                <span className="login-teacher-register-cta__text">
                  <strong>تسجيل معلم جديد</strong>
                  <small>ليس لديك حساب؟ أنشئه بكود التفعيل من المدرسة</small>
                </span>
              </Link>
            </div>
          </div>
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
