export interface SkillTemplate {
  skill_name: string;
  description?: string;
}

/** مواد معروفة للاختيار السريع */
export const SUBJECT_PRESETS = [
  'الرياضيات',
  'العلوم',
  'لغتي',
  'اللغة الإنجليزية',
  'الدراسات الإسلامية',
  'الدراسات الاجتماعية',
  'الحاسب الآلي',
  'التربية الفنية',
  'التربية البدنية',
] as const;

const ALIASES: Record<string, string> = {
  رياضيات: 'الرياضيات',
  الرياضيات: 'الرياضيات',
  math: 'الرياضيات',
  علوم: 'العلوم',
  العلوم: 'العلوم',
  science: 'العلوم',
  لغتي: 'لغتي',
  'اللغة العربية': 'لغتي',
  عربي: 'لغتي',
  'اللغة الإنجليزية': 'اللغة الإنجليزية',
  انجليزي: 'اللغة الإنجليزية',
  إنجليزي: 'اللغة الإنجليزية',
  english: 'اللغة الإنجليزية',
  'الدراسات الإسلامية': 'الدراسات الإسلامية',
  اسلامية: 'الدراسات الإسلامية',
  'الدراسات الاجتماعية': 'الدراسات الاجتماعية',
  اجتماعيات: 'الدراسات الاجتماعية',
  'الحاسب الآلي': 'الحاسب الآلي',
  حاسب: 'الحاسب الآلي',
  تقنية: 'الحاسب الآلي',
};

const BASE_SKILLS: Record<string, SkillTemplate[]> = {
  الرياضيات: [
    { skill_name: 'الأعداد والعمليات الحسابية', description: 'الجمع والطرح والضرب والقسمة' },
    { skill_name: 'الكسور والأعداد العشرية', description: 'فهم وتحويل وعمليات على الكسور' },
    { skill_name: 'النسب والتناسب', description: 'حل مسائل النسبة والتناسب' },
    { skill_name: 'الهندسة والقياس', description: 'المحيط والمساحة والحجم والزوايا' },
    { skill_name: 'الإحصاء والاحتمالات', description: 'قراءة الجداول والرسوم البيانية' },
  ],
  العلوم: [
    { skill_name: 'الخلايا والكائنات الحية', description: 'بناء الكائنات الحية ووظائفها' },
    { skill_name: 'الطاقة والتحولات', description: 'أشكال الطاقة وتحولاتها' },
    { skill_name: 'المواد وخصائصها', description: 'حالات المادة وخصائصها الفيزيائية' },
    { skill_name: 'القوى والحركة', description: 'قوانين الحركة والقوى المؤثرة' },
    { skill_name: 'البيئة والتوازن', description: 'النظم البيئية والتوازن البيئي' },
  ],
  لغتي: [
    { skill_name: 'القراءة والفهم', description: 'فهم النصوص واستخراج الأفكار' },
    { skill_name: 'النحو والإعراب', description: 'قواعد اللغة والجملة' },
    { skill_name: 'الإملاء والكتابة', description: 'كتابة فقرات ونصوص صحيحة' },
    { skill_name: 'البلاغة والتعبير', description: 'التشبيه والاستعارة والتعبير الأدبي' },
    { skill_name: 'المفردات والمعاني', description: 'توسيع الحصيلة اللغوية' },
  ],
  'اللغة الإنجليزية': [
    { skill_name: 'Reading Comprehension', description: 'فهم النصوص الإنجليزية' },
    { skill_name: 'Vocabulary', description: 'المفردات والعبارات الشائعة' },
    { skill_name: 'Grammar', description: 'الأزمنة والجمل البسيطة والمركبة' },
    { skill_name: 'Writing', description: 'كتابة جمل وفقرات قصيرة' },
    { skill_name: 'Listening & Speaking', description: 'الاستماع والمحادثة الأساسية' },
  ],
  'الدراسات الإسلامية': [
    { skill_name: 'العقيدة', description: 'أركان الإيمان والتوحيد' },
    { skill_name: 'الفقه', description: 'الطهارة والصلاة والأحكام الأساسية' },
    { skill_name: 'الحديث', description: 'فهم الأحاديث النبوية وأحكامها' },
    { skill_name: 'السيرة النبوية', description: 'أحداث من حياة النبي ﷺ' },
    { skill_name: 'التجويد', description: 'أحكام التلاوة الصحيحة' },
  ],
  'الدراسات الاجتماعية': [
    { skill_name: 'الجغرافيا', description: 'الخريطة والتضاريس والمناخ' },
    { skill_name: 'التاريخ', description: 'الأحداث التاريخية وتحليلها' },
    { skill_name: 'المواطنة', description: 'الحقوق والواجبات والمشاركة' },
    { skill_name: 'الاقتصاد', description: 'مفاهيم الاحتياج والموارد' },
  ],
  'الحاسب الآلي': [
    { skill_name: 'أساسيات الحاسب', description: 'مكونات الجهاز والأنظمة' },
    { skill_name: 'معالجة النصوص', description: 'إنشاء وتنسيق المستندات' },
    { skill_name: 'جداول البيانات', description: 'إدخال البيانات والعمليات البسيطة' },
    { skill_name: 'البرمجة الأساسية', description: 'التفكير المنطقي والخوارزميات البسيطة' },
    { skill_name: 'الأمن الرقمي', description: 'سلامة الاستخدام والخصوصية' },
  ],
  'التربية الفنية': [
    { skill_name: 'الرسم والتلوين', description: 'تقنيات الرسم والألوان' },
    { skill_name: 'التشكيل اليدوي', description: 'أعمال يدوية وإبداعية' },
  ],
  'التربية البدنية': [
    { skill_name: 'اللياقة البدنية', description: 'تمارين القوة والمرونة والتحمل' },
    { skill_name: 'المهارات الحركية', description: 'الجري والقفز والتنسيق' },
  ],
};

