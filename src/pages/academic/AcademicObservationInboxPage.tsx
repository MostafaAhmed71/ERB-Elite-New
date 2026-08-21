import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, CheckCircle2, ChevronDown, ClipboardList, Eye, Plus, Send, Trash2, Users,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { academicAdminService, academicObservationService } from '../../lib/academic/adminService';
import { DEFAULT_SECTIONS, formatGradeWithLevel, gradesForLevel } from '../../lib/academic/constants';
import { subjectsForGrade } from '../../lib/academic/subjectHelpers';
import type {
  AcademicClassTeacherCandidate,
  AcademicEducationLevel,
  AcademicObservationAssignment,
  AcademicParentRequest,
  TeacherActivityEntry,
} from '../../lib/academic/types';
import {
  AcademicLayout, AcademicPageHeader, AcademicEmpty, AcademicBadge, AcademicField, AcademicFormPanel,
  academicBtnPrimary, academicBtnSecondary, academicBtnDanger, academicInputClass,
} from '../../components/academic/AcademicUi';
import { WhatsAppReminderToolbar, WhatsAppTeacherButton } from '../../components/academic/WhatsAppReminderToolbar';
import { ObservationEntriesList } from '../../components/academic/ObservationEntriesList';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { buildStudentObservationReminderMessage } from '../../lib/whatsappReminder';
import { supabase } from '../../lib/supabase';

const STATUS_LABEL: Record<string, string> = {
  pending: 'بانتظار الإرسال',
  assigned: 'بانتظار إفادة المعلمين',
  processed: 'مكتمل',
  rejected: 'مرفوض',
};

function statusVariant(status: string): 'warning' | 'info' | 'success' | 'danger' | 'default' {
  if (status === 'pending') return 'warning';
  if (status === 'assigned') return 'info';
  if (status === 'processed') return 'success';
  if (status === 'rejected') return 'danger';
  return 'default';
}

