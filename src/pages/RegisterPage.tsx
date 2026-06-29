import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { registerUser, signIn, getHomePathForRole, toArabicErrorMessage } from '../lib/auth';
import { useAuthStore } from '../stores/authStore';
import { StudentClassFields } from '../components/users/StudentClassFields';
import { LoginIllustration } from '../components/auth/LoginIllustration';
import { ROLE_LABELS, PUBLIC_REGISTER_ROLES } from '../types';
import type { UserRole } from '../types';
import './LoginPage.css';
import { PLATFORM_NAME } from '../lib/branding';

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  principal: 'صلاحيات كاملة: المستخدمون، التقارير، سجل الأحداث',
  admin: 'إدارة الأنشطة، النقاط، البطاقات، المتصدرين والتقارير',
  activity_leader: 'إدارة الأنشطة، منح النقاط، الموافقة والحضور',
  supervisor: 'المهارات، بنك الأسئلة، الاختبارات والتحليلات',
  teacher: 'منح النقاط للطلاب ومتابعة فصوله',
  parent: 'متابعة ملف الطالب ونتائج الاختبارات',
  student: 'لوحة الطالب، النقاط والأنشطة',
};

export function RegisterPage() {
  const navigate = useNavigate();
  const { setAuthSession } = useAuthStore();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'parent' as UserRole,
  });
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [grade, setGrade] = useState('');
  const [className, setClassName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.full_name.trim()) {
      setError('الاسم الكامل مطلوب');
      return;
    }
    if (!form.email.trim()) {
      setError('البريد الإلكتروني مطلوب');
      return;
    }
    if (form.password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('كلمة المرور غير متطابقة');
      return;
    }
    if (form.role === 'student') {
      if (!admissionNumber.trim() || !grade || !className) {
        setError('للطلاب: رقم القيد والصف والفصل مطلوبة');
        return;
      }
    }

    setLoading(true);
    try {
      await registerUser({
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        role: form.role,
        admission_number: form.role === 'student' ? admissionNumber.trim() : undefined,
        grade: form.role === 'student' ? grade.trim() : undefined,
        class_name: form.role === 'student' ? className.trim() : undefined,
      });

      const { session } = await signIn(form.email.trim(), form.password);
      if (!session) throw new Error('فشل تسجيل الدخول');

      const profile = await setAuthSession(session);
      const role = profile?.role ?? form.role;
      navigate(getHomePathForRole(role), { replace: true });
    } catch (err: unknown) {
      setError(toArabicErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell" dir="rtl">
      <div className="login-container login-container--register">
        <div className="login-form-side login-form-side--register">
          <form className="login-form login-form--scroll" onSubmit={handleSubmit}>
            <div className="login-brand">
              <h1>إنشاء حساب جديد</h1>
              <p>{PLATFORM_NAME}</p>
              <p className="login-hint">التسجيل متاح لأولياء الأمور والطلاب فقط</p>
              <p className="login-hint login-hint--warn">
                حسابات الموظفين (معلم، مشرف، مدير) تُنشأ من قبل إدارة المدرسة فقط
              </p>
            </div>

            {error && <div className="login-error">{error}</div>}

            <div className="login-field">
              <label htmlFor="register-name" className="login-field-label">
                الاسم الكامل
              </label>
              <input
                id="register-name"
                className="login-input"
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
                placeholder="الاسم الكامل"
              />
            </div>

            <div className="login-field">
              <label htmlFor="register-email" className="login-field-label">
                البريد الإلكتروني
              </label>
              <input
                id="register-email"
                className="login-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
                placeholder="example@school.edu"
              />
            </div>

            <div className="login-field">
              <label htmlFor="register-role" className="login-field-label">
                الدور والصلاحيات
              </label>
              <select
                id="register-role"
                className="login-select"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              >
                {PUBLIC_REGISTER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <p className="login-field-hint">{ROLE_DESCRIPTIONS[form.role]}</p>
            </div>

            {form.role === 'student' && (
              <StudentClassFields
                variant="auth"
                admissionNumber={admissionNumber}
                grade={grade}
                className={className}
                onAdmissionNumberChange={setAdmissionNumber}
                onGradeChange={setGrade}
                onClassNameChange={setClassName}
              />
            )}

            <div className="login-field">
              <label htmlFor="register-password" className="login-field-label">
                كلمة المرور
              </label>
              <div className="login-input-wrap">
                <input
                  id="register-password"
                  className="login-input login-input--password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="new-password"
                  placeholder="8 أحرف على الأقل"
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

            <div className="login-field">
              <label htmlFor="register-confirm" className="login-field-label">
                تأكيد كلمة المرور
              </label>
              <input
                id="register-confirm"
                className="login-input"
                type={showPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
                autoComplete="new-password"
                placeholder="أعد إدخال كلمة المرور"
              />
            </div>

            <div className="login-actions">
              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
              </button>
              <p className="login-register" style={{ marginTop: '0.75rem' }}>
                لديك حساب بالفعل؟ <Link to="/login">تسجيل الدخول</Link>
              </p>
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
