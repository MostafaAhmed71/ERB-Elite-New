import { supabase } from './supabase';

export type SchoolOpsHealth = {
  checked_at: string;
  open_errors: number;
  critical_errors: number;
  failed_jobs: number;
  queued_jobs: number;
  knowledge_ready: number;
  knowledge_failed: number;
  knowledge_needs_review: number;
  ai_failed_24h: number;
  ai_success_24h: number;
  homework_today: number;
  pending_points: number;
  links: {
    whatsapp_reminders: string;
    ai_settings: string;
    daily_ops: string;
    dev_errors?: string;
    dev_health?: string;
    dev_pipeline?: string;
  };
};

export async function fetchSchoolOpsHealth(): Promise<SchoolOpsHealth> {
  const { data, error } = await supabase.rpc('school_ops_health_summary');
  if (error) throw error;
  const raw = (data ?? {}) as Partial<SchoolOpsHealth>;
  return {
    checked_at: raw.checked_at ?? new Date().toISOString(),
    open_errors: Number(raw.open_errors) || 0,
    critical_errors: Number(raw.critical_errors) || 0,
    failed_jobs: Number(raw.failed_jobs) || 0,
    queued_jobs: Number(raw.queued_jobs) || 0,
    knowledge_ready: Number(raw.knowledge_ready) || 0,
    knowledge_failed: Number(raw.knowledge_failed) || 0,
    knowledge_needs_review: Number(raw.knowledge_needs_review) || 0,
    ai_failed_24h: Number(raw.ai_failed_24h) || 0,
    ai_success_24h: Number(raw.ai_success_24h) || 0,
    homework_today: Number(raw.homework_today) || 0,
    pending_points: Number(raw.pending_points) || 0,
    links: {
      whatsapp_reminders: raw.links?.whatsapp_reminders ?? '/principal/academic/whatsapp-reminders',
      ai_settings: raw.links?.ai_settings ?? '/principal/ai-settings',
      daily_ops: raw.links?.daily_ops ?? '/dashboard',
      dev_errors: raw.links?.dev_errors ?? '/dev/errors',
      dev_health: raw.links?.dev_health ?? '/dev/health',
      dev_pipeline: raw.links?.dev_pipeline ?? '/dev/pipeline',
    },
  };
}

export type StudentNextTask = {
  id: string;
  kind: 'homework' | 'exam' | 'review' | 'none';
  title: string;
  subtitle: string;
  href: string;
  dueLabel?: string;
};

export type NextTaskAudience = 'student' | 'parent';

function nextTaskHrefs(audience: NextTaskAudience) {
  if (audience === 'parent') {
    return {
      homework: '/parent/academic/homework',
      exam: '/exams/results',
      review: '/student-profile',
      none: '/parent/academic',
    } as const;
  }
  return {
    homework: '/student/academic',
    exam: '/student/exams',
    review: '/student',
    none: '/student/academic',
  } as const;
}

