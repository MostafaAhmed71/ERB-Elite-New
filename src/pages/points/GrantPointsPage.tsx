import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Users, User, CheckCircle2, AlertCircle, Zap, MinusCircle, Paperclip, X, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAction } from '../../lib/auth';
import { useAuthStore } from '../../stores/authStore';
import type { DbStudent, DbActivity } from '../../types';
import clsx from 'clsx';
import { TeacherBudgetBanner } from '../../components/ui/TeacherBudgetBanner';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { EmptyState } from '../../components/ui/EmptyState';
import { BarsLoader } from '../../components/ui/BarsLoader';
import { showSuccess, showError } from '../../lib/toast';
import {
  fetchTeacherClassAssignmentsByUserId,
  filterStudentsByAssignments,
  parsePointsGrantError,
  gradesFromAssignments,
  classesFromAssignments,
} from '../../lib/teacherScope';
import { syncTeacherOlympiadFromAcademic } from '../../lib/academic/olympiadSyncService';
import { POINT_TEMPLATES, applyPointTemplate } from '../../lib/pointTemplates';
import { BehavioralRubricPanel } from '../../components/teacher/BehavioralRubricPanel';
import type { RubricTier } from '../../lib/behaviorRubric';
import { BEHAVIOR_RUBRIC } from '../../lib/behaviorRubric';
import { QRQuickGrant } from '../../components/teacher/QRQuickGrant';
import {
  fetchActivityWeek,
  isActivityWeekActive,
  applyActivityWeekMultiplier,
} from '../../lib/activityWeek';
import { classesMatch, gradesMatch } from '../../lib/academic/gradeBridge';
import { useGradeClassCatalog } from '../../hooks/useGradeClassCatalog';
import { POINT_AXIS_OPTIONS, type PointAxisKey } from '../../lib/pointsReference';
import {
  MANUAL_TEACHER_ACTIVITY_ID,
  buildManualActivityNote,
  uploadPointsEvidenceFiles,
  ensureManualTeacherActivity,
} from '../../lib/pointsEvidence';
import {
  filterOlympiadMiddleGrades,
  filterOlympiadMiddleStudents,
} from '../../lib/olympiadMiddleScope';

type GrantPointsPageProps = { embedded?: boolean; mode?: 'grant' | 'deduct' };

const STAFF_ROLES = new Set(['admin', 'supervisor', 'principal', 'activity_leader']);
const OLYMPIAD_MIDDLE_ROLES = new Set(['admin', 'activity_leader']);

