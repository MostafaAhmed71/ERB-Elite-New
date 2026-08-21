import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Phone, User } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { completeTeacherProfile } from '../../lib/teacherSignup';
import {
  AcademicLayout,
  AcademicPageHeader,
  AcademicFormPanel,
  AcademicField,
  academicInputClass,
  academicBtnPrimary,
} from '../../components/academic/AcademicUi';

export function TeacherOnboardingPage() {
  const navigate = useNavigate();
  const { user, setAuthSession } = useAuthStore();
  const session = useAuthStore((s) => s.session);
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await completeTeacherProfile(fullName, phone);
      if (session) await setAuthSession(session);
      toast.success('تم حفظ بياناتك');
      navigate('/academic/teacher-setup', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذّر الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AcademicLayout size="lg">
      <AcademicPageHeader
        title="إكمال ملف المعلم"
        subtitle="أدخل اسمك ورقم جوالك — الجوال يُستخدم لدخول واتساب واسترجاع كلمة المرور لاحقاً"
      />
      <form onSubmit={submit}>
        <AcademicFormPanel>
          {error && (
            <p className="text-red-300 text-sm bg-red-500/10 px-3 py-2 rounded-xl">{error}</p>
          )}
          <p className="text-sm text-[#A3AED0] leading-relaxed -mt-1 mb-1">
            حتى إن سجّلت عبر Google، ربط الجوال ضروري: من شاشة الطاقم يمكنك الدخول بالواتساب أو استرجاع كلمة المرور برقمك.
          </p>
          <AcademicField label="الاسم الكامل">
            <div className="relative">
              <User className="w-4 h-4 text-white/30 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                className={`${academicInputClass} pr-10`}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="كما يظهر للطلاب وأولياء الأمور"
              />
            </div>
          </AcademicField>
          <AcademicField label="رقم الجوال">
            <div className="relative">
              <Phone className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className={`${academicInputClass} pl-10`}
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="05XXXXXXXX"
                inputMode="tel"
              />
            </div>
          </AcademicField>
          <button type="submit" className={`${academicBtnPrimary} w-full`} disabled={loading}>
            {loading ? 'جاري الحفظ...' : 'حفظ والمتابعة للإعداد الأكاديمي'}
          </button>
        </AcademicFormPanel>
      </form>
    </AcademicLayout>
  );
}
