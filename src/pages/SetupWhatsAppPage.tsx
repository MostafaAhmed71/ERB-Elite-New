import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, AlertTriangle, Phone } from 'lucide-react';
import { getPostLoginPath } from '../lib/auth';
import { needsWhatsAppPhoneSetup, saveWhatsAppPhoneAndWelcome } from '../lib/setupWhatsAppPhone';
import { useAuthStore } from '../stores/authStore';
import { PLATFORM_ICON, PLATFORM_NAME, PLATFORM_TAGLINE } from '../lib/branding';
import type { UserRole } from '../types';
import './ForcePasswordChangePage.css';
import './SetupWhatsAppPage.css';

export function SetupWhatsAppPage() {
  const navigate = useNavigate();
  const { user, role, refreshUser } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noWhatsApp, setNoWhatsApp] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user && !needsWhatsAppPhoneSetup(user)) {
      navigate(getPostLoginPath((role ?? user.role ?? 'student') as UserRole, false), {
        replace: true,
      });
    }
  }, [user, role, navigate]);

  const goHome = async () => {
    const profile = await refreshUser();
    const userRole = (profile?.role ?? role ?? 'student') as UserRole;
    navigate(getPostLoginPath(userRole, false), { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNoWhatsApp(false);
    setSuccess(null);
    setLoading(true);
    try {
      const msg = await saveWhatsAppPhoneAndWelcome(phone);
      setSuccess(msg);
      await refreshUser();
      setTimeout(() => {
        void goHome();
      }, 1200);
    } catch (err: unknown) {
      const e = err as Error & { code?: string };
      const msg = e?.message || 'تعذر حفظ الرقم';
      if (e?.code === 'NO_WHATSAPP' || /لا يوجد عليه واتساب|غير متاح على واتساب/i.test(msg)) {
        setNoWhatsApp(true);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const firstName = (user?.full_name ?? '').trim().split(/\s+/)[0] || '';

  return (
    <div className="fpc-shell" dir="rtl">
      <div className="fpc-glow fpc-glow-a" aria-hidden />
      <div className="fpc-glow fpc-glow-b" aria-hidden />

      <div className="fpc-card swa-card">
        <header className="fpc-header">
          <img src={PLATFORM_ICON} alt="" className="fpc-logo" />
          <div className="fpc-brand">
            <strong>{PLATFORM_NAME}</strong>
            <span>{PLATFORM_TAGLINE}</span>
          </div>
        </header>

        <div className="fpc-hero">
          <span className="fpc-badge swa-badge">
            <MessageCircle size={14} aria-hidden />
            واتساب
          </span>
          <h1>{firstName ? `${firstName} —` : ''} رقم واتسابك</h1>
          <p>
            أدخل رقم الجوال الذي عليه واتساب. سنرسل رسالة ترحيب ونستخدمه للتنبيهات المهمة.
          </p>
        </div>

        <form className="fpc-form" onSubmit={handleSubmit}>
          {noWhatsApp && (
            <div className="swa-warn" role="alert">
              <AlertTriangle size={20} className="shrink-0" />
              <div>
                <strong>هذا الرقم لا يوجد عليه واتساب</strong>
                <p>يجب إدخال رقم جوال عليه تطبيق واتساب فعّال حتى تصلك الرسائل.</p>
              </div>
            </div>
          )}

          {error && !noWhatsApp && (
            <div className="fpc-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="swa-success" role="status">
              {success}
            </div>
          )}

          <label className="fpc-field">
            <span className="fpc-label">
              <Phone size={14} aria-hidden />
              رقم الجوال (واتساب)
            </span>
            <div className={`fpc-input-wrap ${noWhatsApp ? 'bad' : ''}`}>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setNoWhatsApp(false);
                  setError(null);
                }}
                required
                autoComplete="tel"
                placeholder="05XXXXXXXX"
                dir="ltr"
              />
            </div>
            <span className="swa-hint">مثال: 0512345678</span>
          </label>

          <button type="submit" className="fpc-submit" disabled={loading || !phone.trim()}>
            {loading ? 'جاري التحقق والإرسال...' : 'حفظ وإرسال ترحيب واتساب'}
          </button>
        </form>

        <p className="fpc-foot">لن نشارك رقمك مع أحد خارج المدرسة.</p>
      </div>
    </div>
  );
}