/** مهارات إضافية حسب الصف */
const GRADE_SKILLS: Record<string, Record<string, SkillTemplate[]>> = {
  'أول متوسط': {
    الرياضيات: [
      { skill_name: 'الأعداد الطبيعية', description: 'قراءة وكتابة الأعداد ومقارنتها' },
      { skill_name: 'جداول الضرب والقسمة', description: 'حفظ واستخدام جداول الضرب' },
    ],
  },
  'ثاني متوسط': {
    الرياضيات: [
      { skill_name: 'المعادلات البسيطة', description: 'حل معادلات من الدرجة الأولى' },
      { skill_name: 'الأشكال الهندسية', description: 'محيط ومساحة الأشكال المستوية' },
    ],
  },
  'ثالث متوسط': {
    الرياضيات: [
      { skill_name: 'المعادلات والمتباينات', description: 'حل مسائل جبريّة' },
      { skill_name: 'الإحصاء الوصفي', description: 'الوسط الحسابي والوسيط والمنوال' },
    ],
  },
};

export function normalizeSubjectName(name: string): string {
  const trimmed = name.trim();
  return ALIASES[trimmed] ?? ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

/** المهارات المقترحة تلقائياً لمادة وصف */
export function getSkillsForSubject(grade: string, subjectName: string): SkillTemplate[] {
  const canonical = normalizeSubjectName(subjectName);
  const base = BASE_SKILLS[canonical] ?? [];
  const gradeExtra = GRADE_SKILLS[grade]?.[canonical] ?? [];

  const merged = new Map<string, SkillTemplate>();
  for (const s of [...base, ...gradeExtra]) {
    merged.set(s.skill_name, s);
  }

  if (merged.size > 0) {
    return Array.from(merged.values());
  }

  return [
    { skill_name: 'المفاهيم الأساسية', description: `فهم المفاهيم الرئيسية في ${subjectName}` },
    { skill_name: 'التطبيق العملي', description: 'تطبيق ما تم تعلّمه في مواقف واقعية' },
    { skill_name: 'حل المسائل', description: 'تحليل المسائل وإيجاد الحلول' },
    { skill_name: 'التفكير الناقد', description: 'التحليل والمقارنة والاستنتاج' },
  ];
}