export function GrantPointsPage({ embedded = false, mode = 'grant' }: GrantPointsPageProps) {
  const isDeduct = mode === 'deduct';
  const { user, role } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const isTeacher = role === 'teacher';
  const isStaff = !!role && STAFF_ROLES.has(role);
  /** رائد النشاط: أولمبياد المرحلة المتوسطة فقط */
  const olympiadMiddleOnly = !!role && OLYMPIAD_MIDDLE_ROLES.has(role);

  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PointAxisKey>('activity');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedActivity, setSelectedActivity] = useState('');
  const [activitySource, setActivitySource] = useState<'catalog' | 'manual'>('catalog');
  const [manualActivityName, setManualActivityName] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [customPoints, setCustomPoints] = useState<number | ''>('');
  const [note, setNote] = useState('');
  /** يُزامَن مع ?bulk=1 حتى لا يبقى الوضع الجماعي عند فتح المنح الفردي */
  const bulkMode = searchParams.get('bulk') === '1';
  const setBulkMode = (next: boolean) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next) p.set('bulk', '1');
        else p.delete('bulk');
        return p;
      },
      { replace: true },
    );
    if (!next) setSelectedStudents([]);
  };
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [activeRubricCriterion, setActiveRubricCriterion] = useState<string | null>(null);
  const [activeRubricTier, setActiveRubricTier] = useState<RubricTier | null>(null);
  const [syncingClasses, setSyncingClasses] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const {
    data: teacherAssignments = [],
    isLoading: assignmentsLoading,
    isFetched: assignmentsFetched,
  } = useQuery({
    queryKey: ['teacher', 'classes', user?.id],
    queryFn: () => fetchTeacherClassAssignmentsByUserId(user!.id),
    enabled: isTeacher && !!user,
  });

  const handleSyncClasses = async () => {
    if (!user) return;
    setSyncingClasses(true);
    try {
      const result = await syncTeacherOlympiadFromAcademic(user.id);
      await queryClient.invalidateQueries({ queryKey: ['teacher', 'classes', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['students'] });
      if (result.synced && result.classes > 0) {
        showSuccess(`تمت مزامنة ${result.classes} فصل من الإعداد الأكاديمي`);
      } else if (result.reason === 'empty_payload') {
        showError(null, 'لا يوجد إعداد أكاديمي مكتمل للمزامنة — أكمل إعداد المعلم أو اطلب إسناد الفصول من الإدارة');
      } else if (result.reason === 'rpc_missing') {
        showError(null, 'يلزم تطبيق ترحيل قاعدة البيانات 114 أولاً (مزامنة الفصول)');
      } else {
        showError(null, 'لم تُضف فصول بعد المزامنة — تحقق من الإسناد الأكاديمي');
      }
    } catch (e) {
      showError(e instanceof Error ? e : new Error('تعذرت المزامنة'));
    } finally {
      setSyncingClasses(false);
    }
  };

  const { data: catalog } = useGradeClassCatalog(!!user && !isTeacher);

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students', isTeacher ? user?.id : olympiadMiddleOnly ? 'olympiad-middle' : 'all', teacherAssignments],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      const all = data as DbStudent[];
      if (isTeacher) return filterStudentsByAssignments(all, teacherAssignments);
      if (olympiadMiddleOnly) return filterOlympiadMiddleStudents(all);
      return all;
    },
    enabled: !!user && (!isTeacher || assignmentsFetched),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('activities').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data as DbActivity[];
    },
  });

  const { data: activityWeek } = useQuery({
    queryKey: ['activity-week'],
    queryFn: fetchActivityWeek,
    enabled: !isDeduct,
  });

  const availableGrades = useMemo(() => {
    if (isTeacher) return gradesFromAssignments(teacherAssignments);
    const grades = catalog?.grades ?? [];
    return olympiadMiddleOnly ? filterOlympiadMiddleGrades(grades) : grades;
  }, [isTeacher, teacherAssignments, catalog?.grades, olympiadMiddleOnly]);

  const availableClasses = useMemo(() => {
    if (!filterGrade) return [];
    if (isTeacher) return classesFromAssignments(teacherAssignments, filterGrade);
    return catalog?.classesByGrade[filterGrade] ?? catalog?.allClasses ?? [];
  }, [isTeacher, teacherAssignments, catalog, filterGrade]);

  const scopedStudents = useMemo(() => {
    // للطلاب المجلوبين مسبقاً مفلترين للمعلم؛ أعد التصفية حسب الاختيار
    let list = students;
    if (filterGrade) list = list.filter((s) => gradesMatch(s.grade, filterGrade));
    if (filterClass) list = list.filter((s) => classesMatch(s.class_name, filterClass));
    return list;
  }, [students, filterGrade, filterClass]);

  const visibleActivities = useMemo(() => {
    const list = isStaff
      ? activities.filter((a) => a.category === selectedCategory)
      : activities;
    // النشاط اليدوي له واجهة خاصة — لا يظهر في قائمة الكتالوج
    return list.filter((a) => a.id !== MANUAL_TEACHER_ACTIVITY_ID);
  }, [activities, isStaff, selectedCategory]);

  const studentIdParam = searchParams.get('studentId');
  useEffect(() => {
    if (studentIdParam && students.some((s) => s.id === studentIdParam)) {
      const match = students.find((s) => s.id === studentIdParam);
      if (match) {
        setFilterGrade(match.grade);
        setFilterClass(match.class_name);
        setSelectedStudents([studentIdParam]);
      }
    }
  }, [studentIdParam, students]);

  useEffect(() => {
    if (selectedActivity && !visibleActivities.some((a) => a.id === selectedActivity)) {
      setSelectedActivity('');
    }
  }, [selectedActivity, visibleActivities]);

  useEffect(() => {
    if (isTeacher && teacherAssignments.length === 1 && !filterGrade) {
      setFilterGrade(teacherAssignments[0].grade);
      setFilterClass(teacherAssignments[0].class_name);
    }
  }, [isTeacher, teacherAssignments, filterGrade]);

  // عند اختيار صف له فصل واحد فقط — اختَره تلقائياً
  useEffect(() => {
    if (!filterGrade || filterClass) return;
    if (availableClasses.length === 1) {
      setFilterClass(availableClasses[0]);
    }
  }, [filterGrade, filterClass, availableClasses]);

  // وضع الفصل: تحديد كل طلاب الفصل تلقائياً دون عرض قائمة الاختيار
  const scopedStudentIdsKey = useMemo(
    () => scopedStudents.map((s) => s.id).sort().join(','),
    [scopedStudents],
  );

  useEffect(() => {
    if (!bulkMode) return;
    if (!filterGrade || !filterClass) {
      setSelectedStudents([]);
      return;
    }
    setSelectedStudents(scopedStudentIdsKey ? scopedStudentIdsKey.split(',') : []);
  }, [bulkMode, filterGrade, filterClass, scopedStudentIdsKey]);

  useEffect(() => {
    if (bulkMode) setSearch('');
  }, [bulkMode]);

  const selectedActivityData = activities.find((a) => a.id === selectedActivity);
  const isManualActivity = activitySource === 'manual';

  const activityWeekOn =
    !isDeduct &&
    activityWeek &&
    isActivityWeekActive(activityWeek) &&
    (isManualActivity || selectedActivityData?.category === 'activity');

  const basePoints = customPoints !== ''
    ? customPoints
    : (isManualActivity ? 0 : (selectedActivityData?.default_points ?? 0));
  const pointsToApply =
    activityWeekOn && activityWeek
      ? applyActivityWeekMultiplier(Number(basePoints), activityWeek)
      : Number(basePoints);
  const signedPoints = isDeduct ? -Math.abs(pointsToApply) : pointsToApply;
  const totalCost = Math.abs(Number(selectedStudents.length) * signedPoints);
  const canDirectApprove = isStaff;

  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('غير مصرح');
      if (selectedStudents.length === 0) throw new Error('اختر طالباً على الأقل');
      if (pointsToApply <= 0) throw new Error('النقاط يجب أن تكون أكبر من صفر');
      if (!filterGrade || !filterClass) throw new Error('اختر الصف والفصل أولاً');

      let activityId = selectedActivity;
      let ledgerNote = note.trim() || null;

      if (isManualActivity) {
        const name = manualActivityName.trim();
        if (!name) throw new Error('أدخل اسم النشاط اليدوي');
        if (customPoints === '' || Number(customPoints) <= 0) {
          throw new Error('حدد عدد النقاط للنشاط اليدوي');
        }
        activityId = await ensureManualTeacherActivity();
        ledgerNote = buildManualActivityNote(name, note);
      } else if (!activityId) {
        throw new Error('اختر نشاطاً أولاً');
      }

      const evidenceUrls = await uploadPointsEvidenceFiles(user.id, evidenceFiles);

      const now = new Date().toISOString();
      const inserts = selectedStudents.map((studentId) => {
        const row: Record<string, unknown> = {
          student_id: studentId,
          granted_by: user.id,
          activity_id: activityId,
          points: signedPoints,
          note: ledgerNote,
          status: (canDirectApprove ? 'approved' : 'pending') as 'approved' | 'pending',
          approved_by: canDirectApprove ? user.id : null,
          approved_at: canDirectApprove ? now : null,
          first_approved_by: canDirectApprove ? user.id : null,
          first_approved_at: canDirectApprove ? now : null,
          rejection_reason: null,
          academic_year: new Date().getFullYear().toString(),
        };
        // لا نرسل evidence_urls فارغاً حتى لا يفشل الإدراج إن لم يُزامَن العمود بعد
        if (evidenceUrls.length > 0) {
          row.evidence_urls = evidenceUrls;
        }
        return row;
      });

      const { error } = await supabase.from('points_ledger').insert(inserts);
      if (error) throw new Error(parsePointsGrantError(error.message));

      await logAction(isDeduct ? 'POINTS_DEDUCTED' : 'POINTS_GRANTED', 'points_ledger', undefined, {
        students: selectedStudents.length,
        activity: activityId,
        points: signedPoints,
        grade: filterGrade,
        class_name: filterClass,
        manual: isManualActivity,
        evidence_count: evidenceUrls.length,
      });
    },
    onSuccess: () => {
      const actionLabel = isDeduct ? 'خصم' : 'منح';
      const targetLabel = bulkMode
        ? `الفصل ${filterClass} (${selectedStudents.length} طالب)`
        : `${selectedStudents.length} طالب`;
      if (canDirectApprove) {
        showSuccess(
          `تم ${actionLabel} ${Math.abs(signedPoints)} نقطة لـ ${targetLabel} بنجاح`
        );
      } else {
        showSuccess(
          bulkMode
            ? `تم إرسال طلب ${actionLabel} للفصل كاملاً (${selectedStudents.length} طالب) — في انتظار الموافقة`
            : `تم إرسال ${selectedStudents.length} طلب ${actionLabel} — في انتظار الموافقة`
        );
      }
      setSelectedStudents([]);
      setNote('');
      setCustomPoints('');
      setManualActivityName('');
      setEvidenceFiles([]);
      setActiveTemplateId(null);
      setActiveRubricCriterion(null);
      setActiveRubricTier(null);
      queryClient.invalidateQueries({ queryKey: ['points_ledger'] });
      queryClient.invalidateQueries({ queryKey: ['teacher', 'budget'] });
      queryClient.invalidateQueries({ queryKey: ['teacher', 'quota'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e: Error) => showError(e),
  });

  const filtered = scopedStudents.filter(
    (s) =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.admission_number.includes(search)
  );

  const grouped = filtered.reduce<Record<string, DbStudent[]>>((acc, s) => {
    const key = `${s.grade} — ${s.class_name}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const toggleStudent = (id: string) => {
    if (bulkMode) return;
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const applyTemplate = (templateId: string) => {
    const template = POINT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    const applied = applyPointTemplate(template, activities);
    if (!applied) {
      showError(null, `لا يوجد نشاط في محور ${template.category} — أضف نشاطاً أولاً`);
      return;
    }

    if (isStaff) setSelectedCategory(template.category as PointAxisKey);
    setSelectedActivity(applied.activityId);
    setCustomPoints(applied.points);
    setNote(applied.note);
    setActiveTemplateId(templateId);
    setActiveRubricCriterion(null);
    setActiveRubricTier(null);
  };

  const handleRubricApply = (activityId: string, points: number, rubricNote: string) => {
    if (isStaff) setSelectedCategory('behavior');
    setSelectedActivity(activityId);
    setCustomPoints(points);
    setNote(rubricNote);
    setActiveTemplateId(null);

    const criterionLabel = rubricNote.split(' — ')[0];
    const tierLabel = rubricNote.match(/— (ممتاز|جيد|يحتاج تحسين)/)?.[1];
    const criterion = BEHAVIOR_RUBRIC.find((c) => c.label === criterionLabel);
    const tierMap: Record<string, RubricTier> = {
      ممتاز: 'excellent',
      جيد: 'good',
      'يحتاج تحسين': 'needs_improvement',
    };
    setActiveRubricCriterion(criterion?.id ?? null);
    setActiveRubricTier(tierLabel ? (tierMap[tierLabel] ?? null) : null);
  };

  const handleQRStudent = (studentId: string) => {
    const match = students.find((s) => s.id === studentId);
    if (match) {
      setFilterGrade(match.grade);
      setFilterClass(match.class_name);
    }
    setSelectedStudents([studentId]);
    showSuccess('تم تحديد الطالب من البطاقة');
  };

  const accentClass = isDeduct ? 'text-red-400' : 'text-gold-400';
  const accentBg = isDeduct ? 'bg-red-500/15 border-red-500/25' : 'bg-gold-500/15 border-gold-500/25';

  return (
    <div className="space-y-6" dir="rtl">
      {!embedded && (
        <PageHeader
          title={isDeduct ? 'خصم النقاط' : 'منح النقاط'}
          subtitle={
            isTeacher
              ? bulkMode
                ? 'اختر الصف والفصل ثم امنح النقاط للفصل كاملاً'
                : 'اختر الصف والفصل ثم حدد الطلاب للمنح'
              : isDeduct
                ? 'اختر الصف والفصل والمحور ثم حدد الطلاب للخصم'
                : bulkMode
                  ? 'وضع الفصل: منح النقاط لكل طلاب الفصل المختار دفعة واحدة'
                  : 'اختر الصف والفصل والمحور ثم حدد الطلاب للمنح'
          }
          icon={isDeduct ? MinusCircle : Award}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {!isDeduct && !bulkMode && (
                <QRQuickGrant students={scopedStudents} onStudentFound={handleQRStudent} />
              )}
              <div className="flex rounded-xl border border-white/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setBulkMode(false)}
                  className={clsx(
                    'px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors',
                    !bulkMode
                      ? 'bg-gold-500/20 text-gold-300'
                      : 'bg-white/5 text-white/50 hover:text-white/80',
                  )}
                >
                  <User className="w-4 h-4" />
                  فردي
                </button>
                <button
                  type="button"
                  onClick={() => setBulkMode(true)}
                  className={clsx(
                    'px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors border-r border-white/10',
                    bulkMode
                      ? 'bg-gold-500/20 text-gold-300'
                      : 'bg-white/5 text-white/50 hover:text-white/80',
                  )}
                >
                  <Users className="w-4 h-4" />
                  جماعي
                </button>
              </div>
            </div>
          }
        />
      )}

      {isTeacher && !isDeduct && <TeacherBudgetBanner />}

      {!isDeduct && activityWeek && isActivityWeekActive(activityWeek) && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-sm">
          <Zap className="w-5 h-5 shrink-0 text-amber-400" />
          <span>
            <strong>{activityWeek.label}</strong> نشط — نقاط محور النشاط ×{activityWeek.multiplier}
            {activityWeek.ends_at && (
              <span className="text-amber-300/70">
                {' '}
                حتى {new Date(activityWeek.ends_at).toLocaleDateString('ar-SA')}
              </span>
            )}
          </span>
        </div>
      )}

      {isTeacher && teacherAssignments.length === 0 && !assignmentsLoading && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-sm">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
            <div>
              <p className="font-semibold text-amber-100">لا فصول مسندة لحسابك حالياً</p>
              <p className="text-amber-200/80 text-xs mt-1 leading-relaxed">
                إن أكملت الإعداد الأكاديمي اضغط «مزامنة فصولي». وإلا اطلب من الإدارة إسناد الفصول من إدارة المستخدمين أو الإسناد الأكاديمي.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            loading={syncingClasses}
            onClick={() => void handleSyncClasses()}
          >
            مزامنة فصولي
          </Button>
        </div>
      )}

      {!isDeduct && (
        <div className="glass-card overflow-hidden">
          <button
            type="button"
            onClick={() => setTemplatesOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 p-4 text-right hover:bg-white/[0.03] transition-colors"
            aria-expanded={templatesOpen}
          >
            <span className="flex items-center gap-2 text-white/70 text-sm font-medium">
              <Zap className="w-4 h-4 text-gold-400" />
              قوالب جاهزة
            </span>
            <ChevronDown
              className={clsx(
                'w-4 h-4 text-white/40 transition-transform shrink-0',
                templatesOpen && 'rotate-180',
              )}
            />
          </button>
          {templatesOpen && (
            <div className="px-4 pb-4 flex flex-wrap gap-2 border-t border-white/5 pt-3">
              {POINT_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t.id)}
                  className={clsx(
                    'px-3 py-2 rounded-xl border text-sm transition-all flex items-center gap-2',
                    activeTemplateId === t.id
                      ? 'bg-gold-500/15 border-gold-500/30 text-gold-300'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20'
                  )}
                >
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                  <span className="text-gold-400 font-bold text-xs">+{t.points}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!isDeduct && (selectedCategory === 'behavior' || isTeacher) && (
        <BehavioralRubricPanel
          activities={activities}
          onApply={handleRubricApply}
          activeCriterionId={activeRubricCriterion}
          activeTier={activeRubricTier}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card overflow-hidden">
          <div className="p-4 border-b border-white/5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-white/50 text-xs">الصف / المرحلة</label>
                <select
                  value={filterGrade}
                  onChange={(e) => {
                    setFilterGrade(e.target.value);
                    setFilterClass('');
                    if (!bulkMode) setSelectedStudents([]);
                  }}
                  className="w-full min-h-[48px] bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-gold-400/50"
                >
                  <option value="" className="bg-navy-900">
                    اختر الصف
                  </option>
                  {availableGrades.map((g) => (
                    <option key={g} value={g} className="bg-navy-900">
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-white/50 text-xs">الفصل</label>
                <select
                  value={filterClass}
                  onChange={(e) => {
                    setFilterClass(e.target.value);
                    if (!bulkMode) setSelectedStudents([]);
                  }}
                  disabled={!filterGrade}
                  className="w-full min-h-[48px] bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-gold-400/50 disabled:opacity-40"
                >
                  <option value="" className="bg-navy-900">
                    اختر الفصل
                  </option>
                  {availableClasses.map((c) => (
                    <option key={c} value={c} className="bg-navy-900">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {isTeacher && availableClasses.length > 1 && filterGrade && !filterClass && (
              <div className="flex flex-wrap gap-2">
                {availableClasses.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setFilterClass(c);
                      if (!bulkMode) setSelectedStudents([]);
                    }}
                    className={clsx(
                      'min-h-[44px] px-4 rounded-xl border text-sm font-semibold transition-colors',
                      filterClass === c
                        ? 'border-gold-500/30 bg-gold-500/10 text-gold-200'
                        : 'border-white/10 bg-white/5 text-white/60 hover:text-white',
                    )}
                  >
                    فصل {c}
                  </button>
                ))}
              </div>
            )}
            {!bulkMode && (
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="بحث بالاسم أو رقم القيد..."
              />
            )}
          </div>
          <div className="overflow-y-auto max-h-[min(60vh,480px)] p-3 space-y-3">
            {isTeacher && assignmentsLoading ? (
              <div className="p-6 flex justify-center">
                <BarsLoader label="جاري تحميل فصولك..." />
              </div>
            ) : isTeacher && teacherAssignments.length === 0 ? (
              <EmptyState
                illustration="students"
                title="لا فصول مسندة لحسابك"
                description="تواصل مع الإدارة لربط صفوفك وفصولك بملف المعلم"
              />
            ) : !filterGrade ? (
              <EmptyState
                illustration="students"
                title="اختر الصف"
                description={
                  isTeacher
                    ? 'حدد الصف ثم الفصل من القائمة أعلاه'
                    : 'حدد الصف ثم الفصل لعرض الطلاب'
                }
              />
            ) : !filterClass ? (
              <EmptyState
                illustration="students"
                title="اختر الفصل"
                description="اضغط أحد أزرار الفصل أعلاه أو اختر من القائمة"
              />
            ) : studentsLoading ? (
              <div className="p-6 flex justify-center">
                <BarsLoader label="جاري تحميل الطلاب..." />
              </div>
            ) : bulkMode ? (
              scopedStudents.length === 0 ? (
                <EmptyState
                  illustration="students"
                  title="لا يوجد طلاب في هذا الفصل"
                  description={
                    isTeacher
                      ? 'تحقق من تطابق اسم الصف/الفصل مع بيانات الطلاب'
                      : 'لا يوجد طلاب نشطون في هذا الفصل'
                  }
                />
              ) : (
                <div
                  className={clsx(
                    'rounded-2xl border p-5 space-y-3',
                    isDeduct ? 'bg-red-500/10 border-red-500/20' : 'bg-gold-500/10 border-gold-500/20',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={clsx(
                        'w-12 h-12 rounded-xl flex items-center justify-center',
                        isDeduct ? 'bg-red-500/20 text-red-300' : 'bg-gold-500/20 text-gold-300',
                      )}
                    >
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-bold text-base">
                        {filterGrade} — فصل {filterClass}
                      </p>
                      <p className="text-white/50 text-sm">
                        {scopedStudents.length} طالب — المنح للفصل كاملاً دون اختيار يدوي
                      </p>
                    </div>
                  </div>
                  <p className="text-white/40 text-xs leading-relaxed">
                    {isDeduct
                      ? 'سيُخصم من كل طلاب الفصل المحدد. للتخصيص لطالب واحد انتقل إلى الوضع الفردي.'
                      : 'سيُمنح كل طلاب هذا الفصل النقاط المختارة دفعة واحدة. للتخصيص لطالب واحد استخدم الوضع الفردي.'}
                  </p>
                </div>
              )
            ) : Object.keys(grouped).length === 0 ? (
              <EmptyState
                illustration="students"
                title="لا يوجد طلاب"
                description={
                  isTeacher
                    ? 'لا يوجد طلاب نشطون في هذا الفصل ضمن فصولك — تحقق من تطابق اسم الصف/الفصل مع بيانات الطلاب'
                    : 'لا يوجد طلاب نشطون في هذا الفصل'
                }
              />
            ) : (
              Object.entries(grouped).map(([className, classStudents]) => (
                <div key={className}>
                  <div className="flex items-center justify-between px-3 py-2 mb-1">
                    <span className="text-white/50 text-xs font-medium">{className}</span>
                  </div>
                  <div className="space-y-1">
                    {classStudents.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => toggleStudent(student.id)}
                        className={clsx(
                          'w-full flex items-center gap-3 px-3 py-3 min-h-[52px] rounded-xl transition-all text-right border',
                          selectedStudents.includes(student.id)
                            ? accentBg
                            : 'hover:bg-white/5 border-transparent'
                        )}
                      >
                        <div
                          className={clsx(
                            'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0',
                            selectedStudents.includes(student.id)
                              ? isDeduct
                                ? 'bg-red-400 text-white'
                                : 'bg-gold-400 text-navy-950'
                              : 'bg-white/10 text-white/60'
                          )}
                        >
                          {selectedStudents.includes(student.id) ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            student.full_name.charAt(0)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{student.full_name}</p>
                          <p className="text-white/30 text-xs">{student.admission_number}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card p-5 space-y-4 h-fit">
          <h2 className="text-white font-semibold flex items-center gap-2 text-sm">
            {isDeduct ? (
              <MinusCircle className={`w-4 h-4 ${accentClass}`} />
            ) : (
              <Award className={`w-4 h-4 ${accentClass}`} />
            )}
            {isDeduct ? 'تفاصيل الخصم' : 'تفاصيل المنح'}
          </h2>

          {selectedStudents.length > 0 && (
            <div
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-xl border',
                isDeduct ? 'bg-red-500/10 border-red-500/20' : 'bg-gold-500/10 border-gold-500/20'
              )}
            >
              {bulkMode ? (
                <Users className={`w-4 h-4 ${accentClass}`} />
              ) : (
                <User className={`w-4 h-4 ${accentClass}`} />
              )}
              <span className={`text-sm ${isDeduct ? 'text-red-300' : 'text-gold-300'}`}>
                {bulkMode
                  ? `الفصل كامل — ${selectedStudents.length} طالب`
                  : `${selectedStudents.length} طالب محدد`}
              </span>
            </div>
          )}

          {isStaff && (
            <div className="space-y-1.5">
              <label className="text-white/60 text-xs">المحور</label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value as PointAxisKey);
                  setSelectedActivity('');
                  setActiveTemplateId(null);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none"
              >
                {POINT_AXIS_OPTIONS.map((axis) => (
                  <option key={axis.key} value={axis.key} className="bg-navy-900">
                    {axis.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isDeduct && (
            <div className="flex rounded-xl border border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setActivitySource('catalog');
                  setManualActivityName('');
                }}
                className={clsx(
                  'flex-1 px-3 py-2 text-sm font-medium transition-colors',
                  activitySource === 'catalog'
                    ? 'bg-gold-500/20 text-gold-300'
                    : 'bg-white/5 text-white/50 hover:text-white/80',
                )}
              >
                من الكتالوج
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivitySource('manual');
                  setSelectedActivity('');
                  setActiveTemplateId(null);
                  setActiveRubricCriterion(null);
                  setActiveRubricTier(null);
                }}
                className={clsx(
                  'flex-1 px-3 py-2 text-sm font-medium transition-colors border-r border-white/10',
                  activitySource === 'manual'
                    ? 'bg-gold-500/20 text-gold-300'
                    : 'bg-white/5 text-white/50 hover:text-white/80',
                )}
              >
                نشاط يدوي
              </button>
            </div>
          )}

          {isManualActivity && !isDeduct ? (
            <div className="space-y-1.5">
              <label className="text-white/60 text-xs">اسم النشاط</label>
              <input
                type="text"
                value={manualActivityName}
                onChange={(e) => setManualActivityName(e.target.value)}
                placeholder="مثال: مشاركة في الإذاعة الصباحية"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 text-sm"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-white/60 text-xs">النشاط الفرعي</label>
              <select
                value={selectedActivity}
                onChange={(e) => {
                  setSelectedActivity(e.target.value);
                  setActiveTemplateId(null);
                }}
                disabled={isStaff && visibleActivities.length === 0}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none disabled:opacity-40"
              >
                <option value="" className="bg-navy-900">
                  {isStaff && visibleActivities.length === 0
                    ? 'لا توجد أنشطة في هذا المحور'
                    : 'اختر نشاطاً'}
                </option>
                {visibleActivities.map((a) => (
                  <option key={a.id} value={a.id} className="bg-navy-900">
                    {a.name} ({a.default_points} نقطة)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-white/60 text-xs">
              {isDeduct
                ? 'نقاط الخصم'
                : isManualActivity
                  ? 'النقاط'
                  : 'النقاط (اتركه فارغاً للافتراضي)'}
            </label>
            <input
              type="number"
              min={1}
              value={customPoints}
              onChange={(e) =>
                setCustomPoints(e.target.value === '' ? '' : Number(e.target.value))
              }
              placeholder={
                isManualActivity
                  ? 'أدخل النقاط'
                  : selectedActivityData
                    ? String(selectedActivityData.default_points)
                    : '0'
              }
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 text-sm"
            />
          </div>

          {!isDeduct && (
            <div className="space-y-1.5">
              <label className="text-white/60 text-xs flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                شواهد (اختياري — صور أو PDF)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                multiple
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  setEvidenceFiles((prev) => [...prev, ...picked].slice(0, 5));
                  e.target.value = '';
                }}
                className="w-full text-xs text-white/50 file:mr-3 file:rounded-lg file:border-0 file:bg-gold-500/20 file:px-3 file:py-2 file:text-gold-300 file:text-sm"
              />
              {evidenceFiles.length > 0 && (
                <ul className="space-y-1">
                  {evidenceFiles.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex items-center justify-between gap-2 text-xs text-white/60 bg-white/5 rounded-lg px-2 py-1.5"
                    >
                      <span className="truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEvidenceFiles((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="text-white/40 hover:text-red-300 shrink-0"
                        aria-label="إزالة الملف"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-white/35">حتى 5 ملفات، كل ملف حتى 10MB</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-white/60 text-xs">ملاحظة (اختياري)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={isDeduct ? 'سبب الخصم...' : 'سبب المنح...'}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 text-sm resize-none"
            />
          </div>

          {(selectedActivity || (isManualActivity && manualActivityName.trim())) &&
            selectedStudents.length > 0 && (
            <div className="p-3 bg-white/3 border border-white/5 rounded-xl">
              <p className="text-white/50 text-xs mb-1">{isDeduct ? 'ملخص الخصم' : 'ملخص المنح'}</p>
              <p className="text-white text-sm">
                {bulkMode ? 'الفصل كامل' : `${selectedStudents.length} طالب`} ×{' '}
                <span className={clsx('font-bold', accentClass)}>
                  {isDeduct ? '-' : '+'}
                  {Math.abs(signedPoints)} نقطة
                </span>
                {activityWeekOn && activityWeek && Number(basePoints) !== pointsToApply && (
                  <span className="text-amber-300/80 text-xs mr-1">
                    ({basePoints} × {activityWeek.multiplier})
                  </span>
                )}
              </p>
              <p className={clsx('font-bold text-lg mt-1', accentClass)}>
                = {isDeduct ? '-' : ''}
                {totalCost} نقطة إجمالي
                {bulkMode ? ` (${selectedStudents.length} طالب)` : ''}
              </p>
              {isTeacher && !isDeduct && (
                <p className="text-white/40 text-[10px] mt-1">سيُخصم من ميزانيتك فور الإرسال</p>
              )}
            </div>
          )}

          <Button
            className={clsx('w-full', isDeduct && '!bg-red-500/20 !border-red-500/30 hover:!bg-red-500/30')}
            size="lg"
            loading={grantMutation.isPending}
            disabled={
              (isManualActivity
                ? !manualActivityName.trim() || customPoints === '' || Number(customPoints) <= 0
                : !selectedActivity) ||
              selectedStudents.length === 0 ||
              !filterGrade ||
              !filterClass ||
              (isTeacher && teacherAssignments.length === 0)
            }
            onClick={() => grantMutation.mutate()}
          >
            {canDirectApprove
              ? isDeduct
                ? bulkMode
                  ? `خصم ${Math.abs(signedPoints)} نقطة من الفصل`
                  : `خصم ${Math.abs(signedPoints)} نقطة`
                : bulkMode
                  ? `منح الفصل ${pointsToApply} نقطة`
                  : `منح ${pointsToApply} نقطة`
              : isDeduct
                ? bulkMode
                  ? 'إرسال طلب خصم الفصل'
                  : 'إرسال طلب الخصم'
                : bulkMode
                  ? 'إرسال طلب منح الفصل'
                  : 'إرسال طلب النقاط'}
          </Button>
          <p className="text-white/30 text-xs text-center">
            {canDirectApprove
              ? 'تُطبَّق العملية فوراً على رصيد الطلاب'
              : 'سيتم إرسال الطلب للموافقة من المشرف'}
          </p>
        </div>
      </div>
    </div>
  );
}
