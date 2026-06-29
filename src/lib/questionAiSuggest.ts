import type { DbSkill, Difficulty, QuestionType } from '../types';

export type AiQuestionDraft = {
  type: QuestionType;
  question_text: string;
  options: string[];
  correct_answer: string;
  difficulty: Difficulty;
  sub_skill_label: string;
};

const STEMS = [
  'ما النتيجة الصحيحة لـ',
  'أيُّ العبارات التالية صحيحة عن',
  'اختر الإجابة الأنسب في',
  'كم يساوي',
  'ما تعريف',
];

const DISTRACTORS = ['خيار غير صحيح', 'إجابة شائعة الخطأ', 'نتيجة مقلوبة', 'قيمة تقريبية خاطئة'];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

/** S9 — اقتراح أسئلة (قوالب ذكية — مراجعة بشرية قبل الحفظ) */
export function generateAiQuestionDrafts(
  skill: DbSkill,
  count = 3,
  difficulty: Difficulty = 'medium',
): AiQuestionDraft[] {
  const drafts: AiQuestionDraft[] = [];
  const topic = skill.skill_name;

  for (let i = 0; i < count; i++) {
    const stem = pick(STEMS, i);
    const correct = `${topic} — الإجابة ${i + 1}`;
    const wrongs = [0, 1, 2].map((j) => `${pick(DISTRACTORS, i + j)} (${topic})`);
    const options = [correct, ...wrongs].sort(() => (i % 2 === 0 ? 1 : -1) * 0.5);

    drafts.push({
      type: 'MCQ',
      question_text: `${stem} «${topic}»؟ (${skill.subject_name})`,
      options,
      correct_answer: correct,
      difficulty,
      sub_skill_label: `${topic} — مسودة AI ${i + 1}`,
    });
  }

  return drafts;
}
