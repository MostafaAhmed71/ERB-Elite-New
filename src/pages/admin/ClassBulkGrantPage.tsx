import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Award, AlertCircle, CheckCircle2, MinusCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { logAction } from '../../lib/auth';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Card';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { showSuccess, showError } from '../../lib/toast';
import {
  fetchActivityWeek,
  isActivityWeekActive,
  applyActivityWeekMultiplier,
} from '../../lib/activityWeek';
import { useGradeClassCatalog } from '../../hooks/useGradeClassCatalog';
import { POINT_AXIS_OPTIONS, AXES_KEYS, type PointAxisKey } from '../../lib/pointsReference';
import {
  filterOlympiadMiddleGrades,
  isOlympiadMiddleGrade,
} from '../../lib/olympiadMiddleScope';
import type { DbActivity, DbStudent } from '../../types';
import clsx from 'clsx';

type BulkMode = 'grant' | 'deduct';

export function ClassBulkGrantPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<BulkMode>('grant');
  const isDeduct = mode === 'deduct';

  const [grade, setGrade] = useState('');
  const [className, setClassName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PointAxisKey>('activity');
  const [activityId, setActivityId] = useState('');
  const [points, setPoints] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const { data: catalog, isLoading: catalogLoading } = useGradeClassCatalog();
  const middleGrades = useMemo(
    () => filterOlympiadMiddleGrades(catalog?.grades ?? []),
    [catalog?.grades],
  );
  const classOptions = grade
    ? catalog?.classesByGrade[grade] ?? catalog?.allClasses ?? []
    : [];

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['bulk-grant', 'students', grade, className],
    queryFn: async () => {
      if (!isOlympiadMiddleGrade(grade)) return [];
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .eq('grade', grade)
        .eq('class_name', className)
        .order('full_name');
      if (error) throw error;
      return data as DbStudent[];
    },
    enabled: !!grade && !!className && isOlympiadMiddleGrade(grade),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as DbActivity[];
    },
  });

  const { data: activityWeek } = useQuery({
    queryKey: ['activity-week'],
    queryFn: fetchActivityWeek,
    enabled: !isDeduct,
  });

  const bulkAxisOptions = useMemo(
    () => POINT_AXIS_OPTIONS.filter((axis) => axis.key !== 'attendance'),
    []
  );

  const visibleActivities = useMemo(
    () => activities.filter((a) => a.category === selectedCategory),
    [activities, selectedCategory]
  );

  useEffect(() => {
    if (activityId && !visibleActivities.some((a) => a.id === activityId)) {
      setActivityId('');
      setConfirmed(false);
    }
  }, [activityId, visibleActivities]);

  useEffect(() => {
    setConfirmed(false);
  }, [mode]);

  const selectedActivity = activities.find((a) => a.id === activityId);
  const basePoints = points !== '' ? points : (selectedActivity?.default_points ?? 0);
  const activityWeekOn =
    !isDeduct &&
    activityWeek &&
    isActivityWeekActive(activityWeek) &&
    selectedActivity?.category === 'activity';
  const magnitude =
    activityWeekOn && activityWeek
      ? applyActivityWeekMultiplier(Number(basePoints), activityWeek)
      : Number(basePoints);
  const signedPoints = isDeduct ? -Math.abs(magnitude) : Math.abs(magnitude);

  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('غير مصرح');
      if (!activityId) throw new Error('اختر نشاطاً');
      if (students.length === 0) throw new Error('لا يوجد طلاب في هذا الفصل');
      if (magnitude <= 0) throw new Error('النقاط يجب أن تكون أكبر من صفر');

      const defaultNote = isDeduct
        ? `خصم جماعي للفصل — ${grade} فصل ${className}`
        : `منح جماعي للفصل — ${grade} فصل ${className}`;

      const { error } = await supabase.from('class_points_ledger').insert({
        grade,
        class_name: className,
        granted_by: user.id,
        activity_id: activityId,
        points: signedPoints,
        note: note || defaultNote,
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        first_approved_by: user.id,
        first_approved_at: new Date().toISOString(),
        rejection_reason: null,
        academic_year: new Date().getFullYear().toString(),
        source: 'bulk',
      });
      if (error) throw error;

      await logAction(
        isDeduct ? 'BULK_CLASS_DEDUCT' : 'BULK_CLASS_GRANT',
        'class_points_ledger',
        undefined,
        {
          grade,
          class_name: className,
          students: students.length,
          points: signedPoints,
          activity: activityId,
        },
      );
    },
    onSuccess: () => {
      const actionLabel = isDeduct ? 'خصم' : 'منح';
      showSuccess(`تم ${actionLabel} ${magnitude} نقطة لفصل ${className} بنجاح`);
      setConfirmed(false);
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['points_ledger'] });
      queryClient.invalidateQueries({ queryKey: ['class_points_ledger'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard_classes'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'leaderboard', 'class-bulk'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'classes-report'] });
    },
    onError: (e: Error) => showError(e),
  });

  const isLoading = catalogLoading;
  const accentBox = isDeduct
    ? 'rounded-xl bg-red-500/10 border border-red-500/20 p-4 space-y-2'
    : 'rounded-xl bg-gold-500/10 border border-gold-500/20 p-4 space-y-2';
  const accentText = isDeduct ? 'text-red-300' : 'text-gold-300';

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="نقاط جماعية للفصل"
        subtitle={
          isDeduct
            ? 'خصم نقاط من الفصل كوحدة واحدة — أولمبياد المرحلة المتوسطة فقط'
            : 'منح نقاط للفصل كوحدة واحدة — أولمبياد المرحلة المتوسطة فقط'
        }
        icon={Users}
        guidePath="/admin/bulk-grant"
      />

      <div
        className="flex rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_3%,transparent)] p-1 gap-1 max-w-md"
        role="tablist"
        aria-label="نوع العملية الجماعية"
      >
        <button
          type="button"
          role="tab"
          aria-selected={!isDeduct}
          onClick={() => setMode('grant')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold min-h-[44px] transition-colors',
            !isDeduct
              ? 'bg-[var(--primary)] text-white dark:bg-[var(--accent)] dark:text-navy-950'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
          )}
        >
          <Award className="w-4 h-4" />
          منح جماعي
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isDeduct}
          onClick={() => setMode('deduct')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold min-h-[44px] transition-colors',
            isDeduct
              ? 'bg-red-600 text-white'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
          )}
        >
          <MinusCircle className="w-4 h-4" />
          خصم جماعي
        </button>
      </div>

      {isLoading ? (
        <TapHandLoader label="جاري التحميل..." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel className="p-5 space-y-4">
            <h3 className="text-white font-semibold text-sm">اختيار الفصل والنشاط</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/50 text-xs mb-1 block">الصف</label>
                <select
                  value={grade}
                  onChange={(e) => {
                    setGrade(e.target.value);
                    setClassName('');
                    setConfirmed(false);
                  }}
                  className="w-full bg-navy-900/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold-400/40"
                >
                  <option value="">اختر الصف</option>
                  {middleGrades.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">الفصل</label>
                <select
                  value={className}
                  onChange={(e) => {
                    setClassName(e.target.value);
                    setConfirmed(false);
                  }}
                  disabled={!grade}
                  className="w-full bg-navy-900/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold-400/40 disabled:opacity-40"
                >
                  <option value="">اختر الفصل</option>
                  {classOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-white/50 text-xs mb-1 block">محور التميز</label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value as PointAxisKey);
                  setActivityId('');
                  setConfirmed(false);
                }}
                className="w-full bg-navy-900/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold-400/40"
              >
                {bulkAxisOptions.map((axis) => (
                  <option key={axis.key} value={axis.key}>
                    {axis.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-white/50 text-xs mb-1 block">النشاط الفرعي</label>
              <select
                value={activityId}
                onChange={(e) => {
                  setActivityId(e.target.value);
                  setConfirmed(false);
                }}
                disabled={visibleActivities.length === 0}
                className="w-full bg-navy-900/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold-400/40 disabled:opacity-40"
              >
                <option value="">
                  {visibleActivities.length === 0
                    ? `لا توجد أنشطة في محور ${AXES_KEYS[selectedCategory]}`
                    : 'اختر النشاط الفرعي'}
                </option>
                {visibleActivities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.default_points} نقطة)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-white/50 text-xs mb-1 block">
                {isDeduct ? 'نقاط الخصم من الفصل' : 'نقاط الفصل (فارغ = الافتراضي)'}
              </label>
              <input
                type="number"
                min={1}
                value={points}
                onChange={(e) => {
                  setPoints(e.target.value === '' ? '' : Number(e.target.value));
                  setConfirmed(false);
                }}
                placeholder={String(selectedActivity?.default_points ?? '')}
                className="w-full bg-navy-900/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold-400/40"
              />
              {activityWeekOn && (
                <p className="text-amber-400 text-xs mt-1">
                  أسبوع النشاط: {basePoints} → {magnitude} نقطة
                </p>
              )}
            </div>

            <div>
              <label className="text-white/50 text-xs mb-1 block">ملاحظة (اختياري)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={isDeduct ? 'سبب الخصم الجماعي...' : 'سبب المنح الجماعي...'}
                className="w-full bg-navy-900/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold-400/40"
              />
            </div>
          </Panel>

          <Panel className="p-5 space-y-4">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              {isDeduct ? (
                <MinusCircle className="w-4 h-4 text-red-400" />
              ) : (
                <Award className="w-4 h-4 text-gold-400" />
              )}
              {isDeduct ? 'معاينة الخصم' : 'معاينة المنح'}
            </h3>

            {!grade || !className ? (
              <p className="text-white/30 text-sm py-8 text-center">اختر الصف والفصل لعرض المعاينة</p>
            ) : studentsLoading ? (
              <TapHandLoader label="جاري جلب الطلاب..." />
            ) : students.length === 0 ? (
              <div className="flex items-center gap-2 text-amber-400 text-sm py-4">
                <AlertCircle className="w-4 h-4" />
                لا يوجد طلاب في هذا الفصل
              </div>
            ) : (
              <>
                <div className={accentBox}>
                  <p className={clsx('font-bold text-lg', accentText)}>
                    {isDeduct ? '−' : '+'}
                    {magnitude} نقطة للفصل
                  </p>
                  <p className="text-white/50 text-sm">
                    {students.length} طالب في الفصل — النقاط تُحسب للفصل ككل
                  </p>
                  <p className="text-white/40 text-xs">
                    {grade} — فصل {className}
                    {selectedActivity && (
                      <>
                        {' — '}
                        محور {AXES_KEYS[selectedCategory]}: {selectedActivity.name}
                      </>
                    )}
                  </p>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  <p className="px-1 text-[10px] text-white/35">طلاب الفصل (للمراجعة فقط)</p>
                  {students.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/3 text-sm"
                    >
                      <span className="text-white">{s.full_name}</span>
                      <span className="text-white/30 text-xs">—</span>
                    </div>
                  ))}
                </div>

                {!confirmed ? (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => setConfirmed(true)}
                    disabled={!activityId || magnitude <= 0}
                  >
                    تأكيد المعاينة
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    className={clsx(
                      'w-full',
                      isDeduct && '!bg-red-500/20 !border-red-500/30 hover:!bg-red-500/30',
                    )}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => grantMutation.mutate()}
                    disabled={grantMutation.isPending}
                  >
                    {grantMutation.isPending
                      ? isDeduct
                        ? 'جاري الخصم...'
                        : 'جاري المنح...'
                      : isDeduct
                        ? `خصم ${magnitude} نقطة من فصل ${className}`
                        : `منح ${magnitude} نقطة لفصل ${className}`}
                  </Button>
                )}
              </>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
