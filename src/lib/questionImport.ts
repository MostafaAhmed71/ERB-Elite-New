import * as XLSX from 'xlsx';
import type { DbSkill, QuestionType, Difficulty } from '../types';

export type QuestionImportRow = {
  question_text: string;
  type: QuestionType;
  skill_id: string;
  options: string[] | null;
  correct_answer: string;
  difficulty: Difficulty;
  sub_skill_label: string | null;
  _valid: boolean;
  _errors: string[];
  _row: number;
};

const TYPE_MAP: Record<string, QuestionType> = {
  mcq: 'MCQ',
  'اختيار من متعدد': 'MCQ',
  'اختيار متعدد': 'MCQ',
  tf: 'TF',
  'صح / خطأ': 'TF',
  'صح وخطأ': 'TF',
  'صح/خطأ': 'TF',
};

const DIFF_MAP: Record<string, Difficulty> = {
  easy: 'easy',
  سهل: 'easy',
  medium: 'medium',
  متوسط: 'medium',
  hard: 'hard',
  صعب: 'hard',
};

function normKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, '_');
}

function pick(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const direct = row[k];
    if (direct != null && String(direct).trim()) return String(direct).trim();
    const found = Object.entries(row).find(([hk]) => normKey(hk) === normKey(k));
    if (found && String(found[1]).trim()) return String(found[1]).trim();
  }
  return '';
}

function parseType(raw: string): QuestionType | null {
  const key = raw.trim().toLowerCase();
  return TYPE_MAP[key] ?? TYPE_MAP[raw.trim()] ?? null;
}

function parseDifficulty(raw: string): Difficulty {
  const key = raw.trim().toLowerCase();
  return DIFF_MAP[key] ?? DIFF_MAP[raw.trim()] ?? 'medium';
}

function resolveSkillId(skillName: string, skills: DbSkill[]): string | null {
  if (!skillName.trim()) return skills.length === 1 ? skills[0].id : null;
  const match = skills.find(
    (s) => s.skill_name.trim() === skillName.trim() || s.id === skillName.trim(),
  );
  return match?.id ?? null;
}

function parseCorrectAnswer(
  type: QuestionType,
  raw: string,
  options: string[],
): string | null {
  const v = raw.trim();
  if (!v) return null;

  if (type === 'TF') {
    const lower = v.toLowerCase();
    if (['صح', 'true', '1', 'نعم', 'صحيح'].includes(lower)) return 'true';
    if (['خطأ', 'false', '0', 'لا', 'خاطئ'].includes(lower)) return 'false';
    return null;
  }

  if (type === 'MCQ') {
    const num = Number(v);
    if (!Number.isNaN(num) && num >= 1 && num <= options.length) {
      return options[num - 1] ?? null;
    }
    const letterMap: Record<string, number> = { أ: 0, ا: 0, a: 0, ب: 1, b: 1, ج: 2, c: 2, د: 3, d: 3 };
    const letter = letterMap[v.toLowerCase()];
    if (letter !== undefined && options[letter]) return options[letter];
    if (options.includes(v)) return v;
    return null;
  }

  return v;
}

export function parseQuestionExcelRows(
  rows: Record<string, unknown>[],
  skills: DbSkill[],
  defaultSkillId?: string,
): QuestionImportRow[] {
  return rows.map((row, index) => {
    const errors: string[] = [];
    const rowNum = index + 2;

    const question_text = pick(row, 'question_text', 'نص_السؤال', 'السؤال', 'نص السؤال');
    const typeRaw = pick(row, 'type', 'النوع', 'نوع السؤال');
    const type = parseType(typeRaw) ?? 'MCQ';
    if (!typeRaw && !question_text) {
      return {
        question_text: '',
        type: 'MCQ' as QuestionType,
        skill_id: '',
        options: null,
        correct_answer: '',
        difficulty: 'medium' as Difficulty,
        sub_skill_label: null,
        _valid: false,
        _errors: ['صف فارغ'],
        _row: rowNum,
      };
    }

    const skillName = pick(row, 'skill_name', 'المهارة', 'skill', 'اسم المهارة');
    const skill_id = resolveSkillId(skillName, skills) ?? defaultSkillId ?? '';
    if (!skill_id) errors.push('المهارة غير معروفة — حدّد مهارة في الملف أو اختر مهارة افتراضية');

    if (!question_text) errors.push('نص السؤال مطلوب');

    let options: string[] | null = null;
    if (type === 'MCQ') {
      options = [
        pick(row, 'option_1', 'خيار1', 'الخيار_1', 'الخيار 1'),
        pick(row, 'option_2', 'خيار2', 'الخيار_2', 'الخيار 2'),
        pick(row, 'option_3', 'خيار3', 'الخيار_3', 'الخيار 3'),
        pick(row, 'option_4', 'خيار4', 'الخيار_4', 'الخيار 4'),
      ].filter(Boolean);
      if (options.length < 2) errors.push('يحتاج سؤال MCQ خيارين على الأقل');
    }

    const correctRaw = pick(row, 'correct', 'correct_answer', 'الإجابة', 'الإجابة_الصحيحة', 'الاجابة الصحيحة');
    const correct_answer = parseCorrectAnswer(type, correctRaw, options ?? []) ?? '';
    if (!correct_answer) errors.push('الإجابة الصحيحة غير واضحة');

    const difficulty = parseDifficulty(pick(row, 'difficulty', 'الصعوبة', 'صعوبة'));
    const sub_skill_label = pick(row, 'sub_skill', 'مهارة_فرعية', 'مهارة فرعية') || null;

    return {
      question_text,
      type,
      skill_id,
      options: type === 'MCQ' ? options : null,
      correct_answer,
      difficulty,
      sub_skill_label,
      _valid: errors.length === 0,
      _errors: errors,
      _row: rowNum,
    };
  }).filter((r) => r.question_text || r._errors.some((e) => e !== 'صف فارغ'));
}

export function questionImportTemplateRows(): Record<string, string>[] {
  return [
    {
      'نص السؤال': 'ما ناتج 2 + 2؟',
      'النوع': 'اختيار من متعدد',
      'المهارة': 'العمليات الأساسية',
      'خيار1': '3',
      'خيار2': '4',
      'خيار3': '5',
      'خيار4': '6',
      'الإجابة الصحيحة': '2',
      'الصعوبة': 'سهل',
    },
    {
      'نص السؤال': 'الشمس تشرق من الشرق',
      'النوع': 'صح / خطأ',
      'المهارة': 'العمليات الأساسية',
      'خيار1': '',
      'خيار2': '',
      'خيار3': '',
      'خيار4': '',
      'الإجابة الصحيحة': 'صح',
      'الصعوبة': 'متوسط',
    },
  ];
}

export function downloadQuestionTemplate(filename = 'نموذج-استيراد-أسئلة.xlsx') {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(questionImportTemplateRows());
  XLSX.utils.book_append_sheet(wb, ws, 'أسئلة');
  XLSX.writeFile(wb, filename);
}

export async function readQuestionExcelFile(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
}
