import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Lock,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { signInWithGoogle, resolveLoginTarget } from '../lib/auth';
import { toArabicErrorMessage, toLoginErrorMessage } from '../lib/errors';
import {
  markTeacherSignupVerified,
  verifyTeacherSignupCode,
  resolveTeacherPostLoginPath,
  savePendingGoogleTeacherProfile,
} from '../lib/teacherSignup';
import {
  requestTeacherSignupOtp,
  verifyTeacherSignupOtp,
} from '../lib/authPhoneOtp';
import { useAuthStore } from '../stores/authStore';
import { GoogleGlyph } from '../components/auth/GoogleGlyph';
import { PLATFORM_ICON, PLATFORM_NAME } from '../lib/branding';
import './LoginPage.css';
import './TeacherRegisterPage.css';

type Step = 'code' | 'method' | 'profile' | 'otp' | 'success';
type SignupChannel = 'google' | 'whatsapp';

const STEP_META: Record<Step, { title: string; subtitle: string; index: number }> = {
  code: {
    title: 'كود التفعيل',
    subtitle: 'أدخل الكود الذي حصلت عليه من إدارة المدرسة',
    index: 0,
  },
  method: {
    title: 'طريقة التسجيل',
    subtitle: 'اختر كيف تريد إنشاء حسابك كمعلم',
    index: 1,
  },
  profile: {
    title: 'بياناتك',
    subtitle: 'الاسم ورقم الجوال — ضروري لدخول واتساب واسترجاع كلمة المرور',
    index: 2,
  },
  otp: {
    title: 'رمز التحقق',
    subtitle: 'أدخل الرمز الذي وصلك على واتساب',
    index: 3,
  },
  success: {
    title: 'تم بنجاح',
    subtitle: 'جاري تحويلك للمنصة…',
    index: 4,
  },
};

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40, scale: 0.98 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -36 : 36, scale: 0.98 }),
};

function StepDots({ step }: { step: Step }) {
  const current = STEP_META[step].index;
  const total = 4; // code → method → profile → otp (success hidden)
  return (
    <div className="tr-steps" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={
            i < current ? 'tr-step done' : i === current ? 'tr-step active' : 'tr-step'
          }
        />
      ))}
    </div>
  );
}

function OtpBoxes({
  value,
  onChange,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const setDigit = (index: number, char: string) => {
    const clean = char.replace(/\D/g, '');
    if (!clean && char !== '') return;
    const arr = digits.slice();
    if (clean.length > 1) {
      // paste
      const pasted = clean.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) arr[i] = pasted[i] ?? '';
      onChange(arr.join(''));
      const focusAt = Math.min(pasted.length, 5);
      refs.current[focusAt]?.focus();
      return;
    }
    arr[index] = clean;
    const next = arr.join('');
    onChange(next);
    if (clean && index < 5) refs.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const arr = digits.slice();
        arr[index] = '';
        onChange(arr.join(''));
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
        const arr = digits.slice();
        arr[index - 1] = '';
        onChange(arr.join(''));
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  return (
    <div className="tr-otp" dir="ltr">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={`tr-otp-cell${d ? ' filled' : ''}`}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={6}
          value={d}
          disabled={disabled}
          aria-label={`رقم ${i + 1} من رمز التحقق`}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          onPaste={(e) => {
            e.preventDefault();
            setDigit(i, e.clipboardData.getData('text'));
          }}
        />
      ))}
    </div>
  );
}

