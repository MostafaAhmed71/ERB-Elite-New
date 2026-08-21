import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Copy, Check, Link2, GraduationCap, Users, ArrowLeft, Sparkles } from 'lucide-react';
import {
  completeParentOnboarding,
  completeStudentOnboarding,
  lookupStudentByNationalId,
  lookupStudentByLinkCode,
  linkParentToStudentByCode,
  FAMILY_ONBOARDING_ROLES,
  needsFamilyOnboarding,
  type OnboardingRole,
  type StudentByNationalId,
  type StudentLookup,
} from '../lib/familyOnboarding';
import { getHomePathForRole, toArabicErrorMessage } from '../lib/auth';
import { useAuthStore } from '../stores/authStore';
import { PLATFORM_ICON, PLATFORM_NAME, PLATFORM_TAGLINE } from '../lib/branding';
import '../pages/LoginPage.css';
import './OnboardingRole.css';

type Step =
  | 'role'
  | 'student-id'
  | 'student-phone'
  | 'student-code'
  | 'parent-code'
  | 'parent-form'
  | 'parent-more';

export function OnboardingPage() {
  const { user, session, refreshUser, logout } = useAuthStore();
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<OnboardingRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [claimedStudent, setClaimedStudent] = useState<StudentByNationalId | null>(null);
  const [lookup, setLookup] = useState<StudentLookup | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkedNames, setLinkedNames] = useState<string[]>([]);

  const [parentForm, setParentForm] = useState({
    full_name: user?.full_name && user.full_name !== 'مستخدم جديد' ? user.full_name : '',
    phone: '',
    national_id: '',
  });

  useEffect(() => {
    if (user?.full_name && user.full_name !== 'مستخدم جديد') {
      setParentForm((s) => (s.full_name ? s : { ...s, full_name: user.full_name }));
    }
  }, [user?.full_name]);

  // إن كان الدور معروفاً مسبقاً (حساب إداري) لا تعرض شاشة الاختيار القديمة
  useEffect(() => {
    if (!user) return;
    if (user.role === 'student' || user.role === 'parent') {
      setRole(user.role);
      setStep((current) => (current === 'role' ? (user.role === 'student' ? 'student-id' : 'parent-code') : current));
    }
  }, [user]);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (user && !needsFamilyOnboarding(user) && step === 'role') {
    return <Navigate to={getHomePathForRole(user.role)} replace />;
  }

  const pickRole = (next: OnboardingRole) => {
    setRole(next);
    setError(null);
    setStep(next === 'student' ? 'student-id' : 'parent-code');
  };

  const verifyNationalId = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const found = await lookupStudentByNationalId(nationalId);
      setClaimedStudent(found);
      setStep('student-phone');
    } catch (err) {
      setError(toArabicErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitStudentPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await completeStudentOnboarding({
        national_id: nationalId,
        phone,
      });
      setStudentCode(result.link_code);
      await refreshUser();
      setStep('student-code');
    } catch (err) {
      setError(toArabicErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const verifyParentCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const found = await lookupStudentByLinkCode(linkCode);
      setLookup(found);
      setStep('parent-form');
    } catch (err) {
      setError(toArabicErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await completeParentOnboarding({
        ...parentForm,
        link_code: linkCode,
      });
      setLinkedNames([result.student_name]);
      await refreshUser();
      setStep('parent-more');
    } catch (err) {
      setError(toArabicErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const linkAnother = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await linkParentToStudentByCode(linkCode);
      setLinkedNames((prev) =>
        prev.includes(result.student_name) ? prev : [...prev, result.student_name]
      );
      setLinkCode('');
      setLookup(null);
    } catch (err) {
      setError(toArabicErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(studentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('تعذّر نسخ الكود — انسخه يدوياً');
    }
  };

  const finish = () => {
    const r = useAuthStore.getState().user?.role ?? role ?? 'student';
    window.location.replace(getHomePathForRole(r));
  };

  if (step === 'role') {
    return (
      <div className="onb-role-shell" dir="rtl">
        <div className="onb-role-inner">
          <header className="onb-role-brand onb-rise">
            <img src={PLATFORM_ICON} alt={PLATFORM_NAME} />
            <span className="onb-kicker">
              <Sparkles size={12} style={{ display: 'inline', verticalAlign: '-1px', marginLeft: 4 }} />
              {PLATFORM_NAME}
            </span>
            <h1>كيف تريد المتابعة؟</h1>
            <p>
              {PLATFORM_TAGLINE} — اختر دورك لربط حسابك بالمدرسة خلال خطوات قصيرة.
            </p>
          </header>

          {error && (
            <div className="login-error onb-rise onb-rise-delay-1" style={{ maxWidth: 480, marginInline: 'auto' }}>
              {error}
            </div>
          )}

          <div className="onb-role-grid">
            {FAMILY_ONBOARDING_ROLES.map((item, index) => {
              const isStudent = item.id === 'student';
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`onb-role-card onb-role-card--${item.id} onb-rise ${
                    index === 0 ? 'onb-rise-delay-1' : 'onb-rise-delay-2'
                  }`}
                  onClick={() => pickRole(item.id)}
                >
                  <span className="onb-role-icon" aria-hidden>
                    {isStudent ? <GraduationCap size={26} /> : <Users size={26} />}
                  </span>
                  <h2>{item.label}</h2>
                  <p>{item.hint}</p>
                  <span className="onb-role-cta">
                    ابدأ الآن
                    <ArrowLeft size={16} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="onb-role-footer onb-rise onb-rise-delay-3">
            <button type="button" onClick={() => void logout()}>
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-shell" dir="rtl">
      <div className="login-container login-container--register" style={{ width: 'min(640px, 99vw)' }}>
        <div className="login-form-side" style={{ width: '100%', minHeight: 480 }}>
          <div className="login-form login-form--scroll">
            <div className="login-brand">
              <img src={PLATFORM_ICON} alt={PLATFORM_NAME} className="login-brand-logo" />
              <h1>إكمال بيانات الحساب</h1>
              <p>خطوة قصيرة لربط حسابك بالمدرسة</p>
            </div>

            {error && <div className="login-error">{error}</div>}

            {step === 'student-id' && (
              <form onSubmit={verifyNationalId} className="w-full">
                <p className="login-hint">
                  يجب أن تكون بياناتك مرفوعة مسبقاً من إدارة المدرسة. أدخل رقم الهوية للتحقق.
                </p>
                <div className="login-field">
                  <label className="login-field-label">رقم الهوية</label>
                  <input
                    className="login-input"
                    dir="ltr"
                    inputMode="numeric"
                    placeholder="مثال: 2490603186"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value.trim())}
                    required
                  />
                </div>
                <div className="login-actions">
                  <button type="submit" className="login-submit" disabled={loading}>
                    {loading ? 'جاري التحقق...' : 'تحقق من رقم الهوية'}
                  </button>
                  <button type="button" className="login-google" onClick={() => setStep('role')}>
                    رجوع
                  </button>
                </div>
              </form>
            )}

            {step === 'student-phone' && claimedStudent && (
              <form onSubmit={submitStudentPhone} className="w-full">
                <div className="login-student-box" style={{ marginBottom: '1rem' }}>
                  <p className="login-hint" style={{ margin: 0 }}>
                    تم العثور على سجلك:
                  </p>
                  <p style={{ color: '#f0b429', fontWeight: 800, margin: '0.4rem 0 0', fontSize: '1.15rem' }}>
                    {claimedStudent.full_name}
                  </p>
                  <p className="login-hint" style={{ margin: '0.35rem 0 0' }}>
                    {claimedStudent.grade} — فصل {claimedStudent.class_name}
                  </p>
                  <p className="login-hint" style={{ margin: '0.25rem 0 0' }} dir="ltr">
                    الهوية: {claimedStudent.national_id}
                  </p>
                </div>
                <div className="login-field">
                  <label className="login-field-label">رقم الجوال</label>
                  <input
                    className="login-input"
                    dir="ltr"
                    inputMode="tel"
                    placeholder="05xxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="login-actions">
                  <button type="submit" className="login-submit" disabled={loading}>
                    {loading ? 'جاري الربط...' : 'تأكيد وربط الحساب'}
                  </button>
                  <button
                    type="button"
                    className="login-google"
                    onClick={() => {
                      setStep('student-id');
                      setClaimedStudent(null);
                      setPhone('');
                    }}
                  >
                    رجوع
                  </button>
                </div>
              </form>
            )}

            {step === 'student-code' && (
              <div className="w-full space-y-4 text-center">
                <p className="login-hint">احفظ هذا الكود وأعطه لولي أمرك ليرتبط بحسابك</p>
                <div
                  className="login-student-box"
                  style={{ fontSize: '2rem', letterSpacing: '0.25em', fontWeight: 800, color: '#f0b429' }}
                  dir="ltr"
                >
                  {studentCode}
                </div>
                <button type="button" className="login-google" onClick={copyCode}>
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  <span>{copied ? 'تم النسخ' : 'نسخ الكود'}</span>
                </button>
                <button type="button" className="login-submit" onClick={finish}>
                  الدخول إلى لوحتي
                </button>
              </div>
            )}

            {step === 'parent-code' && (
              <form onSubmit={verifyParentCode} className="w-full">
                <div className="login-field">
                  <label className="login-field-label flex items-center gap-2">
                    <Link2 size={16} /> كود الطالب
                  </label>
                  <input
                    className="login-input"
                    dir="ltr"
                    placeholder="مثال: A3F9K2"
                    value={linkCode}
                    onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                    required
                    maxLength={12}
                  />
                  <p className="login-field-hint">اطلب الكود من ابنك بعد ربط حسابه</p>
                </div>
                <div className="login-actions">
                  <button type="submit" className="login-submit" disabled={loading}>
                    {loading ? 'جاري التحقق...' : 'تحقق من الكود'}
                  </button>
                  <button type="button" className="login-google" onClick={() => setStep('role')}>
                    رجوع
                  </button>
                </div>
              </form>
            )}

            {step === 'parent-form' && (
              <form onSubmit={submitParent} className="w-full">
                {lookup && (
                  <div className="login-student-box" style={{ marginBottom: '1rem' }}>
                    <p className="login-hint" style={{ margin: 0 }}>
                      سيتم الربط مع: <strong className="text-white">{lookup.full_name}</strong>
                      <br />
                      {lookup.grade} — فصل {lookup.class_name}
                    </p>
                  </div>
                )}
                <div className="login-field">
                  <label className="login-field-label">الاسم الكامل</label>
                  <input
                    className="login-input"
                    value={parentForm.full_name}
                    onChange={(e) => setParentForm({ ...parentForm, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="login-field">
                  <label className="login-field-label">رقم الجوال</label>
                  <input
                    className="login-input"
                    dir="ltr"
                    inputMode="tel"
                    placeholder="05xxxxxxxx"
                    value={parentForm.phone}
                    onChange={(e) => setParentForm({ ...parentForm, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="login-field">
                  <label className="login-field-label">رقم الهوية</label>
                  <input
                    className="login-input"
                    dir="ltr"
                    value={parentForm.national_id}
                    onChange={(e) => setParentForm({ ...parentForm, national_id: e.target.value })}
                    required
                  />
                </div>
                <div className="login-actions">
                  <button type="submit" className="login-submit" disabled={loading}>
                    {loading ? 'جاري الحفظ...' : 'حفظ وربط الطالب'}
                  </button>
                  <button
                    type="button"
                    className="login-google"
                    onClick={() => {
                      setStep('parent-code');
                      setLookup(null);
                    }}
                  >
                    رجوع
                  </button>
                </div>
              </form>
            )}

            {step === 'parent-more' && (
              <div className="w-full space-y-3">
                <div className="login-student-box">
                  <p className="login-hint" style={{ margin: 0 }}>
                    الأبناء المرتبطون:
                  </p>
                  <ul style={{ margin: '0.5rem 0 0', paddingRight: '1.2rem', color: '#f0b429' }}>
                    {linkedNames.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </div>
                <form onSubmit={linkAnother} className="space-y-2">
                  <div className="login-field">
                    <label className="login-field-label">ربط طالب إضافي (اختياري)</label>
                    <input
                      className="login-input"
                      dir="ltr"
                      placeholder="كود طالب آخر"
                      value={linkCode}
                      onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                    />
                  </div>
                  <button
                    type="submit"
                    className="login-google"
                    disabled={loading || !linkCode.trim()}
                  >
                    {loading ? 'جاري الربط...' : 'ربط طالب آخر'}
                  </button>
                </form>
                <button type="button" className="login-submit" onClick={finish}>
                  متابعة إلى لوحة ولي الأمر
                </button>
              </div>
            )}

            <button
              type="button"
              className="login-register"
              style={{ marginTop: '1.25rem', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => void logout()}
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
