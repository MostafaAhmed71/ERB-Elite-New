import { supabase } from './supabase';

export type TeacherMessageTemplate = {
  id: string;
  label: string;
  title: string;
  body: string;
};

export const TEACHER_MESSAGE_TEMPLATES: TeacherMessageTemplate[] = [
  {
    id: 'meeting',
    label: 'دعوة لاجتماع',
    title: 'دعوة لاجتماع أولياء الأمور',
    body: 'تحية طيبة، ندعوكم لحضور اجتماع أولياء الأمور لمناقشة مستوى ابنكم/ابنتكم. الموعد سيُعلَن لاحقاً عبر المنصة.',
  },
  {
    id: 'homework',
    label: 'تذكير بالواجبات',
    title: 'تذكير بالواجبات المنزلية',
    body: 'نذكّركم بمتابعة ابنكم/ابنتكم في إنجاز الواجبات اليومية. شكراً لتعاونكم.',
  },
  {
    id: 'behavior',
    label: 'ملاحظة سلوكية',
    title: 'ملاحظة سلوكية إيجابية',
    body: 'نود إبلاغكم بأن ابنكم/ابنتكم أظهر/ت سلوكاً متميزاً هذا الأسبوع. نرجو تشجيعه/ها على الاستمرار.',
  },
  {
    id: 'exam',
    label: 'تذكير باختبار',
    title: 'تذكير باختبار قادم',
    body: 'يُرجى مساعدة ابنكم/ابنتكم على المراجعة للاختبار القادم. يمكنكم متابعة جدول الاختبارات من المنصة.',
  },
];

export type TeacherMessageLogRow = {
  id: string;
  grade: string;
  class_name: string;
  title: string;
  body: string;
  recipients_count: number;
  created_at: string;
};

/** T6 — إرسال رسالة جماعية لأولياء أمور الفصل */
export async function sendTeacherClassMessage(
  grade: string,
  className: string,
  title: string,
  body: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('send_teacher_class_message', {
    p_grade: grade,
    p_class_name: className,
    p_title: title,
    p_body: body,
  });
  if (error) throw error;
  const result = data as { sent?: number };
  return result.sent ?? 0;
}

export async function fetchTeacherMessageLog(userId: string): Promise<TeacherMessageLogRow[]> {
  const { data, error } = await supabase
    .from('teacher_parent_messages')
    .select('id, grade, class_name, title, body, recipients_count, created_at')
    .eq('teacher_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return (data ?? []) as TeacherMessageLogRow[];
}
