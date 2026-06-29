import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { signIn } from '../lib/auth';
import { toArabicErrorMessage } from '../lib/errors';
import { useAuthStore } from '../stores/authStore';
import { LoginIllustration } from '../components/auth/LoginIllustration';
import { PLATFORM_ICON, PLATFORM_NAME, PLATFORM_TAGLINE } from '../lib/branding';
import './LoginPage.css';

export function LoginPage() {
  const { session, initialized, redirectAfterLogin } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // إذا كان المستخدم مسجّلاً مسبقاً — توجيه مباشر
  useEffect(() => {
    if (!initialized || !session) return;
    redirectAfterLogin(session);
  }, [initialized, session, redirectAfterLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { session: newSession } = await signIn(email, password);
      redirectAfterLogin(newSession);
      // الصفحة ستُعاد تحميلها — لا حاجة لإيقاف التحميل
    } catch (err: unknown) {
      setError(toArabicErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="login-shell" dir="rtl">
      <div className="login-container">
        <div className="login-form-side">
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-brand">
              <img
                src={PLATFORM_ICON}
                alt={PLATFORM_NAME}
                className="login-brand-logo"
              />
              <h1>{PLATFORM_NAME}</h1>
              <p>{PLATFORM_TAGLINE}</p>
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
                placeholder="admin@elite1448.demo"
                dir="ltr"
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
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-actions">
              <button id="login-submit" type="submit" className="login-submit" disabled={loading}>
                {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </button>
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
