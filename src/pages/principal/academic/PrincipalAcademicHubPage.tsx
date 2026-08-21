import { BookMarked, Layers, Settings, Users, UserCheck, BarChart3, LayoutTemplate, MessageCircle, Sparkles, CalendarCheck } from 'lucide-react';
import {
  AcademicLayout, AcademicPageHeader, AcademicActionCard, AcademicHeroBanner,
} from '../../../components/academic/AcademicUi';
import { useAuthStore } from '../../../stores/authStore';

const ACCENTS = ['gold', 'blue', 'purple', 'green', 'rose', 'gold', 'blue', 'purple'] as const;

export function PrincipalAcademicHubPage() {
  const { user } = useAuthStore();
  const avatar = user?.full_name?.charAt(0) ?? 'م';

  const cards = [
    { to: '/principal/academic/attendance', label: 'متابعة الغياب اليومي', description: 'فصول مكتملة ومتبقية · تذكير واتساب للوكلاء', icon: CalendarCheck },
    { to: '/principal/academic/students', label: 'طلاب المدرسة', description: 'عرض ونقل الطلاب بين الفصول مع نقاطهم', icon: Users },
    { to: '/principal/academic/subjects', label: 'المواد', description: 'إضافة وتعديل المواد الدراسية', icon: BookMarked },
    { to: '/principal/academic/sections', label: 'الفصول', description: 'إدارة الفصول أ، ب، ج، د', icon: Layers },
    { to: '/principal/academic/assignments', label: 'إسناد المواد', description: 'ربط المعلمين بالمواد', icon: UserCheck },
    { to: '/principal/academic/monitoring', label: 'مراقبة النشاط', description: 'متابعة الواجبات والخطط', icon: BarChart3 },
    { to: '/principal/academic/whatsapp-reminders', label: 'تذكيرات واتساب', description: 'إرسال أي نوع تذكير للمعلمين', icon: MessageCircle },
    { to: '/principal/ai-settings', label: 'مساعد الذكاء', description: 'قوالب المدرسة ورصيد AI للمعلمين', icon: Sparkles },
    { to: '/principal/academic/export-templates', label: 'قوالب التصدير', description: 'موقع البطاقات والجدول على القالب', icon: LayoutTemplate },
    { to: '/principal/academic/staff', label: 'الموظفون', description: 'معلمون ووكلاء', icon: Users },
    { to: '/principal/academic/settings', label: 'الإعدادات', description: 'المراحل وكود التفعيل', icon: Settings },
  ];

  return (
    <AcademicLayout>
      <AcademicPageHeader title="الإدارة الأكاديمية" backTo="/dashboard" backLabel="الرئيسية" badge="مدير" />
      <AcademicHeroBanner
        title="مركز الإدارة الأكاديمية"
        subtitle="إعدادات المواد، الفصول، والموظفين"
        avatar={avatar}
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <AcademicActionCard key={c.to} {...c} accent={ACCENTS[i % ACCENTS.length]} />
        ))}
      </div>
    </AcademicLayout>
  );
}
