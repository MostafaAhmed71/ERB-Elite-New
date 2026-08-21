import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Settings, Users, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '../../components/ui/PageHeader';
import { SchoolSettingsPage } from './SchoolSettingsPage';
import { ClassStudentsRatingTab } from '../../components/principal/ClassStudentsRatingTab';
import { AcademicYearPanel } from '../../components/principal/AcademicYearPanel';

type Tab = 'catalog' | 'students' | 'academic-year';

const TABS: { id: Tab; label: string; icon: typeof Settings }[] = [
  { id: 'students', label: 'الطلاب والتقييم', icon: Users },
  { id: 'catalog', label: 'قائمة الصفوف والفصول', icon: Settings },
  { id: 'academic-year', label: 'السنة الدراسية', icon: Calendar },
];

export function PrincipalClassesHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab: Tab =
    searchParams.get('tab') === 'catalog'
      ? 'catalog'
      : searchParams.get('tab') === 'academic-year'
        ? 'academic-year'
        : 'students';
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    const t = searchParams.get('tab');
    setTab(
      t === 'catalog' ? 'catalog' : t === 'academic-year' ? 'academic-year' : 'students',
    );
  }, [searchParams]);

  const switchTab = (id: Tab) => {
    setTab(id);
    const params: Record<string, string> = {};
    if (id === 'catalog') params.tab = 'catalog';
    if (id === 'academic-year') params.tab = 'academic-year';
    setSearchParams(Object.keys(params).length ? params : {}, { replace: true });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="الصفوف والفصول"
        subtitle="إدارة هيكل المدرسة وعرض تقييم الطلاب حسب الصف والفصل"
        icon={Settings}
      />

      <div className="flex gap-2 border-b border-white/5 pb-0.5 flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchTab(id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px',
              tab === id
                ? 'border-gold-400 text-gold-400'
                : 'border-transparent text-white/40 hover:text-white/80'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {tab === 'catalog' && <SchoolSettingsPage embedded />}
        {tab === 'students' && <ClassStudentsRatingTab />}
        {tab === 'academic-year' && <AcademicYearPanel />}
      </div>
    </div>
  );
}
