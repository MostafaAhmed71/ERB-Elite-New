import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, MessageSquare, ClipboardList, Pencil } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAction } from '../../lib/auth';
import { useAuthStore } from '../../stores/authStore';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { Modal } from '../../components/ui/Modal';
import { showSuccess, showError } from '../../lib/toast';
import { usePendingPointsCount } from '../../hooks/usePendingPointsCount';
import { fetchExamPointsPolicy } from '../../lib/examPointsPolicy';
import { REJECTION_REASON_TEMPLATES } from '../../lib/rejectionReasons';
import clsx from 'clsx';

interface PendingPoint {
  id: string;
  student_id: string;
  points: number;
  note: string | null;
  rejection_reason: string | null;
  status: string;
  created_at: string;
  academic_year: string;
  source: string;
  exam_result_id: string | null;
  students: { full_name: string; grade: string; class_name: string };
  granted_by_user: { full_name: string };
  activities: { name: string; category: string } | null;
  exam_results: {
    score: number;
    max_score: number;
    exams: { title: string; subject_name: string | null; grade: string | null } | null;
  } | null;
}

type FilterStatus = 'pending' | 'approved' | 'rejected';

const CATEGORY_LABELS: Record<string, string> = {
  activity: 'نشاط',
  behavior: 'سلوك',
  achievement: 'إنجاز',
  initiative: 'مبادرة',
};

type ApprovePointsPageProps = { embedded?: boolean };

