import type { ClassRankEntry, StudentRankEntry } from './types';

/**
 * بيانات وهمية — نقاط الفصول مستقلة تماماً عن مجموع نقاط الطلاب.
 * مثال: فصل 2/ب (420 نقطة جماعية) بينما أفضل طالب فيه 185 نقطة فقط.
 */
export const MOCK_STUDENT_RANKINGS: StudentRankEntry[] = [
  { id: 's1', full_name: 'سارة العتيبي', grade: 'الصف الثاني', class_name: '2/أ', total_points: 248, rank: 1 },
  { id: 's2', full_name: 'محمد القحطاني', grade: 'الصف الثاني', class_name: '2/ب', total_points: 231, rank: 2 },
  { id: 's3', full_name: 'نورة الشمري', grade: 'الصف الأول', class_name: '1/أ', total_points: 215, rank: 3 },
  { id: 's4', full_name: 'عبدالله الدوسري', grade: 'الصف الثاني', class_name: '2/أ', total_points: 198, rank: 4 },
  { id: 's5', full_name: 'ريم الحربي', grade: 'الصف الأول', class_name: '1/ب', total_points: 176, rank: 5 },
  { id: 's6', full_name: 'فهد الزهراني', grade: 'الصف الثاني', class_name: '2/ب', total_points: 185, rank: 6 },
  { id: 's7', full_name: 'لمى الغامدي', grade: 'الصف الأول', class_name: '1/أ', total_points: 162, rank: 7 },
  { id: 's8', full_name: 'تركي المطيري', grade: 'الصف الأول', class_name: '1/ب', total_points: 149, rank: 8 },
];

export const MOCK_CLASS_RANKINGS: ClassRankEntry[] = [
  { id: 'c1', grade: 'الصف الثاني', class_name: '2/ب', total_points: 420, rank: 1, student_count: 24, grant_count: 6 },
  { id: 'c2', grade: 'الصف الأول', class_name: '1/أ', total_points: 385, rank: 2, student_count: 22, grant_count: 5 },
  { id: 'c3', grade: 'الصف الثاني', class_name: '2/أ', total_points: 360, rank: 3, student_count: 23, grant_count: 4 },
  { id: 'c4', grade: 'الصف الأول', class_name: '1/ب', total_points: 290, rank: 4, student_count: 21, grant_count: 3 },
];