function studentMeta(s: AcademicParentRequest['students'][number]) {
  if (s.grade_label) return s.grade_label;
  return `${formatGradeWithLevel(s.education_level, s.grade)}${s.section ? ` — فصل ${s.section}` : ''}`;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      timeZone: 'Asia/Riyadh',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function TeachersPicker({
  level,
  grade,
  section,
  onSubmit,
  submitLabel,
  isPending,
  error,
}: {
  level: AcademicEducationLevel;
  grade: number;
  section: string;
  onSubmit: (teachers: { teacher_id: string; teacher_name: string; subject?: string }[], subjects: string[]) => void;
  submitLabel: string;
  isPending?: boolean;
  error?: string | null;
}) {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const { data: allSubjects = [] } = useQuery({
    queryKey: ['academic-subjects'],
    queryFn: academicAdminService.listSubjects,
  });

  const subjectOptions = useMemo(
    () => subjectsForGrade(allSubjects, level, grade).map((s) => s.name),
    [allSubjects, level, grade],
  );

  const { data: candidates = [], isLoading, isFetching } = useQuery({
    queryKey: ['obs-class-teachers', level, grade, section, selectedSubjects.join('|')],
    queryFn: () =>
      academicObservationService.findTeachersForClass(level, grade, section, selectedSubjects),
    enabled: selectedSubjects.length > 0,
  });

  useEffect(() => {
    setSelected({});
  }, [selectedSubjects.join('|'), level, grade, section]);

  const selectedTeachers = useMemo(
    () => candidates.filter((c) => selected[c.teacher_id]),
    [candidates, selected],
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-white/45 text-xs mb-2">اختر المواد</p>
        {subjectOptions.length === 0 ? (
          <p className="text-amber-300/90 text-sm">لا مواد لهذا الصف</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subjectOptions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() =>
                  setSelectedSubjects((prev) =>
                    prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name],
                  )
                }
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                  selectedSubjects.includes(name)
                    ? 'bg-gold-500/20 text-gold-300 border-gold-400/40'
                    : 'bg-white/[0.04] text-white/55 border-white/10',
                )}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedSubjects.length > 0 && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-white/45 text-xs">معلمو الفصل ({candidates.length})</p>
            <button
              type="button"
              className={academicBtnSecondary}
              onClick={() => {
                const next: Record<string, boolean> = {};
                for (const c of candidates) next[c.teacher_id] = true;
                setSelected(next);
              }}
            >
              تحديد الكل
            </button>
          </div>
          {isLoading || isFetching ? (
            <p className="text-white/40 text-sm">جاري التحميل...</p>
          ) : candidates.length === 0 ? (
            <p className="text-amber-300/90 text-sm">لا معلمون لهذه المواد في الفصل المحدد</p>
          ) : (
            <ul className="space-y-2 max-h-56 overflow-y-auto">
              {candidates.map((c: AcademicClassTeacherCandidate) => (
                <li key={c.teacher_id}>
                  <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 cursor-pointer hover:border-gold-400/30">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={!!selected[c.teacher_id]}
                      onChange={() =>
                        setSelected((prev) => ({ ...prev, [c.teacher_id]: !prev[c.teacher_id] }))
                      }
                    />
                    <span className="min-w-0">
                      <span className="block text-white font-semibold text-sm">{c.teacher_name}</span>
                      <span className="block text-white/45 text-xs mt-0.5">
                        {c.subjects.filter((s) => selectedSubjects.includes(s)).join('، ') || c.subjects.join('، ')}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p className="text-red-300 text-sm">{error}</p>}

      <button
        type="button"
        className={academicBtnPrimary}
        disabled={isPending || selectedTeachers.length === 0}
        onClick={() =>
          onSubmit(
            selectedTeachers.map((t) => ({
              teacher_id: t.teacher_id,
              teacher_name: t.teacher_name,
              subject:
                t.subjects.filter((s) => selectedSubjects.includes(s)).join('، ') || t.subjects[0],
            })),
            selectedSubjects,
          )
        }
      >
        <Send className="w-4 h-4" />
        {isPending ? 'جاري الحفظ...' : submitLabel}
      </button>
    </div>
  );
}

function TeacherProgressPanel({
  request,
  onChanged,
}: {
  request: AcademicParentRequest;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const studentName = request.students[0]?.name ?? 'طالب';

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['obs-assign-request', request.id],
    queryFn: () => academicObservationService.listAssignmentsByRequest(request.id),
  });

  const { data: teachersPhone = [] } = useQuery({
    queryKey: ['academic-teachers-phone'],
    queryFn: () => academicAdminService.listTeachersWithPhone(),
  });

  const phoneById = useMemo(
    () => new Map(teachersPhone.map((t) => [t.id, t.phone ?? null])),
    [teachersPhone],
  );

  const pending = rows.filter((r) => r.status === 'pending');
  const completed = rows.filter((r) => r.status === 'completed');

  const selectedSubjects = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const raw = (r.subject ?? '').trim();
      if (!raw) continue;
      for (const part of raw.split(/[،,]/)) {
        const s = part.trim();
        if (s) set.add(s);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'ar'));
  }, [rows]);

  const missingEntries: TeacherActivityEntry[] = pending.map((r) => ({
    teacher_id: r.teacher_id,
    teacher_name: r.teacher_name,
    phone: phoneById.get(r.teacher_id) ?? null,
    summary: r.subject ?? undefined,
  }));

  const removeMut = useMutation({
    mutationFn: (id: string) => academicObservationService.removePendingAssignment(id),
    onSuccess: () => {
      toast.success('تم حذف التكليف');
      qc.invalidateQueries({ queryKey: ['obs-assign-request', request.id] });
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-white/40 text-sm">جاري تحميل تفاصيل المعلمين...</p>;
  if (!rows.length) return <p className="text-white/40 text-sm">لا تكليفات بعد</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gold-400/25 bg-gold-500/10 px-3 py-3">
        <p className="text-gold-200/80 text-xs flex items-center gap-1.5 mb-2">
          <BookOpen className="w-3.5 h-3.5" />
          المواد المختارة ({selectedSubjects.length})
        </p>
        {selectedSubjects.length === 0 ? (
          <p className="text-white/40 text-sm">لم تُسجَّل مواد على التكليفات</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedSubjects.map((name) => (
              <span
                key={name}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gold-500/15 text-gold-200 border border-gold-400/30"
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-3">
          <p className="text-emerald-200/70 text-xs">أكملوا</p>
          <p className="text-2xl font-black text-emerald-300">{completed.length}</p>
        </div>
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-3">
          <p className="text-amber-200/70 text-xs">متبقّون</p>
          <p className="text-2xl font-black text-amber-300">{pending.length}</p>
        </div>
      </div>

      {pending.length > 0 && (
        <WhatsAppReminderToolbar
          teachers={missingEntries}
          buildMessage={(t) =>
            buildStudentObservationReminderMessage(t.teacher_name, studentName, t.summary)
          }
          label="تذكير واتساب للمتبقّين"
        />
      )}

      <div className="space-y-2">
        <p className="text-white/45 text-xs flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> تفاصيل المعلمين
        </p>
        {rows.map((r: AcademicObservationAssignment) => {
          const entry: TeacherActivityEntry = {
            teacher_id: r.teacher_id,
            teacher_name: r.teacher_name,
            phone: phoneById.get(r.teacher_id) ?? null,
            summary: r.subject ?? undefined,
          };
          const teacherSubjects = (r.subject ?? '')
            .split(/[،,]/)
            .map((s) => s.trim())
            .filter(Boolean);
          return (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm">{r.teacher_name}</p>
                {teacherSubjects.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {teacherSubjects.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded-md text-[11px] bg-white/5 text-white/60 border border-white/10"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                {r.status === 'completed' && r.note && (
                  <p className="text-white/55 text-xs mt-1 line-clamp-2">{r.note}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <AcademicBadge variant={r.status === 'completed' ? 'success' : 'warning'}>
                  {r.status === 'completed' ? 'مكتمل' : 'متبقّي'}
                </AcademicBadge>
                {r.status === 'pending' && (
                  <>
                    <WhatsAppTeacherButton
                      teacher={entry}
                      buildMessage={(t) =>
                        buildStudentObservationReminderMessage(t.teacher_name, studentName, t.summary)
                      }
                    />
                    <button
                      type="button"
                      title="إزالة من الطلب"
                      className="p-2 rounded-lg text-red-300 hover:bg-red-500/10 border border-red-400/20"
                      onClick={() => {
                        if (confirm(`إزالة ${r.teacher_name} من هذا الطلب؟`)) removeMut.mutate(r.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CreateStaffRequestForm({ onCreated }: { onCreated: (req: AcademicParentRequest) => void }) {
  const [studentId, setStudentId] = useState('');
  const [parentName, setParentName] = useState('إدارة المدرسة');
  const [parentPhone, setParentPhone] = useState('0000000000');
  const [manual, setManual] = useState(false);
  const [name, setName] = useState('');
  const [level, setLevel] = useState<AcademicEducationLevel>('middle');
  const [grade, setGrade] = useState(1);
  const [section, setSection] = useState('أ');

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['obs-active-students'],
    queryFn: () => academicObservationService.listActiveStudentsForObservation(),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      let studentsPayload: AcademicParentRequest['students'];
      let parent_user_id: string | null = null;
      let finalParentName = parentName.trim() || 'إدارة المدرسة';
      let finalPhone = parentPhone.trim() || '0000000000';

      if (!manual) {
        const child = students.find((s) => s.id === studentId);
        if (!child) throw new Error('اختر طالباً');
        studentsPayload = [academicObservationService.mapRosterStudentToRequestStudent(child)];
        parent_user_id = child.parent_id;
        if (child.parent_id) {
          const { data: parent } = await supabase
            .from('users')
            .select('full_name, phone')
            .eq('id', child.parent_id)
            .maybeSingle();
          if (parent?.full_name) finalParentName = parent.full_name;
          if (parent?.phone) finalPhone = parent.phone;
        }
      } else {
        if (!name.trim()) throw new Error('أدخل اسم الطالب');
        studentsPayload = [
          {
            name: name.trim(),
            grade,
            section,
            education_level: level,
            grade_label: `${formatGradeWithLevel(level, grade)} — فصل ${section}`,
          },
        ];
      }

      return academicObservationService.createParentRequest({
        parent_user_id,
        parent_name: finalParentName,
        parent_phone: finalPhone,
        students: studentsPayload,
      });
    },
    onSuccess: (req) => {
      toast.success('تم إنشاء الطلب');
      onCreated(req);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AcademicFormPanel title="إنشاء طلب ملاحظة (بدون ولي أمر)">
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          className={clsx(academicBtnSecondary, !manual && 'border-gold-400/40 text-gold-300')}
          onClick={() => setManual(false)}
        >
          من قائمة الطلاب
        </button>
        <button
          type="button"
          className={clsx(academicBtnSecondary, manual && 'border-gold-400/40 text-gold-300')}
          onClick={() => setManual(true)}
        >
          إدخال يدوي
        </button>
      </div>

      {!manual ? (
        <AcademicField label="الطالب">
          {isLoading ? (
            <p className="text-white/40 text-sm">جاري التحميل...</p>
          ) : (
            <select
              className={academicInputClass}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="">اختر الطالب</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} — {s.grade} / {s.class_name}
                </option>
              ))}
            </select>
          )}
        </AcademicField>
      ) : (
        <>
          <AcademicField label="اسم الطالب">
            <input className={academicInputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </AcademicField>
          <div className="grid grid-cols-3 gap-2">
            <select
              className={academicInputClass}
              value={level}
              onChange={(e) => setLevel(e.target.value as AcademicEducationLevel)}
            >
              <option value="middle">متوسط</option>
              <option value="high">ثانوي</option>
            </select>
            <select className={academicInputClass} value={grade} onChange={(e) => setGrade(+e.target.value)}>
              {gradesForLevel(level).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <select className={academicInputClass} value={section} onChange={(e) => setSection(e.target.value)}>
              {DEFAULT_SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AcademicField label="اسم ولي الأمر / الجهة">
          <input className={academicInputClass} value={parentName} onChange={(e) => setParentName(e.target.value)} />
        </AcademicField>
        <AcademicField label="الجوال">
          <input
            className={academicInputClass}
            dir="ltr"
            value={parentPhone}
            onChange={(e) => setParentPhone(e.target.value)}
          />
        </AcademicField>
      </div>

      <button
        type="button"
        className={academicBtnPrimary}
        disabled={createMut.isPending || (!manual && !studentId)}
        onClick={() => createMut.mutate()}
      >
        <Plus className="w-4 h-4" />
        {createMut.isPending ? 'جاري الإنشاء...' : 'إنشاء الطلب'}
      </button>
    </AcademicFormPanel>
  );
}

function RequestCard({
  request,
  expanded,
  onToggle,
  onChanged,
}: {
  request: AcademicParentRequest;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'none' | 'dispatch' | 'add'>('none');
  const student = request.students[0];
  const level = (student?.education_level ?? 'middle') as AcademicEducationLevel;
  const grade = student?.grade ?? 1;
  const section = student?.section ?? 'أ';

  const { data: report } = useQuery({
    queryKey: ['academic-obs-report', request.linked_report_id],
    queryFn: () => academicObservationService.getReport(request.linked_report_id!),
    enabled: expanded && !!request.linked_report_id && request.status === 'processed',
  });

  const deleteMut = useMutation({
    mutationFn: () => academicObservationService.deleteObservationRequest(request.id),
    onSuccess: () => {
      toast.success('تم حذف الطلب');
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMut = useMutation({
    mutationFn: () => academicObservationService.updateRequestStatus(request.id, 'rejected', user?.id),
    onSuccess: () => {
      toast.success('تم رفض الطلب');
      onChanged();
    },
  });

  const dispatchMut = useMutation({
    mutationFn: (teachers: { teacher_id: string; teacher_name: string; subject?: string }[]) => {
      if (!student) throw new Error('لا يوجد طالب');
      return academicObservationService.dispatchToTeachers({
        request,
        student,
        teachers,
        dispatchedBy: user!.id,
      });
    },
    onSuccess: () => {
      toast.success('تم الإرسال للمعلمين');
      setMode('none');
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMut = useMutation({
    mutationFn: (teachers: { teacher_id: string; teacher_name: string; subject?: string }[]) =>
      academicObservationService.addTeachersToRequest({ request, teachers }),
    onSuccess: (n) => {
      toast.success(`تمت إضافة ${n} معلم`);
      setMode('none');
      qc.invalidateQueries({ queryKey: ['obs-assign-request', request.id] });
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#152048] to-[#111c44] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-right p-4 sm:p-5 flex items-start gap-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-white font-bold text-base">
                {student?.name ?? 'طالب'}
              </h3>
              <p className="text-[#A3AED0] text-sm mt-0.5">
                {student ? studentMeta(student) : '—'}
              </p>
            </div>
            <AcademicBadge variant={statusVariant(request.status)}>
              {STATUS_LABEL[request.status] ?? request.status}
            </AcademicBadge>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-white/50">
            <span>ولي الأمر: {request.parent_name}</span>
            <span dir="ltr">{request.parent_phone}</span>
            <span>{formatDate(request.created_at)}</span>
          </div>
        </div>
        <ChevronDown
          className={clsx('w-5 h-5 text-white/40 shrink-0 mt-1 transition-transform', expanded && 'rotate-180')}
        />
      </button>

      {expanded && (
        <div className="border-t border-white/10 p-4 sm:p-5 space-y-4 bg-black/15">
          <div className="flex flex-wrap gap-2">
            {request.status === 'pending' && (
              <>
                <button type="button" className={academicBtnPrimary} onClick={() => setMode(mode === 'dispatch' ? 'none' : 'dispatch')}>
                  <Send className="w-4 h-4" /> إرسال للمعلمين
                </button>
                <button type="button" className={academicBtnDanger} onClick={() => rejectMut.mutate()} disabled={rejectMut.isPending}>
                  رفض
                </button>
              </>
            )}
            {(request.status === 'assigned' || request.status === 'processed') && request.linked_report_id && (
              <button type="button" className={academicBtnSecondary} onClick={() => setMode(mode === 'add' ? 'none' : 'add')}>
                <Plus className="w-4 h-4" /> تعديل / إضافة مواد ومعلمين
              </button>
            )}
            {request.linked_report_id && (
              <Link to={`/academic/reports/${request.linked_report_id}`} className={academicBtnSecondary}>
                <Eye className="w-4 h-4" /> عرض التقرير
              </Link>
            )}
            <button
              type="button"
              className={academicBtnDanger}
              disabled={deleteMut.isPending}
              onClick={() => {
                if (confirm('حذف هذا الطلب نهائياً مع تكليفاته؟')) deleteMut.mutate();
              }}
            >
              <Trash2 className="w-4 h-4" /> حذف الطلب
            </button>
          </div>

          {mode === 'dispatch' && request.status === 'pending' && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <TeachersPicker
                level={level}
                grade={grade}
                section={section}
                submitLabel="إرسال للمعلمين"
                isPending={dispatchMut.isPending}
                error={dispatchMut.error instanceof Error ? dispatchMut.error.message : null}
                onSubmit={(teachers) => dispatchMut.mutate(teachers)}
              />
            </div>
          )}

          {mode === 'add' && request.linked_report_id && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-white/50 text-xs mb-3">أضف مواد/معلمين جدد للطلب بعد الإرسال</p>
              <TeachersPicker
                level={level}
                grade={grade}
                section={section}
                submitLabel="إضافة للمعلمين المحددين"
                isPending={addMut.isPending}
                error={addMut.error instanceof Error ? addMut.error.message : null}
                onSubmit={(teachers) => addMut.mutate(teachers)}
              />
            </div>
          )}

          {(request.status === 'assigned' || request.status === 'processed') && (
            <TeacherProgressPanel request={request} onChanged={onChanged} />
          )}

          {request.status === 'processed' && report && (
            <div>
              <p className="text-white/45 text-xs mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> التقييمات المستلمة
              </p>
              <ObservationEntriesList raw={report.teacher_observations} />
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function AcademicObservationInboxPage() {
  const { role } = useAuthStore();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const canManage = role === 'principal' || role === 'deputy' || role === 'supervisor';
  const [tab, setTab] = useState<'pending' | 'assigned' | 'closed' | 'all'>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ['academic-parent-requests'],
    queryFn: academicObservationService.listParentRequests,
  });

  useEffect(() => {
    const id = searchParams.get('request');
    if (!id || !requests.length) return;
    const found = requests.find((r) => r.id === id);
    if (!found) return;
    setExpandedId(id);
    if (found.status === 'pending') setTab('pending');
    else if (found.status === 'assigned') setTab('assigned');
    else if (found.status === 'processed' || found.status === 'rejected') setTab('closed');
    else setTab('all');
  }, [searchParams, requests]);

  useEffect(() => {
    if (!requests.length) return;
    let cancelled = false;
    (async () => {
      const n = await academicObservationService.repairStuckAssignedRequests(requests);
      if (!cancelled && n > 0) {
        await refetch();
        qc.invalidateQueries({ queryKey: ['academic-obs-reports'] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requests, refetch, qc]);

  const filtered = useMemo(() => {
    if (tab === 'pending') return requests.filter((r) => r.status === 'pending');
    if (tab === 'assigned') return requests.filter((r) => r.status === 'assigned');
    if (tab === 'closed') return requests.filter((r) => r.status === 'processed' || r.status === 'rejected');
    return requests;
  }, [requests, tab]);

  const counts = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === 'pending').length,
      assigned: requests.filter((r) => r.status === 'assigned').length,
      closed: requests.filter((r) => r.status === 'processed' || r.status === 'rejected').length,
      all: requests.length,
    }),
    [requests],
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['academic-parent-requests'] });
    qc.invalidateQueries({ queryKey: ['obs-assign-request'] });
    qc.invalidateQueries({ queryKey: ['academic-obs-reports'] });
    qc.invalidateQueries({ queryKey: ['academic-obs-report'] });
  };

  if (!canManage) {
    return (
      <AcademicLayout>
        <AcademicPageHeader title="تقارير ملاحظات الطلاب" backTo="/academic" />
        <AcademicEmpty message="هذه الشاشة للمدير والوكيل والمشرف التربوي" icon={ClipboardList} />
      </AcademicLayout>
    );
  }

  const tabs: { key: typeof tab; label: string; count: number }[] = [
    { key: 'pending', label: 'جديدة', count: counts.pending },
    { key: 'assigned', label: 'قيد الإفادة', count: counts.assigned },
    { key: 'closed', label: 'مكتملة/مرفوضة', count: counts.closed },
    { key: 'all', label: 'الكل', count: counts.all },
  ];

  return (
    <AcademicLayout size="4xl">
      <AcademicPageHeader
        title="تقارير ملاحظات الطلاب"
        subtitle="تفاصيل الطلبات، إرسال للمعلمين، متابعة الإكمال، وتذكير واتساب"
        backTo="/academic"
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" className={academicBtnPrimary} onClick={() => setShowCreate((v) => !v)}>
              <Plus className="w-4 h-4" />
              {showCreate ? 'إخفاء النموذج' : 'إنشاء طلب'}
            </button>
            <Link to="/academic/reports" className={academicBtnSecondary}>
              التقارير المحفوظة
            </Link>
          </div>
        }
      />

      {showCreate && (
        <div className="mb-6">
          <CreateStaffRequestForm
            onCreated={(req) => {
              setShowCreate(false);
              invalidate();
              setTab('pending');
              setExpandedId(req.id);
            }}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-5">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx(
              'px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all',
              tab === t.key
                ? 'bg-gold-500/15 text-gold-300 border-gold-400/35'
                : 'bg-white/[0.03] text-white/55 border-white/10 hover:border-white/20',
            )}
          >
            {t.label}
            <span className="ms-1.5 text-xs opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <TapHandLoader />
      ) : filtered.length === 0 ? (
        <AcademicEmpty message="لا توجد طلبات في هذا القسم" icon={ClipboardList} />
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              expanded={expandedId === req.id}
              onToggle={() => setExpandedId((id) => (id === req.id ? null : req.id))}
              onChanged={invalidate}
            />
          ))}
        </div>
      )}
    </AcademicLayout>
  );
}
