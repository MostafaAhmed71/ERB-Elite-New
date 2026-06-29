import { useState, useEffect } from 'react';
import { OnboardingTour } from '../onboarding/OnboardingTour';
import type { TourStep } from '../../lib/onboarding';

const STORAGE_KEY = 'student_onboarding_done';

const STUDENT_STEPS: TourStep[] = [
  {
    title: 'مرحباً في لوحتك',
    description: 'هنا ترى إجمالي نقاطك، مستوى التميز، وترتيبك في الفصل.',
    hint: 'افتح المنصة يومياً لمتابعة نقاطك الجديدة',
  },
  {
    title: 'نقاطك ومحاور التميز',
    description: 'أربعة محاور + الحضور تُعرض كنقاط معتمدة لكل محور. إجمالي نقاطك = مجموع كل النقاط المعتمدة.',
    hint: 'النقاط «بانتظار موافقة رائد النشاط» ستظهر بعد الاعتماد',
  },
  {
    title: 'اختباراتك',
    description: 'من «اختباراتي» في القائمة — ابدأ الاختبار النشط قبل انتهاء الوقت.',
    hint: 'محاولة واحدة فقط لكل اختبار — راجع إجاباتك قبل الإرسال',
  },
];

export function StudentOnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== 'true') {
      setOpen(true);
    }
  }, []);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  return (
    <OnboardingTour
      open={open}
      step={step}
      steps={STUDENT_STEPS}
      onNext={() => {
        if (step >= STUDENT_STEPS.length - 1) finish();
        else setStep((s) => s + 1);
      }}
      onSkip={finish}
    />
  );
}
