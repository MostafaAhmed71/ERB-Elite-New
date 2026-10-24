import type { ManualActivityKind } from './pointsEvidence';

export type BehaviorActivityPreset = {
  name: string;
  points: number;
  icon: string;
  color: string;
};

/** أنشطة سلوكية جاهزة تُضاف للكتالوج بنقرة، وتُقترح عند الإدخال اليدوي */
export const BEHAVIOR_ACTIVITY_PRESETS: BehaviorActivityPreset[] = [
  { name: 'الالتزام بالزي المدرسي', points: 10, icon: 'shield', color: 'emerald' },
  { name: 'الهدوء والانضباط في الفصل', points: 15, icon: 'shield', color: 'emerald' },
  { name: 'احترام المعلمين والزملاء', points: 15, icon: 'heart', color: 'emerald' },
  { name: 'الحضور المبكر والانضباط في الطابور', points: 10, icon: 'calendar', color: 'blue' },
  { name: 'المحافظة على نظافة الفصل والمدرسة', points: 10, icon: 'sparkles', color: 'emerald' },
  { name: 'التعاون ومساعدة الزملاء', points: 10, icon: 'users', color: 'blue' },
  { name: 'الأمانة والصدق', points: 15, icon: 'heart', color: 'gold' },
  { name: 'المحافظة على ممتلكات المدرسة', points: 10, icon: 'shield', color: 'blue' },
  { name: 'حل الخلافات بهدوء', points: 10, icon: 'heart', color: 'emerald' },
  { name: 'تحسن ملحوظ في السلوك', points: 10, icon: 'target', color: 'amber' },
];

export const BEHAVIOR_SUGGESTIONS: string[] = BEHAVIOR_ACTIVITY_PRESETS.map((p) => p.name);

export const MANUAL_KIND_OPTIONS: { key: ManualActivityKind; label: string }[] = [
  { key: 'activity', label: 'نشاط' },
  { key: 'behavior', label: 'سلوك' },
];
