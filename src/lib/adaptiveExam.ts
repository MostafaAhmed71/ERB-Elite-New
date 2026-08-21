import type { DbQuestion, DbSkill, ExamResultDetail } from '../types';
import { computeStudentWeaknesses } from './examAnalytics';

const ADAPTIVE_QUESTION_COUNT = 8;

/**
 * يختار أسئلة تكيفية تركز على مهارات ضعف الطالب
 * مع تنويع من بنك أسئلة المادة
 */
export function selectAdaptiveQuestions(
  pool: DbQuestion[],
  skills: DbSkill[],
  priorResults: Array<{ details: ExamResultDetail[] | null }>,
  count = ADAPTIVE_QUESTION_COUNT,
): DbQuestion[] {
  if (pool.length === 0) return [];

  const weaknesses = computeStudentWeaknesses(priorResults, skills);
  const weakSkillIds = new Set(weaknesses.map((w) => w.skill_id));

  const bySkill = new Map<string, DbQuestion[]>();
  for (const q of pool) {
    const list = bySkill.get(q.skill_id) ?? [];
    list.push(q);
    bySkill.set(q.skill_id, list);
  }

  const picked: DbQuestion[] = [];
  const used = new Set<string>();

  const pickFromSkill = (skillId: string, n: number) => {
    const list = bySkill.get(skillId) ?? [];
    for (const q of list) {
      if (picked.length >= count) break;
      if (used.has(q.id)) continue;
      used.add(q.id);
      picked.push(q);
      if (--n <= 0) break;
    }
  };

  // 60% من أسئلة نقاط الضعف
  const weakQuota = Math.ceil(count * 0.6);
  for (const w of weaknesses) {
    if (picked.length >= weakQuota) break;
    pickFromSkill(w.skill_id, 2);
  }

  // بقية الأسئلة من مهارات أخرى للتنويع
  const remaining = [...pool].sort(() => Math.random() - 0.5);
  for (const q of remaining) {
    if (picked.length >= count) break;
    if (used.has(q.id)) continue;
    used.add(q.id);
    picked.push(q);
  }

  // إن لم يكن لدى الطالب سجل سابق — توزيع متوازن
  if (weakSkillIds.size === 0) {
    const skillIds = [...bySkill.keys()];
    let i = 0;
    while (picked.length < count && skillIds.length > 0) {
      const sid = skillIds[i % skillIds.length];
      pickFromSkill(sid, 1);
      i++;
      if (i > count * skillIds.length) break;
    }
  }

  return picked.slice(0, count);
}

export { ADAPTIVE_QUESTION_COUNT };

export const PREP_QUESTION_COUNT = 10;
export const PREP_DURATION_MIN = 30;

/** بناء مجموعة أسئلة تحضيرية من نقاط الضعف — ST3 */
export function buildPrepQuestionSet(
  pool: DbQuestion[],
  skills: DbSkill[],
  priorResults: Array<{ details: ExamResultDetail[] | null }>,
  count = PREP_QUESTION_COUNT,
): DbQuestion[] {
  return selectAdaptiveQuestions(pool, skills, priorResults, count);
}