/** S — مهمة تالية: واجب اليوم → اختبار قادم → مراجعة نقاط */
export async function getStudentNextTask(
  studentId: string,
  opts?: { audience?: NextTaskAudience },
): Promise<StudentNextTask> {
  const audience = opts?.audience ?? 'student';
  const hrefs = nextTaskHrefs(audience);
  const today = new Date().toISOString().slice(0, 10);

  const { data: student } = await supabase
    .from('students')
    .select('id, grade, class_name, user_id')
    .eq('id', studentId)
    .maybeSingle();

  const { data: homework } = await supabase
    .from('academic_homeworks')
    .select('id, subject, lesson_topic, homework_text, date, grade')
    .eq('date', today)
    .order('created_at', { ascending: false })
    .limit(5);

  if (homework?.length) {
    const h = homework[0];
    return {
      id: h.id,
      kind: 'homework',
      title: h.lesson_topic || 'واجب اليوم',
      subtitle: h.subject ? `مادة ${h.subject}` : String(h.homework_text || '').slice(0, 80),
      href: hrefs.homework,
      dueLabel: h.date || today,
    };
  }

  const { data: exams } = await supabase
    .from('exams')
    .select('id, title, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(3);

  if (exams?.length) {
    const e = exams[0];
    return {
      id: e.id,
      kind: 'exam',
      title: e.title || 'اختبار',
      subtitle: audience === 'parent'
        ? 'اختبار نشط — راجع النتائج والتحضير'
        : 'اختبار نشط — راجع التحضير',
      href: hrefs.exam,
    };
  }

  // مراجعة: نقاط معلّقة للطالب إن وُجدت
  if (student?.user_id) {
    const { count } = await supabase
      .from('points_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('status', 'pending');
    if ((count ?? 0) > 0) {
      return {
        id: `review-points-${studentId}`,
        kind: 'review',
        title: 'نقاط بانتظار الاعتماد',
        subtitle: audience === 'parent'
          ? `${count} حركة نقاط معلّقة — تابع ملف الابن`
          : `${count} حركة نقاط معلّقة — تابع مع معلمك`,
        href: hrefs.review,
      };
    }
  }

  return {
    id: `none-${studentId}`,
    kind: 'none',
    title: 'لا مهمة عاجلة',
    subtitle: audience === 'parent'
      ? 'تابع أكاديمي الأبناء للمراجعة والواجبات'
      : 'تابع لوحة الأكاديمي للمراجعة والنقاط',
    href: hrefs.none,
  };
}

export type DayCloseItem = {
  id: string;
  label: string;
  tone: 'ok' | 'warn' | 'info';
  href?: string;
};

/** R — طقس إغلاق اليوم من تنبيهات تشغيلية + صحة التشغيل */
export function buildDayCloseItems(opts: {
  alertCount?: number;
  pendingApprovals?: number;
  missingHomeworkHint?: boolean;
  homeworkToday?: number;
  criticalErrors?: number;
}): DayCloseItem[] {
  const homeworkMissing =
    opts.missingHomeworkHint ?? ((opts.homeworkToday ?? 0) === 0 && (opts.pendingApprovals ?? 0) > 0);

  const items: DayCloseItem[] = [
    {
      id: 'alerts',
      label:
        (opts.criticalErrors ?? opts.alertCount ?? 0) > 0
          ? `${opts.criticalErrors ?? opts.alertCount} تنبيه تشغيلي يحتاج مراجعة`
          : 'لا تنبيهات تشغيلية حرجة',
      tone: (opts.criticalErrors ?? opts.alertCount ?? 0) > 0 ? 'warn' : 'ok',
      href: '/dashboard',
    },
    {
      id: 'approvals',
      label:
        (opts.pendingApprovals ?? 0) > 0
          ? `${opts.pendingApprovals} طلب نقاط بانتظار الاعتماد`
          : 'لا اعتمادات معلّقة ظاهرة',
      tone: (opts.pendingApprovals ?? 0) > 0 ? 'warn' : 'ok',
      href: '/points/approve',
    },
    {
      id: 'homework',
      label: homeworkMissing
        ? 'راجع إدخال الواجبات اليوم'
        : (opts.homeworkToday ?? 0) > 0
          ? `${opts.homeworkToday} واجب مسجّل اليوم`
          : 'تابع الالتزام الأكاديمي من صندوق اليوم',
      tone: homeworkMissing ? 'warn' : 'info',
      href: '/academic/homework',
    },
    {
      id: 'week',
      label: 'إغلاق الأسبوع: راجع الخطط الأسبوعية والتقارير',
      tone: 'info',
      href: '/academic/weekly-plans',
    },
  ];
  return items;
}

export type ParentNotificationPrefs = {
  user_id: string;
  push_enabled: boolean;
  digest_weekly: boolean;
  homework_alerts: boolean;
  exam_alerts: boolean;
  updated_at?: string;
};

export async function fetchParentNotificationPrefs(
  userId: string,
): Promise<ParentNotificationPrefs | null> {
  const { data, error } = await supabase
    .from('parent_notification_prefs')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    if (error.message?.includes('parent_notification_prefs') || error.code === '42P01') {
      return null;
    }
    throw error;
  }
  return data as ParentNotificationPrefs | null;
}

export async function saveParentNotificationPrefs(partial: {
  push?: boolean;
  digest?: boolean;
  homework?: boolean;
  exam?: boolean;
}): Promise<ParentNotificationPrefs> {
  const { data, error } = await supabase.rpc('upsert_parent_notification_prefs', {
    p_push: partial.push ?? null,
    p_digest: partial.digest ?? null,
    p_homework: partial.homework ?? null,
    p_exam: partial.exam ?? null,
  });
  if (error) throw error;
  return data as ParentNotificationPrefs;
}