export function ApprovePointsPage({ embedded = false }: ApprovePointsPageProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<string[] | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [editTarget, setEditTarget] = useState<PendingPoint | null>(null);
  const [editPoints, setEditPoints] = useState(0);
  const [teacherFilter, setTeacherFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data: examPolicy } = useQuery({
    queryKey: ['school-settings', 'exam_points_policy'],
    queryFn: fetchExamPointsPolicy,
  });

  const { data: pendingCount = 0 } = usePendingPointsCount(true);

  const { data: points = [], isLoading } = useQuery({
    queryKey: ['points_ledger', filter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_ledger')
        .select(`
          *,
          students:student_id(full_name, grade, class_name),
          granted_by_user:granted_by(full_name),
          activities:activity_id(name, category),
          exam_results:exam_result_id(
            score,
            max_score,
            exams:exam_id(title, subject_name, grade)
          )
        `)
        .eq('status', filter)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as PendingPoint[];
    },
  });

  const filterOptions = useMemo(() => {
    const teachers = new Set<string>();
    const grades = new Set<string>();
    const classes = new Set<string>();
    const categories = new Set<string>();
    for (const p of points) {
      if (p.granted_by_user?.full_name) teachers.add(p.granted_by_user.full_name);
      if (p.students?.grade) grades.add(p.students.grade);
      if (p.students?.class_name) classes.add(p.students.class_name);
      if (p.activities?.category) categories.add(p.activities.category);
    }
    return {
      teachers: [...teachers].sort(),
      grades: [...grades].sort(),
      classes: [...classes].sort(),
      categories: [...categories].sort(),
    };
  }, [points]);

  const visiblePoints = useMemo(() => {
    return points.filter((p) => {
      if (teacherFilter && p.granted_by_user?.full_name !== teacherFilter) return false;
      if (gradeFilter && p.students?.grade !== gradeFilter) return false;
      if (classFilter && p.students?.class_name !== classFilter) return false;
      if (categoryFilter && p.activities?.category !== categoryFilter) return false;
      return true;
    });
  }, [points, teacherFilter, gradeFilter, classFilter, categoryFilter]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['points_ledger'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    setSelected(new Set());
  };

  const approveMutation = useMutation({
    mutationFn: async ({ ids, pointsOverride }: { ids: string[]; pointsOverride?: Map<string, number> }) => {
      if (!user) throw new Error('غير مصرح');
      for (const id of ids) {
        const override = pointsOverride?.get(id);
        const payload: {
          status: 'approved';
          approved_by: string;
          approved_at: string;
          points?: number;
        } = {
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        };
        if (override !== undefined) {
          payload.points = override;
        }
        const { error } = await supabase.from('points_ledger').update(payload).eq('id', id);
        if (error) throw error;
        await logAction('POINTS_APPROVED', 'points_ledger', id, override !== undefined ? { points: override } : undefined);
      }
    },
    onSuccess: (_, { ids }) => {
      showSuccess(ids.length > 1 ? `تمت الموافقة على ${ids.length} طلب` : 'تمت الموافقة على النقاط');
      setEditTarget(null);
      invalidateAll();
    },
    onError: (e: Error) => showError(e),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason: string }) => {
      if (!user) throw new Error('غير مصرح');
      const { error } = await supabase
        .from('points_ledger')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason.trim(),
        })
        .in('id', ids);
      if (error) throw error;
      for (const id of ids) {
        await logAction('POINTS_REJECTED', 'points_ledger', id, { reason: reason.trim() });
      }
    },
    onSuccess: (_, { ids }) => {
      showSuccess(ids.length > 1 ? `تم رفض ${ids.length} طلب` : 'تم رفض النقاط');
      setRejectTarget(null);
      setRejectReason('');
      invalidateAll();
    },
    onError: (e: Error) => showError(e),
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === visiblePoints.length) setSelected(new Set());
    else setSelected(new Set(visiblePoints.map((p) => p.id)));
  };

  const handleApprove = (id: string, pointsOverride?: number) => {
    const map = pointsOverride !== undefined ? new Map([[id, pointsOverride]]) : undefined;
    approveMutation.mutate({ ids: [id], pointsOverride: map });
  };

  const handleApproveSelected = () => {
    approveMutation.mutate({ ids: [...selected] });
  };

  const handleApproveFiltered = () => {
    approveMutation.mutate({ ids: visiblePoints.map((p) => p.id) });
  };

  const handleApproveAll = () => {
    approveMutation.mutate({ ids: points.map((p) => p.id) });
  };

  const clearSmartFilters = () => {
    setTeacherFilter('');
    setGradeFilter('');
    setClassFilter('');
    setCategoryFilter('');
    setSelected(new Set());
  };

  const hasSmartFilters = !!(teacherFilter || gradeFilter || classFilter || categoryFilter);

  const openEditModal = (point: PendingPoint) => {
    setEditTarget(point);
    setEditPoints(point.points);
  };

  const handleEditApprove = () => {
    if (!editTarget || editPoints <= 0) return;
    handleApprove(editTarget.id, editPoints);
  };

  const handleRejectConfirm = () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    rejectMutation.mutate({ ids: rejectTarget, reason: rejectReason });
  };

  const canEditExamPoints = examPolicy?.allow_edit_before_approve !== false;

  const FILTER_OPTIONS: { key: FilterStatus; label: string; color: string; count?: number }[] = [
    {
      key: 'pending',
      label: 'قيد الانتظار',
      color: 'text-amber-400 border-amber-500/25 bg-amber-500/10',
      count: pendingCount,
    },
    {
      key: 'approved',
      label: 'موافق عليها',
      color: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10',
    },
    {
      key: 'rejected',
      label: 'مرفوضة',
      color: 'text-red-400 border-red-500/25 bg-red-500/10',
    },
  ];

  const emptyLabels: Record<FilterStatus, string> = {
    pending: 'لا توجد طلبات قيد الانتظار',
    approved: 'لا توجد طلبات موافق عليها',
    rejected: 'لا توجد طلبات مرفوضة',
  };

  const isAwaitingApproval = filter === 'pending';
  const hasSelection = selected.size > 0;
  const isMutating = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="space-y-6" dir="rtl">
      {!embedded && (
        <PageHeader
          title="الموافقة على النقاط"
          subtitle={`${visiblePoints.length} طلب معروض من ${points.length} ${isAwaitingApproval ? 'معلّق' : ''}`}
          icon={CheckCircle}
          badge={pendingCount > 0 ? `${pendingCount} معلّق` : undefined}
          actions={
            isAwaitingApproval && visiblePoints.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {hasSelection && (
                  <>
                    <Button
                      variant="secondary"
                      size="md"
                      icon={<CheckCircle className="w-4 h-4" />}
                      onClick={handleApproveSelected}
                      disabled={isMutating}
                      className="!text-emerald-400 !border-emerald-500/20 !bg-emerald-500/10"
                    >
                      موافقة المحدد ({selected.size})
                    </Button>
                    <Button
                      variant="danger"
                      size="md"
                      icon={<XCircle className="w-4 h-4" />}
                      onClick={() => setRejectTarget([...selected])}
                      disabled={isMutating}
                    >
                      رفض المحدد ({selected.size})
                    </Button>
                  </>
                )}
                {hasSmartFilters && (
                  <Button
                    variant="secondary"
                    size="md"
                    icon={<CheckCircle className="w-4 h-4" />}
                    onClick={handleApproveFiltered}
                    disabled={isMutating}
                    className="!text-cyan-400 !border-cyan-500/20 !bg-cyan-500/10"
                  >
                    اعتماد المصفّى ({visiblePoints.length})
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="md"
                  icon={<CheckCircle className="w-4 h-4" />}
                  onClick={handleApproveAll}
                  disabled={isMutating}
                >
                  الموافقة على الكل ({points.length})
                </Button>
              </div>
            ) : undefined
          }
        />
      )}

      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map(({ key, label, color, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setFilter(key);
              setSelected(new Set());
              clearSmartFilters();
            }}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all',
              filter === key
                ? color
                : 'border-white/10 text-white/40 hover:text-white/70 bg-transparent'
            )}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-amber-400 text-navy-950 text-[10px] font-bold rounded-full">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        ))}
      </div>

      {isAwaitingApproval && points.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center p-3 rounded-xl border border-white/10 bg-white/[0.03]">
          <span className="text-white/40 text-xs font-medium ml-1">تصفية ذكية:</span>
          <select
            value={teacherFilter}
            onChange={(e) => { setTeacherFilter(e.target.value); setSelected(new Set()); }}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs"
          >
            <option value="" className="bg-navy-900">كل المعلمين</option>
            {filterOptions.teachers.map((t) => (
              <option key={t} value={t} className="bg-navy-900">{t}</option>
            ))}
          </select>
          <select
            value={gradeFilter}
            onChange={(e) => { setGradeFilter(e.target.value); setSelected(new Set()); }}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs"
          >
            <option value="" className="bg-navy-900">كل الصفوف</option>
            {filterOptions.grades.map((g) => (
              <option key={g} value={g} className="bg-navy-900">{g}</option>
            ))}
          </select>
          <select
            value={classFilter}
            onChange={(e) => { setClassFilter(e.target.value); setSelected(new Set()); }}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs"
          >
            <option value="" className="bg-navy-900">كل الفصول</option>
            {filterOptions.classes.map((c) => (
              <option key={c} value={c} className="bg-navy-900">{c}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setSelected(new Set()); }}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs"
          >
            <option value="" className="bg-navy-900">كل المحاور</option>
            {filterOptions.categories.map((c) => (
              <option key={c} value={c} className="bg-navy-900">{CATEGORY_LABELS[c] ?? c}</option>
            ))}
          </select>
          {hasSmartFilters && (
            <button
              type="button"
              onClick={clearSmartFilters}
              className="text-xs text-gold-400 hover:text-gold-300 px-2"
            >
              مسح التصفية
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <TapHandLoader label="جاري تحميل الطلبات..." fullScreen />
      ) : points.length === 0 ? (
        <EmptyState
          illustration="points"
          title={emptyLabels[filter]}
          description="ستظهر طلبات منح النقاط هنا عند إرسالها من المعلمين"
        />
      ) : visiblePoints.length === 0 ? (
        <EmptyState
          illustration="points"
          title="لا توجد طلبات تطابق التصفية"
          description="جرّب تغيير معايير التصفية أو امسحها لعرض كل الطلبات"
        />
      ) : (
        <div className="space-y-3">
          {isAwaitingApproval && visiblePoints.length > 1 && (
            <label className="flex items-center gap-2 px-2 text-white/40 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={selected.size === visiblePoints.length && visiblePoints.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-white/20 bg-navy-900 text-gold-400 focus:ring-gold-400/30"
              />
              تحديد المعروض ({visiblePoints.length})
            </label>
          )}

          {visiblePoints.map((point) => {
            const isExam = point.source === 'exam';
            const examMeta = point.exam_results;
            const examPercent =
              examMeta && examMeta.max_score > 0
                ? Math.round((examMeta.score / examMeta.max_score) * 100)
                : null;

            return (
            <div
              key={point.id}
              className={clsx(
                'glass-card p-4 flex items-center gap-4 flex-wrap sm:flex-nowrap transition-all',
                selected.has(point.id) && 'ring-1 ring-gold-400/30 bg-gold-500/5'
              )}
            >
              {isAwaitingApproval && (
                <input
                  type="checkbox"
                  checked={selected.has(point.id)}
                  onChange={() => toggleSelect(point.id)}
                  className="rounded border-white/20 bg-navy-900 text-gold-400 focus:ring-gold-400/30 shrink-0"
                />
              )}
              <div
                className={clsx(
                  'w-12 h-12 rounded-xl border flex flex-col items-center justify-center flex-shrink-0',
                  point.points < 0
                    ? 'bg-red-500/10 border-red-500/20'
                    : 'bg-gold-500/10 border-gold-500/20'
                )}
              >
                <span
                  className={clsx(
                    'font-bold text-lg',
                    point.points < 0 ? 'text-red-400' : 'text-gold-400'
                  )}
                >
                  {point.points > 0 ? `+${point.points}` : point.points}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-medium">
                    {point.students?.full_name ?? 'غير معروف'}
                  </p>
                  {isExam && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      <ClipboardList className="w-3 h-3" />
                      اقتراح اختبار
                    </span>
                  )}
                </div>
                <p className="text-white/40 text-xs mt-0.5">
                  {point.students?.grade} — {point.students?.class_name} •{' '}
                  {point.activities?.name ?? 'نشاط عام'}
                  {!isExam && ` • بواسطة: ${point.granted_by_user?.full_name ?? '—'}`}
                </p>
                {isExam && examMeta?.exams && (
                  <p className="text-purple-300/80 text-xs mt-1">
                    {examMeta.exams.title}
                    {examMeta.exams.subject_name ? ` — ${examMeta.exams.subject_name}` : ''}
                    {examPercent !== null
                      ? ` • ${examMeta.score}/${examMeta.max_score} (${examPercent}%)`
                      : ''}
                  </p>
                )}
                {point.note && (
                  <p className="text-white/30 text-xs mt-1 italic">&ldquo;{point.note}&rdquo;</p>
                )}
                {filter === 'rejected' && point.rejection_reason && (
                  <p className="text-red-400/80 text-xs mt-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 shrink-0" />
                    {point.rejection_reason}
                  </p>
                )}
              </div>
              <div className="text-white/30 text-xs flex-shrink-0">
                {new Date(point.created_at).toLocaleDateString('ar-SA')}
              </div>
              {isAwaitingApproval && (
                <div className="flex gap-2 flex-shrink-0">
                  {isExam && canEditExamPoints && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEditModal(point)}
                      disabled={isMutating}
                      title="تعديل النقاط"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleApprove(point.id)}
                    disabled={isMutating}
                    className="!text-emerald-400 !border-emerald-500/20 !bg-emerald-500/10"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setRejectTarget([point.id])}
                    disabled={isMutating}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {!isAwaitingApproval && (
                <span
                  className={clsx(
                    'px-3 py-1 rounded-full text-xs border flex-shrink-0',
                    filter === 'approved'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                      : 'bg-red-500/10 text-red-400 border-red-500/25'
                  )}
                >
                  {filter === 'approved' ? 'موافق' : 'مرفوض'}
                </span>
              )}
            </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!rejectTarget}
        onClose={() => {
          setRejectTarget(null);
          setRejectReason('');
        }}
        title="سبب الرفض"
        size="sm"
      >
        <div className="p-5 space-y-4">
          <p className="text-white/50 text-sm">سيظهر سبب الرفض للمعلم في الإشعار وفي سجل النقاط.</p>
          <div className="flex flex-wrap gap-2">
            {REJECTION_REASON_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setRejectReason(t.text)}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                {t.label}
              </button>
            ))}
          </div>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="مثال: النقاط تتجاوز الحد المسموح لهذا النشاط..."
            rows={3}
            className="w-full bg-navy-950/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-gold-400/40 resize-none"
            autoFocus
          />
          <div className="flex gap-3">
            <Button
              variant="danger"
              className="flex-1"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={handleRejectConfirm}
            >
              تأكيد الرفض
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason('');
              }}
            >
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="تعديل النقاط المقترحة"
        size="sm"
      >
        {editTarget && (
          <div className="p-5 space-y-4">
            <p className="text-white/50 text-sm">
              اقتراح من اختبار — {editTarget.students?.full_name}
            </p>
            <label className="block space-y-1">
              <span className="text-white/50 text-xs">النقاط قبل الاعتماد</span>
              <input
                type="number"
                min={1}
                value={editPoints}
                onChange={(e) => setEditPoints(Math.max(1, Number(e.target.value) || 1))}
                className="w-full bg-navy-950/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
              />
            </label>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={editPoints <= 0 || approveMutation.isPending}
                onClick={handleEditApprove}
              >
                اعتماد بالقيمة المعدّلة
              </Button>
              <Button variant="secondary" onClick={() => setEditTarget(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
