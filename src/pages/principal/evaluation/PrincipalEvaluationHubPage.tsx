import { Award, Settings, BarChart3, ClipboardList } from 'lucide-react';
import {
  AcademicLayout,
  AcademicPageHeader,
  AcademicActionCard,
  AcademicHeroBanner,
} from '../../../components/academic/AcademicUi';
import { useAuthStore } from '../../../stores/authStore';

const ACCENTS = ['gold', 'purple', 'blue', 'green'] as const;

export function PrincipalEvaluationHubPage() {
  const { user } = useAuthStore();
  const cards = [
    {
      to: '/principal/evaluation/cycle',
      label: 'تقييم الشهر',
      description: 'تقييم المعلمين، لوحة المتصدرين، معلم الشهر',
      icon: Award,
    },
    {
      to: '/principal/evaluation/settings',
      label: 'إعداد البنود',
      description: 'المحاور، البنود، الأوزان، الخصومات',
      icon: Settings,
    },
    {
      to: '/principal/evaluation/cycle',
      label: 'التقارير الشهرية',
      description: 'ترتيب المعلمين وتقارير الأداء',
      icon: BarChart3,
    },
    {
      to: '/principal/evaluation/cycle',
      label: 'إدخال الخصومات',
      description: 'غياب، تأخير، شكاوى، مخالفات',
      icon: ClipboardList,
    },
  ];

  return (
    <AcademicLayout>
      <AcademicPageHeader title="تقييم المعلمين" backTo="/dashboard" badge="مدير" />
      <AcademicHeroBanner
        title="نظام تقييم المعلمين"
        subtitle="بنود قابلة للتخصيص — أوزان متعددة المصادر — معلم الشهر"
        avatar={user?.full_name?.charAt(0) ?? 'م'}
      />
      <div className="grid sm:grid-cols-2 gap-4">
        {cards.map((c, i) => (
          <AcademicActionCard key={c.label} {...c} accent={ACCENTS[i % ACCENTS.length]} />
        ))}
      </div>
      <p className="text-[#A3AED0] text-xs mt-6 leading-relaxed">
        مصادر التقييم الافتراضية: مدير 50% · وكيل/مشرف 20% · طلاب 15% · أولياء الأمور 10% · ذاتي 5%.
        يمكن تعديل البنود والأوزان من إعداد البنود.
      </p>
    </AcademicLayout>
  );
}
