import {
  BookOpen, Calendar, FileText, ClipboardList, MessageSquare, Upload, Search, Settings, Award, Send, CalendarCheck, Users,
} from 'lucide-react';
import {
  AcademicLayout, AcademicPageHeader, AcademicActionCard, AcademicHeroBanner, AcademicBadge,
} from '../../components/academic/AcademicUi';
import { useAuthStore } from '../../stores/authStore';
import { ROLE_LABELS } from '../../types';
import { ModeWorkspaceBanner } from '../../components/teacher/ModeWorkspaceBanner';
import { useTeacherModeStore } from '../../stores/teacherModeStore';
import { roleUsesAppMode } from '../../lib/teacherMode';

const ACCENTS = ['gold', 'blue', 'purple', 'green', 'rose', 'gold'] as const;

export function AcademicStaffHubPage() {
  const { role, user } = useAuthStore();
  const appMode = useTeacherModeStore((s) => s.mode);
  const isTeacher = role === 'teacher';
  const isDeputy = role === 'deputy';
  const isPrincipal = role === 'principal';
  const isSupervisor = role === 'supervisor';
  const showModeBanner = roleUsesAppMode(role);

  const teacherCards = [
    { to: '/academic/homework', label: 'الواجبات', description: 'إنشاء وإدارة الواجبات اليومية', icon: BookOpen },
    { to: '/academic/weekly-plans', label: 'الخطط الأسبوعية', description: 'تخطيط الحصص أسبوعياً', icon: Calendar },
    { to: '/academic/schedule', label: 'الجدول الدراسي', description: 'جدول الحصص والنصاب', icon: ClipboardList },
    { to: '/academic/teacher-setup', label: 'الملف التعليمي', description: 'تعديل الصفوف والفصول والمواد', icon: Settings },
    { to: '/academic/lesson-topics', label: 'مواضيع الدروس', description: 'قائمة مواضيع كل مادة', icon: FileText },
    { to: '/academic/reviews', label: 'مراجعات PDF', description: 'رفع للمراجع ثم اعتماد المدير والنشر', icon: Upload },
    { to: '/academic/observation-tasks', label: 'طلبات ملاحظات الطلاب', description: 'إفادة طلبات الملاحظة المرسلة إليك', icon: Send },
    { to: '/academic/reports', label: 'تقارير الملاحظات', description: 'متابعة وملاحظات الطلاب', icon: ClipboardList },
    { to: '/academic/communication', label: 'التواصل', description: 'تقارير التواصل مع أولياء الأمور', icon: MessageSquare },
    { to: '/teacher/evaluation', label: 'تقييمي الأدائي', description: 'التقييم الذاتي وتقرير الأداء', icon: Award },
  ];

  const deputyCards = [
    { to: '/academic/attendance', label: 'الحضور والغياب', description: 'تسجيل يومي لفصول مرحلتك', icon: CalendarCheck },
    { to: '/academic/students', label: 'طلاب المرحلة', description: 'عرض ونقل طلاب مرحلتك مع نقاطهم', icon: Users },
    { to: '/academic/observation-inbox', label: 'تقارير ملاحظات الطلاب', description: 'تفاصيل الطلبات، إرسال للمعلمين، وتذكير واتساب', icon: Send },
    { to: '/academic/homework', label: 'الواجبات', description: 'عرض واجبات مرحلتك', icon: BookOpen },
    { to: '/academic/exam-results', label: 'نتائج المرحلة', description: 'ملخص اختبارات طلاب مرحلتك', icon: ClipboardList },
    { to: '/academic/weekly-plans', label: 'الخطط', description: 'خطط الأسبوع', icon: Calendar },
    { to: '/academic/reviews', label: 'مراجعات PDF', description: 'متابعة المراجعات', icon: Upload },
    { to: '/academic/reports', label: 'التقارير المحفوظة', description: 'عرض تقارير الملاحظات المكتملة', icon: ClipboardList },
    { to: '/academic/communication', label: 'التواصل', description: 'تقارير أولياء الأمور', icon: MessageSquare },
    { to: '/academic/export', label: 'التصدير', description: 'قوالب الواجبات والخطط PDF/PNG', icon: FileText },
    { to: '/academic/search', label: 'بحث متقدم', description: 'بحث في الواجبات والخطط', icon: Search },
    { to: '/academic/teacher-evaluation', label: 'تقييم المعلمين', description: 'تقييم أداء المعلمين (20%)', icon: Award },
  ];

  const principalCards = [
    { to: '/academic/observation-inbox', label: 'تقارير ملاحظات الطلاب', description: 'تفاصيل الطلبات، إرسال للمعلمين، وتذكير واتساب', icon: Send },
    { to: '/principal/academic', label: 'إدارة أكاديمية', description: 'مواد، فصول، إعدادات', icon: Settings },
    { to: '/principal/academic/monitoring', label: 'مراقبة النشاط', description: 'متابعة واجبات المعلمين', icon: ClipboardList },
    { to: '/academic/reviews', label: 'اعتماد المراجعات', description: 'اعتماد ملفات المراجع ونشرها للطالب وولي الأمر', icon: Upload },
    { to: '/academic/reports', label: 'التقارير المحفوظة', description: 'عرض تقارير الملاحظات', icon: FileText },
    { to: '/academic/communication', label: 'التواصل', description: 'اعتماد تقارير التواصل', icon: MessageSquare },
    { to: '/academic/export', label: 'التصدير', description: 'قوالب الواجبات والخطط PDF/PNG', icon: FileText },
    { to: '/academic/search', label: 'بحث متقدم', description: 'بحث شامل', icon: Search },
    { to: '/principal/evaluation', label: 'تقييم المعلمين', description: 'معلم الشهر ولوحة المتصدرين', icon: Award },
  ];

  const supervisorCards = [
    { to: '/academic/observation-inbox', label: 'تقارير ملاحظات الطلاب', description: 'تفاصيل الطلبات، إرسال للمعلمين، وتذكير واتساب', icon: Send },
    { to: '/academic/reports', label: 'التقارير المحفوظة', description: 'عرض تقارير الملاحظات المكتملة', icon: ClipboardList },
    { to: '/academic/homework', label: 'الواجبات', description: 'عرض واجبات جميع المعلمين', icon: BookOpen },
    { to: '/academic/weekly-plans', label: 'الخطط الأسبوعية', description: 'عرض خطط المعلمين', icon: Calendar },
    { to: '/academic/search', label: 'بحث أكاديمي', description: 'بحث في الواجبات', icon: Search },
    { to: '/academic/teacher-evaluation', label: 'تقييم المعلمين', description: 'تقييم أداء المعلمين', icon: Award },
  ];

  const cards = isTeacher
    ? teacherCards
    : isDeputy
      ? deputyCards
      : isPrincipal
        ? principalCards
        : isSupervisor
          ? supervisorCards
          : [];

  const roleLabel = role ? ROLE_LABELS[role] : undefined;
  const avatar = user?.full_name?.charAt(0) ?? 'أ';

  return (
    <AcademicLayout>
      <AcademicHeroBanner
        title={`مرحباً، ${user?.full_name?.split(' ')[0] ?? 'زميلنا'}`}
        subtitle="الشؤون الأكاديمية"
        roleLabel={roleLabel}
        avatar={avatar}
      />
      {showModeBanner && <ModeWorkspaceBanner mode={appMode} homeTo="/dashboard" />}
      <AcademicPageHeader
        title="لوحة الشؤون الأكاديمية"
        subtitle={
          isSupervisor
            ? 'متابعة أكاديمية وصندوق طلبات ملاحظة أولياء الأمور'
            : 'واجبات، خطط، مراجعات — مدمجة مع نظام أولمبياد النقاط'
        }
        badge="أكاديمي"
        action={isSupervisor ? <AcademicBadge variant="info">مشرف تربوي</AcademicBadge> : undefined}
      />
      <div className="mobile-card-grid">
        {cards.map((c, i) => (
          <AcademicActionCard key={c.to} {...c} accent={ACCENTS[i % ACCENTS.length]} />
        ))}
      </div>
    </AcademicLayout>
  );
}
