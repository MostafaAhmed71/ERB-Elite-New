import { supabase } from './supabase';
import { academicAdminService } from './academic/adminService';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export type AcademicSnapshot = {
  homeworkToday: number;
  pendingReviews: number;
  pendingParentRequests: number;
  teachersMissingHomeworkToday: number;
  totalTeachers: number;
};

export async function fetchAcademicSnapshot(): Promise<AcademicSnapshot> {
  return fetchSnapshot('awaitingPrincipal');
}

export async function fetchSupervisorAcademicSnapshot(): Promise<AcademicSnapshot> {
  return fetchSnapshot('pending');
}

async function fetchSnapshot(reviewStatus: 'pending' | 'awaitingPrincipal'): Promise<AcademicSnapshot> {
  const today = todayIso();
  const [hwRes, revRes, reqRes, monitoring] = await Promise.all([
    supabase.from('academic_homeworks').select('teacher_id').eq('date', today),
    // صندوق الدور الحالي: المشرف أولاً ثم المراجع ثم المدير.
    supabase.from('academic_exam_reviews').select('id').eq('status', reviewStatus),
    supabase.from('academic_parent_requests').select('id').eq('status', 'pending'),
    academicAdminService.getHomeworkDayMonitoring(today),
  ]);
  if (hwRes.error) throw hwRes.error;
  if (revRes.error) throw revRes.error;
  if (reqRes.error) throw reqRes.error;

  return {
    homeworkToday: hwRes.data?.length ?? 0,
    pendingReviews: revRes.data?.length ?? 0,
    pendingParentRequests: reqRes.data?.length ?? 0,
    teachersMissingHomeworkToday: monitoring.missing.length,
    totalTeachers: monitoring.total_teachers,
  };
}
