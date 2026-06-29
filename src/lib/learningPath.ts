import type { AxisBreakdown } from './calculations';
import type { SkillWeakness } from './examAnalytics';

export type LearningTask = {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  kind: 'skill' | 'axis' | 'exam';
  skillId?: string;
  subjectName?: string;
  axisKey?: keyof AxisBreakdown;
};

const AXIS_LABELS: Record<string, string> = {
  activity: 'النشاط',
  behavior: 'السلوك',
  achievement: 'الإنجاز',
  initiative: 'المبادرة',
};

const AXIS_GOALS: Record<string, { target: number; tip: string }> = {
  activity: { target: 3, tip: 'شارك في نشاط مدرسي واحد على الأقل هذا الأسبوع' },
  behavior: { target: 3, tip: 'حافظ على سلوك إيجابي ملحوظ في الحصة' },
  achievement: { target: 3, tip: 'راجع دروسك الضعيفة واطلب تمريناً من المعلم' },
  initiative: { target: 2, tip: 'اقترح فكرة نشاط أو ساعد زميلاً' },
};

export function buildPersonalLearningPath(
  weaknesses: SkillWeakness[],
  breakdown: AxisBreakdown,
  maxTasks = 4,
): LearningTask[] {
  const tasks: LearningTask[] = [];

  for (const w of weaknesses.slice(0, 2)) {
    const needed = Math.max(1, 3 - Math.floor(w.mastery_pct / 20));
    tasks.push({
      id: `skill-${w.skill_id}`,
      title: `عزّز مهارة «${w.skill_name}»`,
      description: `أكمل ${needed} تمريناً في ${w.subject_name} — إتقانك الحالي ${w.mastery_pct}%`,
      targetCount: needed,
      kind: 'skill',
      skillId: w.skill_id,
      subjectName: w.subject_name,
    });
  }

  const axes = [
    { key: 'activity' as const, value: breakdown.activity },
    { key: 'behavior' as const, value: breakdown.behavior },
    { key: 'achievement' as const, value: breakdown.achievement },
    { key: 'initiative' as const, value: breakdown.initiative },
  ];
  const weakestAxis = axes.reduce((min, a) => (a.value < min.value ? a : min), axes[0]);

  if (weakestAxis.value < 40 && tasks.length < maxTasks) {
    const goal = AXIS_GOALS[weakestAxis.key];
    tasks.push({
      id: `axis-${weakestAxis.key}`,
      title: `ركّز على محور ${AXIS_LABELS[weakestAxis.key]}`,
      description: goal.tip,
      targetCount: goal.target,
      kind: 'axis',
      axisKey: weakestAxis.key,
    });
  }

  if (tasks.length === 0) {
    tasks.push({
      id: 'maintain',
      title: 'استمر على وتيرتك',
      description: 'أداؤك متوازن — جرّب وضع التدريب في الاختبارات لتثبيت الإتقان',
      targetCount: 1,
      kind: 'exam',
    });
  }

  return tasks.slice(0, maxTasks);
}
