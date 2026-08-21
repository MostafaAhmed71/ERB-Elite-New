import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, X, KeyRound, Shield } from 'lucide-react';
import { completeFirstLogin } from '../lib/bulkAccounts';
import { getPostLoginPath } from '../lib/auth';
import { needsWhatsAppPhoneSetup } from '../lib/setupWhatsAppPhone';
import { useAuthStore } from '../stores/authStore';
import { PLATFORM_ICON, PLATFORM_NAME, PLATFORM_TAGLINE } from '../lib/branding';
import type { UserRole } from '../types';
import './ForcePasswordChangePage.css';

function strengthScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Za-z\u0600-\u06FF]/.test(password) && /\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9\u0600-\u06FF]/.test(password)) score += 1;
  return score;
}

const STRENGTH_LABEL = ['ضعيفة', 'مقبولة', 'جيدة', 'قوية', 'ممتازة'] as const;

export function ForcePasswordChangePage() {
  const navigate = useNavigate();
  const { user, role, refreshUser } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.is_first_login !== true) {
      navigate(getPostLoginPath((role ?? 'student') as UserRole, false), { replace: true });
    }
  }, [user, role, navigate]);

  const score = useMemo(() => strengthScore(password), [password]);
  const matches = confirm.length > 0 && password === confirm;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length >= 8 && matches && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);
    try {
      await completeFirstLogin(password);
      const profile = await refreshUser();
      if (needsWhatsAppPhoneSetup(profile)) {
        navigate('/setup-whatsapp', { replace: true });
        return;
      }
      const userRole = (profile?.role ?? role ?? 'student') as UserRole;
      navigate(getPostLoginPath(userRole, false), { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تحديث كلمة المرور';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const firstName = (user?.full_name ?? '').trim().split(/\s+/)[0] || 'بك';

  return (
    <div className="fpc-shell" dir="rtl">
      <div className="fpc-glow fpc-glow-a" aria-hidden />
      <div className="fpc-glow fpc-glow-b" aria-hidden />

      <div className="fpc-card">
        <header className="fpc-header">
          <img src={PLATFORM_ICON} alt="" className="fpc-logo" />
          <div className="fpc-brand">
            <strong>{PLATFORM_NAME}</strong>
            <span>{PLATFORM_TAGLINE}</span>
          </div>
        </header>

        <div className="fpc-hero">
          <span className="fpc-badge">
            <Shield size={14} aria-hidden />
            أول دخول
          </span>
          <h1>مرحباً {firstName}</h1>
          <p>
            حسابك جاهز. عيّن كلمة مرور خاصة بك بدل المؤقتة، ثم ادخل المنصة.
          </p>
        </div>

        <form className="fpc-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="fpc-error" role="alert">
              {error}
            </div>
          )}

          <label className="fpc-field">
            <span className="fpc-label">
              <KeyRound size={14} aria-hidden />
              كلمة المرور الجديدة
            </span>
            <div className="fpc-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="٨ أحرف على الأقل"
                dir="ltr"
              />
              <button
                type="button"
                className="fpc-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <div className="fpc-strength" aria-live="polite">
            <div className="fpc-strength-bars">
              {[0, 1, 2, 3].map((i) => (
                <i
                  key={i}
                  className={i < score ? `on level-${Math.min(score, 4)}` : ''}
                />
              ))}
            </div>
            <span>{password ? STRENGTH_LABEL[score] : 'قوة كلمة المرور'}</span>
          </div>

          <ul className="fpc-rules">
            <li className={password.length >= 8 ? 'ok' : ''}>
              {password.length >= 8 ? <Check size={14} /> : <X size={14} />}
              ٨ أحرف على الأقل
            </li>
            <li className={/[A-Za-z\u0600-\u06FF]/.test(password) && /\d/.test(password) ? 'ok' : ''}>
              {/[A-Za-z\u0600-\u06FF]/.test(password) && /\d/.test(password) ? (
                <Check size={14} />
              ) : (
                <X size={14} />
              )}
              حرف ورقم معاً (مستحسن)
            </li>
          </ul>

          <label className="fpc-field">
            <span className="fpc-label">تأكيد كلمة المرور</span>
            <div className={`fpc-input-wrap ${mismatch ? 'bad' : ''} ${matches ? 'good' : ''}`}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="أعد كتابة كلمة المرور"
                dir="ltr"
              />
              <button
                type="button"
                className="fpc-eye"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'إخفاء التأكيد' : 'إظهار التأكيد'}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {matches && <span className="fpc-hint ok">متطابقتان ✓</span>}
            {mismatch && <span className="fpc-hint bad">غير متطابقتين</span>}
          </label>

          <button type="submit" className="fpc-submit" disabled={!canSubmit}>
            {loading ? 'جاري الحفظ...' : 'حفظ والمتابعة'}
          </button>
        </form>

        <p className="fpc-foot">لا تشارك كلمة المرور مع أحد — حتى زملائك في الفصل.</p>
      </div>
    </div>
  );
}
