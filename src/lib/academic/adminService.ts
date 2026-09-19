import { supabase } from '../supabase';
import {
  EXPORT_TEMPLATE_LAYOUT_KEY,
  mergeExportTemplateLayout,
  type AcademicExportTemplateLayout,
} from './exportTemplateConfig';
import type {
  AcademicExamReview,
  AcademicReviewStatus,
  AcademicSubject,
  AcademicSection,
  AcademicObservationReport,
  AcademicParentRequest,
  AcademicParentCommunication,
  AcademicStaffUser,
  AcademicEducationLevel,
  AcademicTeacherAssignment,
  AcademicMonitoringStats,
  AcademicHomeworkDayMonitoring,
  AcademicWeeklyPlanWeekMonitoring,
  AcademicObservationMonitoring,
  TeacherActivityEntry,
  AcademicSemester,
  AcademicWeeklyPlan,
  AcademicAutoReminderSettings,
  AcademicWeekCalendarsConfig,
  AcademicObservationAssignment,
  AcademicClassTeacherCandidate,
  AcademicTeacherSetup,
  AcademicObservationRating,
  AcademicTeacherObservationEntry,
} from './types';
import { teacherClassRefsFromSetup } from './teacherSetupHelpers';
import { summarizeObservationEntry } from './observationHelpers';
import { DEFAULT_AUTO_REMINDER_SETTINGS, EMPTY_WEEK_CALENDARS, normalizeAutoReminderSettings } from './types';
import { formatGradeSection } from './constants';
import { normalizeWeekCalendars } from './semesterWeekCalendar';
import { syncTeacherOlympiadFromAcademic } from './olympiadSyncService';
import { uploadExamReviewToHostinger } from '../hostingerUpload';