export function TeacherRegisterPage() {
  const navigate = useNavigate();
  const { setAuthSession } = useAuthStore();
  const [step, setStep] = useState<Step>('code');
  const [signupChannel, setSignupChannel] = useState<SignupChannel>('whatsapp');
  const [dir, setDir] = useState(1);
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const verifyingRef = useRef(false);

  const go = (next: Step, direction = 1) => {
    setDir(direction);
    setError(null);
    setInfo(null);
    setStep(next);
  };

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const ok = await verifyTeacherSignupCode(code);
      if (!ok) {
        setError('كود التفعيل غير صحيح — اطلبه من إدارة المدرسة');
        return;
      }
      markTeacherSignupVerified(code);
      go('method', 1);
    } catch (err: unknown) {
      setError(toLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      markTeacherSignupVerified(code);
      await signInWithGoogle('/auth/callback?intent=teacher');
    } catch (err: unknown) {
      setError(toLoginErrorMessage(err));
      setGoogleLoading(false);
    }
  };

  const sendOtp = async () => {
    setError(null);
    setInfo(null);
    if (fullName.trim().length < 3) {
      setError('أدخل الاسم الكامل (3 أحرف على الأقل)');
      return false;
    }
    if (phone.replace(/\D/g, '').length < 9) {
      setError('أدخل رقم جوال صحيح مثل 05xxxxxxxx');
      return false;
    }
    setLoading(true);
    try {
      markTeacherSignupVerified(code);
      const msg = await requestTeacherSignupOtp({
        phone,
        fullName,
        signupCode: code,
      });
      setInfo(msg);
      setResendIn(60);
      return true;
    } catch (err: unknown) {
      setError(toArabicErrorMessage(err));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (fullName.trim().length < 3) {
      setError('أدخل الاسم الكامل (3 أحرف على الأقل)');
      return;
    }
    if (phone.replace(/\D/g, '').length < 9) {
      setError('أدخل رقم جوال صحيح مثل 05xxxxxxxx');
      return;
    }

    if (signupChannel === 'google') {
      // ربط الجوال بعد عودة Google — لاسترجاع كلمة المرور والدخول بواتساب لاحقاً
      savePendingGoogleTeacherProfile(fullName, phone);
      await handleGoogle();
      return;
    }

    const ok = await sendOtp();
    if (ok) {
      setOtpCode('');
      go('otp', 1);
    }
  };

  const finishSignup = useCallback(
    async (otp: string) => {
      if (verifyingRef.current) return;
      if (!/^\d{6}$/.test(otp)) return;
      verifyingRef.current = true;
      setError(null);
      setInfo(null);
      setLoading(true);
      try {
        await verifyTeacherSignupOtp({
          phone,
          code: otp,
          fullName,
          signupCode: code,
        });
        const { supabase } = await import('../lib/supabase');
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (!session) throw new Error('لم تُنشأ جلسة — سجّل الدخول بالجوال من شاشة الطاقم');
        go('success', 1);
        const profile = await setAuthSession(session);
        const teacherTarget = await resolveTeacherPostLoginPath(profile);
        navigate(teacherTarget ?? resolveLoginTarget(session, profile), { replace: true });
      } catch (err: unknown) {
        setError(toArabicErrorMessage(err));
        setOtpCode('');
        verifyingRef.current = false;
        setLoading(false);
        window.setTimeout(() => {
          const first = document.querySelector<HTMLInputElement>('.tr-otp-cell');
          first?.focus();
        }, 50);
      }
    },
    [phone, fullName, code, setAuthSession, navigate],
  );

  const onOtpChange = (next: string) => {
    setOtpCode(next);
    setError(null);
    if (next.length === 6) {
      void finishSignup(next);
    }
  };

  const meta = STEP_META[step];

  return (
    <div className="login-shell tr-shell" dir="rtl">
      <div className="tr-bg" aria-hidden>
        <span className="tr-orb tr-orb-a" />
        <span className="tr-orb tr-orb-b" />
      </div>

      <motion.div
        className="tr-card"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="tr-header">
          <div className="tr-brand">
            <img src={PLATFORM_ICON} alt="" className="tr-logo" />
            <div>
              <p className="tr-kicker">
                <Sparkles className="w-3.5 h-3.5" />
                تسجيل معلم جديد
              </p>
              <h1>{PLATFORM_NAME}</h1>
            </div>
          </div>
          {step !== 'success' && <StepDots step={step} />}
        </header>

        <div className="tr-title-block">
          <AnimatePresence mode="wait">
            <motion.div
              key={step + '-title'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <h2>{meta.title}</h2>
              <p>{meta.subtitle}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {error && (
          <motion.div
            className="tr-alert tr-alert-error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            role="alert"
          >
            {error}
          </motion.div>
        )}
        {info && step === 'otp' && (
          <motion.div
            className="tr-alert tr-alert-ok"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            {info}
          </motion.div>
        )}

        <div className="tr-body">
          <AnimatePresence mode="wait" custom={dir}>
            {step === 'code' && (
              <motion.form
                key="code"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28 }}
                onSubmit={handleVerifyCode}
                className="tr-panel"
              >
                <div className="tr-icon-badge">
                  <KeyRound />
                </div>
                <label className="tr-label" htmlFor="teacher-code">
                  <Lock className="w-3.5 h-3.5" />
                  كود تفعيل المعلمين
                </label>
                <input
                  id="teacher-code"
                  className="tr-input tr-input-code"
                  dir="ltr"
                  placeholder="XXXXXXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  required
                  autoFocus
                  disabled={loading}
                  autoComplete="one-time-code"
                />
                <button type="submit" className="tr-btn tr-btn-primary" disabled={loading || code.length < 4}>
                  {loading ? 'جاري التحقق…' : 'متابعة'}
                </button>
              </motion.form>
            )}

            {step === 'method' && (
              <motion.div
                key="method"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28 }}
                className="tr-panel"
              >
                <div className="tr-success-chip">
                  <ShieldCheck className="w-4 h-4" />
                  تم التحقق من الكود
                </div>

                <button
                  type="button"
                  className="tr-choice"
                  onClick={() => {
                    setSignupChannel('google');
                    go('profile', 1);
                  }}
                  disabled={googleLoading || loading}
                >
                  <span className="tr-choice-icon google">
                    <GoogleGlyph className="w-5 h-5" />
                  </span>
                  <span className="tr-choice-text">
                    <strong>حساب Google</strong>
                    <small>ثم ربط رقم الجوال لدخول واتساب واسترجاع كلمة المرور</small>
                  </span>
                  <ArrowRight className="tr-choice-arrow" />
                </button>

                <button
                  type="button"
                  className="tr-choice"
                  onClick={() => {
                    setSignupChannel('whatsapp');
                    go('profile', 1);
                  }}
                  disabled={googleLoading || loading}
                >
                  <span className="tr-choice-icon whatsapp">
                    <MessageCircle className="w-5 h-5" />
                  </span>
                  <span className="tr-choice-text">
                    <strong>رقم واتساب</strong>
                    <small>رمز تحقق يُرسل إلى جوالك</small>
                  </span>
                  <ArrowRight className="tr-choice-arrow" />
                </button>

                {googleLoading && <p className="tr-hint">جاري التحويل إلى Google…</p>}

                <button type="button" className="tr-btn-ghost" onClick={() => go('code', -1)}>
                  تغيير الكود
                </button>
              </motion.div>
            )}

            {step === 'profile' && (
              <motion.form
                key="profile"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28 }}
                onSubmit={handleProfileSubmit}
                className="tr-panel"
              >
                <div className="tr-icon-badge">
                  {signupChannel === 'google' ? <KeyRound /> : <UserRound />}
                </div>
                {signupChannel === 'google' && (
                  <p className="tr-hint" style={{ marginBottom: '0.75rem' }}>
                    بعد Google سيُربط رقم الجوال بحسابك — للدخول بواتساب واسترجاع كلمة المرور من شاشة الطاقم.
                  </p>
                )}
                <label className="tr-label" htmlFor="teacher-name">
                  الاسم الكامل
                </label>
                <input
                  id="teacher-name"
                  className="tr-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading || googleLoading}
                  placeholder="الاسم الثلاثي"
                  autoFocus
                />
                <label className="tr-label" htmlFor="teacher-phone">
                  <Smartphone className="w-3.5 h-3.5" />
                  رقم الجوال
                </label>
                <input
                  id="teacher-phone"
                  className="tr-input"
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={loading || googleLoading}
                  placeholder="05xxxxxxxx"
                  autoComplete="tel"
                />
                <button
                  type="submit"
                  className="tr-btn tr-btn-primary"
                  disabled={loading || googleLoading}
                >
                  {signupChannel === 'google'
                    ? googleLoading
                      ? 'جاري التحويل إلى Google…'
                      : 'متابعة عبر Google'
                    : loading
                      ? 'جاري إرسال الرمز…'
                      : 'إرسال رمز واتساب'}
                </button>
                <button
                  type="button"
                  className="tr-btn-ghost"
                  onClick={() => go('method', -1)}
                  disabled={loading || googleLoading}
                >
                  رجوع
                </button>
              </motion.form>
            )}

            {step === 'otp' && (
              <motion.div
                key="otp"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28 }}
                className="tr-panel"
              >
                <div className="tr-icon-badge pulse">
                  <MessageCircle />
                </div>
                <p className="tr-otp-hint">
                  أرسلنا رمزاً إلى{' '}
                  <strong dir="ltr">{phone.replace(/\D/g, '').replace(/^966/, '0') || phone}</strong>
                </p>
                <OtpBoxes
                  value={otpCode}
                  onChange={onOtpChange}
                  disabled={loading}
                  autoFocus
                />
                <p className="tr-otp-auto">
                  {loading ? 'جاري التحقق وإنشاء الحساب…' : 'يكتمل التحقق تلقائياً بعد إدخال 6 أرقام'}
                </p>
                <div className="tr-otp-actions">
                  <button
                    type="button"
                    className="tr-btn-ghost"
                    disabled={loading || resendIn > 0}
                    onClick={async () => {
                      const ok = await sendOtp();
                      if (ok) setOtpCode('');
                    }}
                  >
                    {resendIn > 0 ? `إعادة الإرسال بعد ${resendIn}ث` : 'إعادة إرسال الرمز'}
                  </button>
                  <button
                    type="button"
                    className="tr-btn-ghost"
                    disabled={loading}
                    onClick={() => {
                      verifyingRef.current = false;
                      go('profile', -1);
                      setOtpCode('');
                    }}
                  >
                    تغيير الرقم
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                key="success"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="tr-panel tr-success-panel"
              >
                <motion.div
                  className="tr-success-icon"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                >
                  <CheckCircle2 />
                </motion.div>
                <h3>مرحباً بك معلماً</h3>
                <p>تم إنشاء حسابك — جاري فتح المنصة…</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="tr-footer">
          لديك حساب؟{' '}
          <Link to="/login/staff">تسجيل الدخول (طاقم)</Link>
        </footer>
      </motion.div>
    </div>
  );
}
