import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { completeFirstLogin } from '../lib/bulkAccounts';
import { getPostLoginPath } from '../lib/auth';
import { useAuthStore } from '../stores/authStore';
import { PLATFORM_ICON, PLATFORM_NAME } from '../lib/branding';
import type { UserRole } from '../types';
import './LoginPage.css';

export function ForcePasswordChangePage() {
  const navigate = useNavigate();
  const { user, role, refreshUser } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.is_first_login !== true) {
      navigate(getPostLoginPath((role ?? 'student') as UserRole, false), { replace: true });
    }
  }, [user, role, navigate]);

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
      const userRole = (profile?.role ?? role ?? 'student') as UserRole;
      navigate(getPostLoginPath(userRole, false), { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تحديث كلمة المرور';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell min-h-screen" dir="rtl">
      <div className="login-container max-w-lg mx-auto">
        <div className="login-form-side w-full">
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-brand">
              <img src={PLATFORM_ICON} alt={PLATFORM_NAME} className="login-brand-logo" />
              <h1>تغيير كلمة المرور</h1>
              <p>مرحباً {user?.full_name ?? ''} — يجب تعيين كلمة مرور جديدة قبل المتابعة</p>
            </div>

            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm mb-4">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span>هذا إجراء أمني إلزامي لأول تسجيل دخول بحساب مؤقت</span>
            </div>

            {error && <div className="login-error">{error}</div>}

            <div className="login-field">
              <label htmlFor="new-password" className="login-field-label flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                كلمة المرور الجديدة
              </label>
              <div className="login-password-wrap">
                <input
                  id="new-password"
                  className="login-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="8 أحرف على الأقل"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'إخفاء' : 'إظهار'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="confirm-password" className="login-field-label">
                تأكيد كلمة المرور
              </label>
              <input
                id="confirm-password"
                className="login-input"
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'جاري الحفظ...' : 'حفظ والمتابعة'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
