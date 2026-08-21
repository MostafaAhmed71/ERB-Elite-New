import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { academicConfigService } from '../../lib/academic/adminService';
import {
  AcademicLayout, AcademicPageHeader, AcademicFormPanel,
  academicInputClass, academicBtnPrimary,
} from '../../components/academic/AcademicUi';
import { PublishedExamReviewsList } from '../../components/academic/PublishedExamReviewsList';
import { useAuthStore } from '../../stores/authStore';

export function ParentAcademicReviewsPage() {
  const { user } = useAuthStore();
  const [activated, setActivated] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const storageKey = `parent_academic_activated_${user?.id ?? 'guest'}`;

  useEffect(() => {
    if (sessionStorage.getItem(storageKey) === '1') setActivated(true);
  }, [storageKey]);

  const { data: correctCode = 'UUXZCV7412' } = useQuery({
    queryKey: ['parent-activation-code'],
    queryFn: () => academicConfigService.getParentActivationCode(),
  });

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim() === correctCode) {
      sessionStorage.setItem(storageKey, '1');
      setActivated(true);
      setError('');
    } else setError('كود التفعيل غير صحيح');
  };

  if (!activated) {
    return (
      <AcademicLayout size="lg">
        <AcademicPageHeader title="المراجعات والاختبارات" backTo="/dashboard" subtitle="محتوى أكاديمي معتمد من المدرسة" />
        <form onSubmit={verify}>
          <AcademicFormPanel>
            <p className="text-[#A3AED0] text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-gold-400" /> أدخل كود التفعيل من المدرسة
            </p>
            {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-xl">{error}</p>}
            <input
              className={academicInputClass}
              dir="ltr"
              placeholder="XXXXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
            />
            <button type="submit" className={`${academicBtnPrimary} w-full`}>تفعيل</button>
          </AcademicFormPanel>
        </form>
      </AcademicLayout>
    );
  }

  return (
    <AcademicLayout>
      <AcademicPageHeader title="المراجعات والاختبارات" backTo="/dashboard" badge="مفعّل" />
      <PublishedExamReviewsList enabled={activated} />
    </AcademicLayout>
  );
}