export const academicExamReviewService = {
  async listByTeacher(teacherId: string) {
    const { data, error } = await supabase
      .from('academic_exam_reviews')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    return data as AcademicExamReview[];
  },

  async listForReviewer() {
    const { data, error } = await supabase
      .from('academic_exam_reviews')
      .select('*')
      .eq('status', 'pending')
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    return data as AcademicExamReview[];
  },

  /** كل الطلبات للمراجع — لمتابعة الإجراء المتخذة */
  async listAllForReviewer() {
    const { data, error } = await supabase
      .from('academic_exam_reviews')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return data as AcademicExamReview[];
  },

  async listForPrincipal() {
    const { data, error } = await supabase
      .from('academic_exam_reviews')
      .select('*')
      .eq('status', 'awaitingPrincipal')
      .order('submitted_to_principal_at', { ascending: false });
    if (error) throw error;
    return data as AcademicExamReview[];
  },

  /** @deprecated استخدم listForPrincipal */
  async listPending() {
    return this.listForPrincipal();
  },

  async listPublished() {
    const { data, error } = await supabase
      .from('academic_exam_reviews')
      .select('*')
      .eq('status', 'sentToParent')
      .order('subject');
    if (error) throw error;
    return data as AcademicExamReview[];
  },

  async listForParents() {
    return this.listPublished();
  },

  async listPublishedRecent() {
    const { data, error } = await supabase
      .from('academic_exam_reviews')
      .select('*')
      .eq('status', 'sentToParent')
      .order('sent_to_parent_at', { ascending: false })
      .limit(30);
    if (error) throw error;
    return data as AcademicExamReview[];
  },

  async updateStatus(id: string, status: AcademicReviewStatus, principalNotes?: string) {
    const updates: Record<string, unknown> = { status };
    if (principalNotes !== undefined) updates.principal_notes = principalNotes;
    if (status === 'approved' || status === 'needsRevision') updates.reviewed_at = new Date().toISOString();
    if (status === 'sentToParent') updates.sent_to_parent_at = new Date().toISOString();
    if (status === 'awaitingPrincipal') updates.submitted_to_principal_at = new Date().toISOString();
    const { data, error } = await supabase.from('academic_exam_reviews').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as AcademicExamReview;
  },

  async submitToPrincipal(id: string, reviewerId: string, notes?: string) {
    const { data, error } = await supabase
      .from('academic_exam_reviews')
      .update({
        status: 'awaitingPrincipal',
        reviewer_id: reviewerId,
        reviewer_notes: notes?.trim() || null,
        reviewer_reviewed_at: new Date().toISOString(),
        submitted_to_principal_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select()
      .single();
    if (error) throw error;
    try {
      await supabase.rpc('academic_notify_principals_review_ready', { p_review_id: id });
    } catch (e) {
      console.warn('notify principals failed', e);
    }
    return data as AcademicExamReview;
  },

  async requestRevision(
    id: string,
    notes: string,
    by: { role: 'reviewer' | 'principal'; userId: string },
  ) {
    const updates: Record<string, unknown> = {
      status: 'needsRevision',
      reviewed_at: new Date().toISOString(),
    };
    if (by.role === 'reviewer') {
      updates.reviewer_id = by.userId;
      updates.reviewer_notes = notes.trim() || null;
      updates.reviewer_reviewed_at = new Date().toISOString();
    } else {
      updates.principal_notes = notes.trim() || null;
    }
    const { data, error } = await supabase
      .from('academic_exam_reviews')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as AcademicExamReview;
  },

  async publish(id: string, principalNotes?: string) {
    const updates: Record<string, unknown> = {
      status: 'sentToParent',
      reviewed_at: new Date().toISOString(),
      sent_to_parent_at: new Date().toISOString(),
    };
    if (principalNotes !== undefined) updates.principal_notes = principalNotes;
    const { data, error } = await supabase
      .from('academic_exam_reviews')
      .update(updates)
      .eq('id', id)
      .eq('status', 'awaitingPrincipal')
      .select()
      .single();
    if (error) throw error;
    return data as AcademicExamReview;
  },

  async uploadReview(
    file: File,
    meta: {
      teacher_id: string;
      teacher_name: string;
      subject: string;
      education_level: AcademicEducationLevel;
      grade: number;
      type: AcademicExamReview['type'];
      exam_period?: AcademicExamReview['exam_period'];
    },
  ) {
    const uploaded = await uploadExamReviewToHostinger(file, meta.teacher_id);
    const { data, error } = await supabase
      .from('academic_exam_reviews')
      .insert({
        ...meta,
        file_name: uploaded.file_name,
        file_url: uploaded.url,
        file_type: uploaded.mime || 'application/pdf',
        status: 'pending',
      })
      .select()
      .single();
    if (error) throw error;
    return data as AcademicExamReview;
  },

  async replaceReviewFile(id: string, teacherId: string, file: File) {
    const uploaded = await uploadExamReviewToHostinger(file, teacherId);
    const { data, error } = await supabase
      .from('academic_exam_reviews')
      .update({
        file_name: uploaded.file_name,
        file_url: uploaded.url,
        file_type: uploaded.mime || 'application/pdf',
        status: 'pending',
        uploaded_at: new Date().toISOString(),
        reviewer_notes: null,
        principal_notes: null,
        submitted_to_principal_at: null,
        reviewer_reviewed_at: null,
      })
      .eq('id', id)
      .eq('teacher_id', teacherId)
      .eq('status', 'needsRevision')
      .select()
      .single();
    if (error) throw error;
    return data as AcademicExamReview;
  },
};

export const academicAdminService = {
  async listSubjects() {
    const { data, error } = await supabase.from('academic_subjects').select('*').order('name');
    if (error) throw error;
    return data as AcademicSubject[];
  },

  async createSubject(subject: Omit<AcademicSubject, 'id'>) {
    const { data, error } = await supabase.from('academic_subjects').insert(subject).select().single();
    if (error) throw error;
    return data as AcademicSubject;
  },

  async updateSubject(id: string, updates: Partial<AcademicSubject>) {
    const { data, error } = await supabase.from('academic_subjects').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as AcademicSubject;
  },

  async deleteSubject(id: string) {
    const { error } = await supabase.from('academic_subjects').delete().eq('id', id);
    if (error) throw error;
  },

  async listSections() {
    const { data, error } = await supabase.from('academic_sections').select('*').order('name');
    if (error) throw error;
    return data as AcademicSection[];
  },

  async createSection(name: string) {
    const { data, error } = await supabase.from('academic_sections').insert({ name }).select().single();
    if (error) throw error;
    return data as AcademicSection;
  },

  async listStaffUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, staff_education_level, is_active')
      .in('role', ['teacher', 'deputy', 'principal'])
      .order('full_name');
    if (error) throw error;
    return data as AcademicStaffUser[];
  },

  async updateStaffUser(id: string, updates: { full_name?: string; staff_education_level?: AcademicEducationLevel | null; is_active?: boolean }) {
    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async listTeachers(opts?: { includeInactive?: boolean }) {
    let q = supabase
      .from('users')
      .select('id, full_name, email, role, is_active, phone')
      .eq('role', 'teacher')
      .order('full_name');
    if (!opts?.includeInactive) {
      q = q.eq('is_active', true);
    }
    const { data, error } = await q;
    if (error) throw error;
    return data as { id: string; full_name: string; email: string; phone?: string | null; is_active?: boolean }[];
  },

  async listTeachersWithPhone() {
    return this.listTeachers();
  },

  teacherActivityEntry(
    t: { id: string; full_name: string; phone?: string | null },
    summary?: string,
  ): TeacherActivityEntry {
    return {
      teacher_id: t.id,
      teacher_name: t.full_name,
      phone: t.phone ?? null,
      summary,
    };
  },

  async listAssignments() {
    const { data, error } = await supabase.from('academic_teacher_assignments').select('*');
    if (error) throw error;
    return data as AcademicTeacherAssignment[];
  },

  async saveAssignment(assignment: Omit<AcademicTeacherAssignment, 'id'> & { id?: string }) {
    const { id, ...rest } = assignment;
    let saved: AcademicTeacherAssignment;
    if (id) {
      const { data, error } = await supabase.from('academic_teacher_assignments').update(rest).eq('id', id).select().single();
      if (error) throw error;
      saved = data as AcademicTeacherAssignment;
    } else {
      const { data, error } = await supabase.from('academic_teacher_assignments').insert(rest).select().single();
      if (error) throw error;
      saved = data as AcademicTeacherAssignment;
    }

    try {
      await syncTeacherOlympiadFromAcademic(saved.teacher_id);
    } catch (syncErr) {
      console.warn('Olympiad sync after principal assignment:', syncErr);
    }

    return saved;
  },

  async deleteAssignment(id: string) {
    const { data: row } = await supabase
      .from('academic_teacher_assignments')
      .select('teacher_id')
      .eq('id', id)
      .maybeSingle();

    const { error } = await supabase.from('academic_teacher_assignments').delete().eq('id', id);
    if (error) throw error;

    if (row?.teacher_id) {
      try {
        await syncTeacherOlympiadFromAcademic(row.teacher_id);
      } catch (syncErr) {
        console.warn('Olympiad sync after assignment delete:', syncErr);
      }
    }
  },

  async getMonitoringStats(): Promise<AcademicMonitoringStats[]> {
    const teachers = await this.listTeachers();
    const { data: homeworks } = await supabase.from('academic_homeworks').select('teacher_id, date');
    const { data: plans } = await supabase.from('academic_weekly_plans').select('teacher_id, created_at');

    return teachers.map((t) => {
      const tHomeworks = (homeworks ?? []).filter((h) => h.teacher_id === t.id);
      const tPlans = (plans ?? []).filter((p) => p.teacher_id === t.id);
      const dates = tHomeworks.map((h) => h.date).sort();
      const planDates = tPlans.map((p) => p.created_at).sort();
      return {
        teacher_id: t.id,
        teacher_name: t.full_name,
        homework_count: tHomeworks.length,
        plan_count: tPlans.length,
        last_homework_date: dates[dates.length - 1],
        last_plan_date: planDates[planDates.length - 1],
      };
    });
  },

  async getHomeworkDayMonitoring(date: string): Promise<AcademicHomeworkDayMonitoring> {
    const teachers = await this.listTeachersWithPhone();
    const { data: homeworks, error } = await supabase
      .from('academic_homeworks')
      .select('teacher_id, teacher_name, subject, sections')
      .eq('date', date);
    if (error) throw error;

    const subjectsByTeacher = new Map<string, string[]>();
    for (const hw of homeworks ?? []) {
      const list = subjectsByTeacher.get(hw.teacher_id) ?? [];
      list.push(hw.subject);
      subjectsByTeacher.set(hw.teacher_id, list);
    }

    const completed: TeacherActivityEntry[] = [];
    const missing: TeacherActivityEntry[] = [];

    for (const t of teachers) {
      const subjects = subjectsByTeacher.get(t.id);
      if (subjects?.length) {
        completed.push(
          this.teacherActivityEntry(t, [...new Set(subjects)].join('، ')),
        );
      } else {
        missing.push(this.teacherActivityEntry(t));
      }
    }

    completed.sort((a, b) => a.teacher_name.localeCompare(b.teacher_name, 'ar'));
    missing.sort((a, b) => a.teacher_name.localeCompare(b.teacher_name, 'ar'));

    return {
      date,
      completed,
      missing,
      total_teachers: teachers.length,
    };
  },

  async getWeeklyPlanWeekMonitoring(
    semester: AcademicSemester,
    week_number: number,
  ): Promise<AcademicWeeklyPlanWeekMonitoring> {
    const teachers = await this.listTeachersWithPhone();
    const { data: plans, error } = await supabase
      .from('academic_weekly_plans')
      .select('teacher_id, teacher_name, education_level, grade, section, semester, week_number, entries');
    if (error) throw error;

    const teachersWithPlans = new Set<string>();
    for (const plan of (plans ?? []) as AcademicWeeklyPlan[]) {
      const planSemester = (plan.semester ?? 1) as AcademicSemester;
      if (planSemester !== semester || plan.week_number !== week_number) continue;
      for (const entry of plan.entries ?? []) {
        if (!entry.lesson_topic?.trim()) continue;
        const ownerId = entry.teacher_id ?? plan.teacher_id;
        if (ownerId) teachersWithPlans.add(ownerId);
      }
    }

    const completed: TeacherActivityEntry[] = [];
    const missing: TeacherActivityEntry[] = [];

    for (const t of teachers) {
      if (teachersWithPlans.has(t.id)) {
        completed.push(this.teacherActivityEntry(t, 'أضاف حصصه في الخطة المشتركة'));
      } else {
        missing.push(this.teacherActivityEntry(t));
      }
    }

    completed.sort((a, b) => a.teacher_name.localeCompare(b.teacher_name, 'ar'));
    missing.sort((a, b) => a.teacher_name.localeCompare(b.teacher_name, 'ar'));

    return {
      semester,
      week_number,
      completed,
      missing,
      total_teachers: teachers.length,
    };
  },

  async getObservationReportMonitoring(): Promise<AcademicObservationMonitoring> {
    const teachers = await this.listTeachersWithPhone();
    const [{ data: requests, error: reqErr }, { data: reports, error: repErr }] = await Promise.all([
      supabase.from('academic_parent_requests').select('id').eq('status', 'pending'),
      supabase.from('academic_observation_reports').select('teacher_observations'),
    ]);
    if (reqErr) throw reqErr;
    if (repErr) throw repErr;

    const pending_requests = requests?.length ?? 0;
    const contributedNames = new Set<string>();

    for (const report of reports ?? []) {
      const obs = Array.isArray(report.teacher_observations) ? report.teacher_observations : [];
      for (const entry of obs) {
        if (!entry || typeof entry !== 'object') continue;
        const teacher = (entry as { teacher?: string }).teacher?.trim();
        const note = (entry as { note?: string }).note?.trim();
        const behavioral = (entry as { behavioral_rating?: string }).behavioral_rating;
        const academic = (entry as { academic_rating?: string }).academic_rating;
        if (teacher && (note || behavioral || academic)) contributedNames.add(teacher);
      }
    }

    const completed: TeacherActivityEntry[] = [];
    const missing: TeacherActivityEntry[] = [];

    for (const t of teachers) {
      if (contributedNames.has(t.full_name)) {
        completed.push(this.teacherActivityEntry(t, 'أضاف ملاحظته في التقارير'));
      } else {
        missing.push(this.teacherActivityEntry(t));
      }
    }

    completed.sort((a, b) => a.teacher_name.localeCompare(b.teacher_name, 'ar'));
    missing.sort((a, b) => a.teacher_name.localeCompare(b.teacher_name, 'ar'));

    return {
      pending_requests,
      completed,
      missing,
      total_teachers: teachers.length,
    };
  },
};

export const academicObservationService = {
  async listReports() {
    const { data, error } = await supabase.from('academic_observation_reports').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as AcademicObservationReport[];
  },

  async listParentRequests() {
    const { data, error } = await supabase.from('academic_parent_requests').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as AcademicParentRequest[];
  },

  async listMyParentRequests(parentUserId: string) {
    const { data, error } = await supabase
      .from('academic_parent_requests')
      .select('*')
      .eq('parent_user_id', parentUserId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as AcademicParentRequest[];
  },

  async createParentRequest(payload: {
    parent_user_id?: string | null;
    parent_name: string;
    parent_phone: string;
    students: AcademicParentRequest['students'];
  }) {
    const { data, error } = await supabase.from('academic_parent_requests').insert({ ...payload, status: 'pending' }).select().single();
    if (error) throw error;
    return data as AcademicParentRequest;
  },

  async deleteObservationRequest(requestId: string) {
    const { data: req, error: gErr } = await supabase
      .from('academic_parent_requests')
      .select('id, linked_report_id')
      .eq('id', requestId)
      .single();
    if (gErr) throw gErr;

    const { error: aErr } = await supabase
      .from('academic_observation_assignments')
      .delete()
      .eq('request_id', requestId);
    if (aErr) throw aErr;

    if (req.linked_report_id) {
      const { error: rErr } = await supabase
        .from('academic_observation_reports')
        .delete()
        .eq('id', req.linked_report_id);
      if (rErr) throw rErr;
    }

    const { error: dErr } = await supabase.from('academic_parent_requests').delete().eq('id', requestId);
    if (dErr) throw dErr;
  },

  async addTeachersToRequest(params: {
    request: AcademicParentRequest;
    teachers: { teacher_id: string; teacher_name: string; subject?: string }[];
  }) {
    const { request, teachers } = params;
    if (!request.linked_report_id) throw new Error('الطلب لم يُرسل للمعلمين بعد');
    if (!teachers.length) throw new Error('اختر معلماً واحداً على الأقل');

    const existing = await this.listAssignmentsByRequest(request.id);
    const existingIds = new Set(existing.map((e) => e.teacher_id));
    const toAdd = teachers.filter((t) => !existingIds.has(t.teacher_id));
    if (!toAdd.length) throw new Error('المعلمون المحددون مُرسل لهم مسبقاً');

    const rows = toAdd.map((t) => ({
      report_id: request.linked_report_id!,
      request_id: request.id,
      teacher_id: t.teacher_id,
      teacher_name: t.teacher_name,
      subject: t.subject ?? null,
      status: 'pending' as const,
    }));

    const { error: assignErr } = await supabase.from('academic_observation_assignments').insert(rows);
    if (assignErr) throw assignErr;

    if (request.status === 'processed') {
      await supabase.from('academic_parent_requests').update({ status: 'assigned' }).eq('id', request.id);
      await supabase
        .from('academic_observation_reports')
        .update({ status: 'inProgress' })
        .eq('id', request.linked_report_id);
    }

    const studentName = request.students[0]?.name ?? 'طالب';
    try {
      await supabase.rpc('academic_send_notifications', {
        p_user_ids: toAdd.map((t) => t.teacher_id),
        p_title: `طلب ملاحظة طالب — ${studentName}`,
        p_body: `يُرجى إضافة التقييم السلوكي والأكاديمي للطالب ${studentName}`,
        p_link: '/academic/observation-tasks',
      });
    } catch (notifyErr) {
      console.warn('observation notify failed', notifyErr);
    }

    return toAdd.length;
  },

  async removePendingAssignment(assignmentId: string) {
    const { data: row, error: gErr } = await supabase
      .from('academic_observation_assignments')
      .select('*')
      .eq('id', assignmentId)
      .single();
    if (gErr) throw gErr;
    const assignment = row as AcademicObservationAssignment;
    if (assignment.status !== 'pending') throw new Error('لا يمكن حذف تكليف مكتمل');

    const { error } = await supabase.from('academic_observation_assignments').delete().eq('id', assignmentId);
    if (error) throw error;

    if (assignment.request_id && assignment.report_id) {
      const siblings = await this.listAssignmentsByReport(assignment.report_id);
      if (siblings.length > 0 && siblings.every((s) => s.status === 'completed')) {
        await supabase.from('academic_observation_reports').update({ status: 'completed' }).eq('id', assignment.report_id);
        await supabase.from('academic_parent_requests').update({ status: 'processed' }).eq('id', assignment.request_id);
      }
    }
  },

  async listActiveStudentsForObservation() {
    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, grade, class_name, parent_id')
      .eq('is_active', true)
      .order('full_name')
      .limit(800);
    if (error) throw error;
    return data as {
      id: string;
      full_name: string;
      grade: string;
      class_name: string;
      parent_id: string | null;
    }[];
  },

  mapRosterStudentToRequestStudent(child: {
    id: string;
    full_name: string;
    grade: string;
    class_name: string;
  }): AcademicParentRequest['students'][number] {
    const gradeText = child.grade ?? '';
    const education_level: AcademicEducationLevel = /ثان/i.test(gradeText) ? 'high' : 'middle';
    let gradeNum = 1;
    if (gradeText.includes('ثالث')) gradeNum = 3;
    else if (gradeText.includes('ثاني')) gradeNum = 2;
    return {
      student_id: child.id,
      name: child.full_name,
      grade: gradeNum,
      section: child.class_name || 'أ',
      education_level,
      grade_label: `${child.grade} — فصل ${child.class_name}`,
    };
  },

  async updateRequestStatus(id: string, status: AcademicParentRequest['status'], processedBy?: string) {
    const { data, error } = await supabase
      .from('academic_parent_requests')
      .update({ status, processed_by: processedBy ?? null })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as AcademicParentRequest;
  },

  async linkRequestToReport(requestId: string, reportId: string, processedBy: string) {
    const { data, error } = await supabase
      .from('academic_parent_requests')
      .update({ status: 'processed', linked_report_id: reportId, processed_by: processedBy })
      .eq('id', requestId)
      .select()
      .single();
    if (error) throw error;
    return data as AcademicParentRequest;
  },

  async createReport(report: Omit<AcademicObservationReport, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('academic_observation_reports').insert(report).select().single();
    if (error) throw error;
    return data as AcademicObservationReport;
  },

  async getReport(id: string) {
    const { data, error } = await supabase.from('academic_observation_reports').select('*').eq('id', id).single();
    if (error) throw error;
    return data as AcademicObservationReport;
  },

  async listAssignmentsByRequest(requestId: string) {
    const { data, error } = await supabase
      .from('academic_observation_assignments')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at');
    if (error) throw error;
    return data as AcademicObservationAssignment[];
  },

  async listAssignmentsByReport(reportId: string) {
    const { data, error } = await supabase
      .from('academic_observation_assignments')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at');
    if (error) throw error;
    return data as AcademicObservationAssignment[];
  },

  async listMyTeacherAssignments(teacherId: string) {
    const { data, error } = await supabase
      .from('academic_observation_assignments')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as AcademicObservationAssignment[];
  },

  /** معلمو الفصل لمادة/مواد محددة — يطابق الصف + الفصل (وليس الصف فقط) */
  async findTeachersForClass(
    level: AcademicEducationLevel,
    grade: number,
    section: string,
    subjectsFilter: string[] = [],
  ): Promise<AcademicClassTeacherCandidate[]> {
    const [{ data: assignments, error: aErr }, { data: setups, error: sErr }, { data: teachers, error: tErr }] =
      await Promise.all([
        supabase.from('academic_teacher_assignments').select('*'),
        supabase.from('academic_teacher_setups').select('*').eq('is_setup_complete', true),
        supabase.from('users').select('id, full_name').eq('role', 'teacher').eq('is_active', true),
      ]);
    if (aErr) throw aErr;
    if (sErr) throw sErr;
    if (tErr) throw tErr;

    const wanted = new Set(subjectsFilter.map((s) => s.trim()).filter(Boolean));
    const nameById = new Map((teachers ?? []).map((t) => [t.id as string, t.full_name as string]));
    const map = new Map<string, AcademicClassTeacherCandidate>();

    const mergeCandidate = (
      teacher_id: string,
      teacher_name: string,
      subjects: string[],
      source: 'assignment' | 'setup',
    ) => {
      const matchedSubjects = wanted.size
        ? subjects.filter((s) => wanted.has(s))
        : subjects;
      if (wanted.size && matchedSubjects.length === 0) return;

      const prev = map.get(teacher_id);
      map.set(teacher_id, {
        teacher_id,
        teacher_name,
        subjects: [...new Set([...(prev?.subjects ?? []), ...matchedSubjects])],
        source: prev?.source === 'assignment' ? 'assignment' : source,
      });
    };

    for (const row of (assignments ?? []) as AcademicTeacherAssignment[]) {
      if (row.education_level !== level) continue;
      const sections = row.grades_with_sections?.[String(grade)];
      if (sections === undefined) continue;
      // يجب أن يشمل الإسناد الفصل صراحةً. المصفوفة الفارغة = إسناد قديم لكل الفصول.
      if (sections.length > 0 && !sections.includes(section)) continue;

      const teacher_name = nameById.get(row.teacher_id);
      if (!teacher_name) continue;
      mergeCandidate(row.teacher_id, teacher_name, row.subjects ?? [], 'assignment');
    }

    for (const setup of (setups ?? []) as AcademicTeacherSetup[]) {
      const refs = teacherClassRefsFromSetup(setup);
      const match = refs.some((r) => r.level === level && r.grade === grade && r.section === section);
      if (!match) continue;
      const teacher_name = nameById.get(setup.teacher_id);
      if (!teacher_name) continue;
      mergeCandidate(
        setup.teacher_id,
        teacher_name,
        (setup.subjects_by_grade?.[`${level}_${grade}`] ?? setup.subjects) ?? [],
        'setup',
      );
    }

    return [...map.values()].sort((a, b) => a.teacher_name.localeCompare(b.teacher_name, 'ar'));
  },

  async dispatchToTeachers(params: {
    request: AcademicParentRequest;
    student: AcademicParentRequest['students'][number];
    teachers: { teacher_id: string; teacher_name: string; subject?: string }[];
    dispatchedBy: string;
  }) {
    const { request, student, teachers, dispatchedBy } = params;
    if (!teachers.length) throw new Error('اختر معلماً واحداً على الأقل');

    const level = (student.education_level ?? 'middle') as AcademicEducationLevel;
    const grade = student.grade;
    const section = student.section ?? 'أ';

    const report = await this.createReport({
      student_name: student.name,
      requested_by: request.parent_user_id ?? null,
      parent_name: request.parent_name,
      parent_phone: request.parent_phone,
      education_level: level,
      grade,
      section,
      status: 'inProgress',
      teacher_observations: [],
    });

    const rows = teachers.map((t) => ({
      report_id: report.id,
      request_id: request.id,
      teacher_id: t.teacher_id,
      teacher_name: t.teacher_name,
      subject: t.subject ?? (null as string | null),
      status: 'pending' as const,
    }));

    const { error: assignErr } = await supabase.from('academic_observation_assignments').insert(rows);
    if (assignErr) throw assignErr;

    const { data: updatedReq, error: reqErr } = await supabase
      .from('academic_parent_requests')
      .update({
        status: 'assigned',
        linked_report_id: report.id,
        processed_by: dispatchedBy,
      })
      .eq('id', request.id)
      .select()
      .single();
    if (reqErr) throw reqErr;

    const title = `طلب ملاحظة طالب — ${student.name}`;
    const body = `يُرجى إضافة ملاحظتك عن الطالب ${student.name} (${formatGradeSection(level, grade, section)})`;
    try {
      await supabase.rpc('academic_send_notifications', {
        p_user_ids: teachers.map((t) => t.teacher_id),
        p_title: title,
        p_body: body,
        p_link: '/academic/observation-tasks',
      });
    } catch (notifyErr) {
      console.warn('observation notify failed', notifyErr);
    }

    return { report, request: updatedReq as AcademicParentRequest };
  },

  async submitTeacherNote(params: {
    assignmentId: string;
    teacherId: string;
    teacherName: string;
    behavioral_rating: AcademicObservationRating;
    academic_rating: AcademicObservationRating;
    behavioral_comment?: string;
    academic_comment?: string;
    note?: string;
  }) {
    if (!params.behavioral_rating) throw new Error('اختر التقييم السلوكي');
    if (!params.academic_rating) throw new Error('اختر التقييم الأكاديمي');

    const { data: assignment, error: aErr } = await supabase
      .from('academic_observation_assignments')
      .select('*')
      .eq('id', params.assignmentId)
      .eq('teacher_id', params.teacherId)
      .single();
    if (aErr) throw aErr;
    const row = assignment as AcademicObservationAssignment;
    if (row.status === 'completed') throw new Error('تم إرسال ملاحظتك مسبقاً');

    const entry: AcademicTeacherObservationEntry = {
      teacher: params.teacherName,
      teacher_id: params.teacherId,
      subject: row.subject ?? null,
      behavioral_rating: params.behavioral_rating,
      academic_rating: params.academic_rating,
      behavioral_comment: params.behavioral_comment?.trim() || undefined,
      academic_comment: params.academic_comment?.trim() || undefined,
      note: params.note?.trim() || undefined,
      at: new Date().toISOString(),
    };
    const summary = summarizeObservationEntry(entry);

    const report = await this.getReport(row.report_id);
    const prev = Array.isArray(report.teacher_observations) ? [...report.teacher_observations] : [];
    prev.push(entry);

    const { error: repErr } = await supabase
      .from('academic_observation_reports')
      .update({ teacher_observations: prev })
      .eq('id', row.report_id);
    if (repErr) throw repErr;

    const { data: updated, error: uErr } = await supabase
      .from('academic_observation_assignments')
      .update({
        status: 'completed',
        note: summary,
        completed_at: new Date().toISOString(),
      })
      .eq('id', params.assignmentId)
      .select()
      .single();
    if (uErr) throw uErr;

    try {
      await this.finalizeObservationIfReady(row.report_id);
    } catch (finErr) {
      console.warn('finalize observation failed', finErr);
    }

    return updated as AcademicObservationAssignment;
  },

  async finalizeObservationIfReady(reportId: string) {
    const { data, error } = await supabase.rpc('academic_finalize_observation_if_ready', {
      p_report_id: reportId,
    });
    if (error) throw error;
    return Boolean(data);
  },

  /** يصلح الطلبات العالقة: كل المعلمين أكملوا لكن الحالة ما زالت assigned */
  async repairStuckAssignedRequests(requests: AcademicParentRequest[]) {
    const stuck = requests.filter((r) => r.status === 'assigned' && r.linked_report_id);
    let repaired = 0;
    for (const r of stuck) {
      try {
        const ok = await this.finalizeObservationIfReady(r.linked_report_id!);
        if (ok) repaired += 1;
      } catch {
        /* ignore per-row */
      }
    }
    return repaired;
  },
};

export const academicCommunicationService = {
  async listByTeacher(teacherId: string) {
    const { data, error } = await supabase.from('academic_parent_communications').select('*').eq('teacher_id', teacherId).order('communication_date', { ascending: false });
    if (error) throw error;
    return data as AcademicParentCommunication[];
  },

  async listAll() {
    const { data, error } = await supabase.from('academic_parent_communications').select('*').order('communication_date', { ascending: false });
    if (error) throw error;
    return data as AcademicParentCommunication[];
  },

  async create(comm: Omit<AcademicParentCommunication, 'id'>) {
    const { data, error } = await supabase.from('academic_parent_communications').insert(comm).select().single();
    if (error) throw error;
    return data as AcademicParentCommunication;
  },

  async updateStatus(id: string, status: AcademicParentCommunication['status'], approvedBy?: string) {
    const { data, error } = await supabase
      .from('academic_parent_communications')
      .update({ status, approved_by: approvedBy ?? null, approved_at: approvedBy ? new Date().toISOString() : null })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as AcademicParentCommunication;
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('academic_parent_communications').select('*').eq('id', id).single();
    if (error) throw error;
    return data as AcademicParentCommunication;
  },
};

export const academicConfigService = {
  async getString(key: string, fallback = '') {
    const { data, error } = await supabase.from('academic_config').select('value').eq('key', key).maybeSingle();
    if (error) throw error;
    const val = data?.value;
    if (typeof val === 'string') return val.replace(/^"|"$/g, '');
    return fallback;
  },

  async getParentActivationCode() {
    return this.getString('parent_activation_code', 'UUXZCV7412');
  },

  async getTeacherSignupCode() {
    return this.getString('teacher_signup_code', 'TEACH7K9M2X');
  },

  async getWhatsAppApiUrl(): Promise<string> {
    const fromDb = (await this.getString('whatsapp_api_url', '')).trim().replace(/\/$/, '');
    const fromEnv = (import.meta.env.VITE_WHATSAPP_API_URL as string | undefined)?.trim().replace(/\/$/, '') ?? '';
    return fromDb || fromEnv || 'https://wpp.northelite0.com';
  },

  async saveWhatsAppApiUrl(url: string) {
    await this.update('whatsapp_api_url', url.trim().replace(/\/$/, ''));
  },

  async getEnabledLevels(): Promise<AcademicEducationLevel[]> {
    const { data, error } = await supabase.from('academic_config').select('value').eq('key', 'enabled_education_levels').maybeSingle();
    if (error) throw error;
    if (Array.isArray(data?.value)) return data.value as AcademicEducationLevel[];
    return ['middle', 'high'];
  },

  async update(key: string, value: unknown) {
    const { error } = await supabase.from('academic_config').upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
  },

  async getExportTemplateLayout(): Promise<AcademicExportTemplateLayout> {
    const { data, error } = await supabase
      .from('academic_config')
      .select('value')
      .eq('key', EXPORT_TEMPLATE_LAYOUT_KEY)
      .maybeSingle();
    if (error) throw error;
    return mergeExportTemplateLayout(data?.value);
  },

  async saveExportTemplateLayout(layout: AcademicExportTemplateLayout) {
    await this.update(EXPORT_TEMPLATE_LAYOUT_KEY, layout);
  },

  async getAutoReminderSettings(): Promise<AcademicAutoReminderSettings> {
    const { data, error } = await supabase
      .from('academic_config')
      .select('value')
      .eq('key', 'auto_reminder_settings')
      .maybeSingle();
    if (error) throw error;
    const v = data?.value;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return normalizeAutoReminderSettings(v as Partial<AcademicAutoReminderSettings>);
    }
    return { ...DEFAULT_AUTO_REMINDER_SETTINGS };
  },

  async saveAutoReminderSettings(settings: AcademicAutoReminderSettings) {
    await this.update('auto_reminder_settings', normalizeAutoReminderSettings(settings));
  },

  async getSemesterWeekCalendars(): Promise<AcademicWeekCalendarsConfig> {
    const { data, error } = await supabase
      .from('academic_config')
      .select('value')
      .eq('key', 'semester_week_calendars')
      .maybeSingle();
    if (error) throw error;
    return normalizeWeekCalendars(data?.value ?? EMPTY_WEEK_CALENDARS);
  },

  async saveSemesterWeekCalendars(config: AcademicWeekCalendarsConfig) {
    await this.update('semester_week_calendars', config);
  },
};
