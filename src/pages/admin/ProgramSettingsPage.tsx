import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, Plus, Trash2, Zap, Trophy, Calendar, Award } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import {
  fetchAxisWeights,
  fetchExcellenceLevels,
  fetchGradeClassCatalog,
  getLevelInfoFromConfig,
  saveExcellenceLevels,
  saveSchoolSetting,
  normalizeWeights,
  type ExcellenceLevel,
  type GradeClassCatalog,
  DEFAULT_AXIS_WEIGHTS,
  DEFAULT_EXCELLENCE_LEVELS,
  normalizeExcellenceLevels,
} from '../../lib/schoolConfig';
import type { AxisWeights } from '../../lib/calculations';
import { fetchActivityWeek, saveActivityWeek, newScheduleSlot, type ActivityWeekConfig } from '../../lib/activityWeek';
import {
  fetchSchoolCalendarEvents,
  saveSchoolCalendarEvents,
  SCHOOL_EVENT_TYPE_LABELS,
  type SchoolCalendarEvent,
  type SchoolEventType,
} from '../../lib/schoolCalendar';
import { OLYMPIAD_TEMPLATES, applyOlympiadTemplate, fetchOlympiadConfig } from '../../lib/olympiadConfig';
import { fetchPointsPolicy, type PointsPolicy } from '../../lib/pointsPolicy';
import {
  fetchTeacherPointsLimits,
  saveTeacherPointsLimits,
  fetchTeacherLimitRows,
  saveTeacherLimitRows,
  applyDefaultLimitsToAllTeachers,
  DEFAULT_TEACHER_POINTS_LIMITS,
  type TeacherPointsLimits,
  type TeacherLimitRow,
} from '../../lib/teacherPointsLimits';
import {
  fetchExamPointsPolicy,
  saveExamPointsPolicy,
  DEFAULT_EXAM_POINTS_POLICY,
  type ExamPointsPolicy,
} from '../../lib/examPointsPolicy';
import { TeacherLimitsSettings } from '../../components/admin/TeacherLimitsSettings';
import { ExamPointsPolicySettings } from '../../components/admin/ExamPointsPolicySettings';
import { SmsAlertsSettingsPanel } from '../../components/admin/SmsAlertsSettingsPanel';
import { OfficialCertificateSettingsPanel } from '../../components/admin/OfficialCertificateSettingsPanel';
import { FeatureVisibilityPanel } from '../../components/admin/FeatureVisibilityPanel';
import {
  ACHIEVEMENT_THRESHOLD_FIELDS,
  DEFAULT_ACHIEVEMENT_THRESHOLDS,
  fetchAchievementThresholds,
  normalizeAchievementThresholds,
  saveAchievementThresholds,
  type AchievementThresholds,
} from '../../lib/achievementConfig';
import { computeAchievements } from '../../lib/achievements';
import { showSuccess, showError } from '../../lib/toast';
import clsx from 'clsx';

type Tab =
  | 'olympiad'
  | 'activity_week'
  | 'school_calendar'
  | 'weights'
  | 'levels'
  | 'badges'
  | 'classes'
  | 'policy'
  | 'teacher_limits'
  | 'exam_points'
  | 'sms_alerts'
  | 'certificates'
  | 'visibility';

export function ProgramSettingsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('olympiad');
  const [weights, setWeights] = useState<AxisWeights>({ ...DEFAULT_AXIS_WEIGHTS });
  const [levels, setLevels] = useState<ExcellenceLevel[]>([...DEFAULT_EXCELLENCE_LEVELS]);
  const [catalog, setCatalog] = useState<GradeClassCatalog>({ grades: [], classes: [] });
  const [newGrade, setNewGrade] = useState('');
  const [newClass, setNewClass] = useState('');
  const [activityWeek, setActivityWeek] = useState<ActivityWeekConfig>({
    active: false,
    multiplier: 2,
    label: 'أسبوع النشاط',
    starts_at: null,
    ends_at: null,
    scheduled: [],
  });
  const [olympiadId, setOlympiadId] = useState('olympiad_1448');
  const [pointsPolicy, setPointsPolicy] = useState<PointsPolicy>({
    behavior_weekly_cap: 50,
    activity_per_term_max: 2,
  });
  const [teacherLimits, setTeacherLimits] = useState<TeacherPointsLimits>({
    ...DEFAULT_TEACHER_POINTS_LIMITS,
  });
  const [teacherLimitRows, setTeacherLimitRows] = useState<TeacherLimitRow[]>([]);
  const [applyDefaultsToAll, setApplyDefaultsToAll] = useState(false);
  const [examPointsPolicy, setExamPointsPolicy] = useState<ExamPointsPolicy>({
    ...DEFAULT_EXAM_POINTS_POLICY,
  });
  const [calendarEvents, setCalendarEvents] = useState<SchoolCalendarEvent[]>([]);
  const [badgeThresholds, setBadgeThresholds] = useState<AchievementThresholds>({
    ...DEFAULT_ACHIEVEMENT_THRESHOLDS,
  });

  const { isLoading } = useQuery({
    queryKey: ['program-settings'],
    queryFn: async () => {
      const [w, l, c, aw, oc, pp, tl, ep, teacherRows, cal, badges] = await Promise.all([
        fetchAxisWeights(),
        fetchExcellenceLevels(),
        fetchGradeClassCatalog(),
        fetchActivityWeek(),
        fetchOlympiadConfig(),
        fetchPointsPolicy(),
        fetchTeacherPointsLimits(),
        fetchExamPointsPolicy(),
        fetchTeacherLimitRows(),
        fetchSchoolCalendarEvents(),
        fetchAchievementThresholds(),
      ]);
      setWeights(w);
      setLevels(normalizeExcellenceLevels(l));
      setCatalog(c);
      setActivityWeek(aw);
      setOlympiadId(oc.id);
      setPointsPolicy(pp);
      setTeacherLimits(tl);
      setExamPointsPolicy(ep);
      setTeacherLimitRows(teacherRows);
      setBadgeThresholds(badges);
      setCalendarEvents(cal);
      setApplyDefaultsToAll(false);
      return { w, l, c, aw, oc, pp, tl, ep, teacherRows, cal };
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: () => applyOlympiadTemplate(olympiadId),
    onSuccess: (template) => {
      setWeights(template.weights);
      setLevels(template.levels);
      queryClient.invalidateQueries({ queryKey: ['program-settings'] });
      queryClient.invalidateQueries({ queryKey: ['school-settings'] });
      queryClient.invalidateQueries({ queryKey: ['school-calendar-events'] });
      showSuccess(`تم تطبيق قالب «${template.name}»`);
    },
    onError: (e: Error) => showError(e),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const normalized = normalizeWeights(weights);
      await saveSchoolSetting('axis_weights', normalized);
      await saveExcellenceLevels(levels);
      await saveSchoolSetting('grade_class_catalog', catalog);
      await saveActivityWeek(activityWeek);
      await saveSchoolCalendarEvents(calendarEvents);
      await saveSchoolSetting('points_policy', pointsPolicy);
      await saveTeacherPointsLimits(teacherLimits);
      await saveExamPointsPolicy(examPointsPolicy);
      await saveAchievementThresholds(badgeThresholds);

      if (applyDefaultsToAll) {
        await applyDefaultLimitsToAllTeachers(teacherLimits);
      } else {
        await saveTeacherLimitRows(teacherLimitRows);
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(
        ['school-settings', 'achievement-thresholds'],
        normalizeAchievementThresholds(badgeThresholds),
      );
      queryClient.invalidateQueries({ queryKey: ['school-settings'] });
      queryClient.invalidateQueries({ queryKey: ['school-calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['principal', 'executive'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'teachers-report'] });
      queryClient.invalidateQueries({ queryKey: ['teacher', 'quota'] });
      queryClient.setQueryData(['school-settings', 'excellence-levels'], levels);
      queryClient.invalidateQueries({ queryKey: ['student-metrics'] });
      setApplyDefaultsToAll(false);
      showSuccess('تم حفظ إعدادات البرنامج');
    },
    onError: (e: Error) => showError(e),
  });

  const levelsSaveMutation = useMutation({
    mutationFn: () => saveExcellenceLevels(levels),
    onSuccess: (saved) => {
      setLevels(saved);
      queryClient.setQueryData(['school-settings', 'excellence-levels'], saved);
      queryClient.invalidateQueries({ queryKey: ['student-metrics'] });
      showSuccess('تم حفظ مستويات التميز');
    },
    onError: (e: Error) => showError(e),
  });

  const badgeSaveMutation = useMutation({
    mutationFn: () => saveAchievementThresholds(badgeThresholds),
    onSuccess: (saved) => {
      setBadgeThresholds(saved);
      queryClient.setQueryData(['school-settings', 'achievement-thresholds'], saved);
      queryClient.invalidateQueries({ queryKey: ['student-metrics'] });
      showSuccess('تم حفظ عتبات الشارات');
    },
    onError: (e: Error) => showError(e),
  });

  const weightSum = Math.round(
    (weights.activity + weights.behavior + weights.achievement + weights.initiative + weights.attendance) * 100
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: 'olympiad', label: 'قالب الأولمبياد' },
    { id: 'activity_week', label: 'أسبوع النشاط' },
    { id: 'school_calendar', label: 'التقويم المدرسي' },
    { id: 'weights', label: 'أوزان المحاور' },
    { id: 'levels', label: 'مستويات التميز' },
    { id: 'badges', label: 'الشارات' },
    { id: 'classes', label: 'الصفوف والفصول' },
    { id: 'policy', label: 'سياسة النقاط' },
    { id: 'teacher_limits', label: 'حدود المعلمين' },
    { id: 'exam_points', label: 'نقاط الاختبارات' },
    { id: 'sms_alerts', label: 'SMS / واتساب' },
    { id: 'certificates', label: 'الشهادات الرسمية' },
    { id: 'visibility', label: 'ظهور الميزات' },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="إعدادات البرنامج"
        subtitle="قالب الأولمبياد، أوزان المحاور، حدود المعلمين، ربط الاختبارات، وسياسة النقاط"
        icon={Settings}
        guidePath="/admin/settings"
        actions={
          <Button
            icon={<Save className="w-4 h-4" />}
            onClick={() => saveMutation.mutate()}
            disabled={
              saveMutation.isPending ||
              (tab === 'weights' && weightSum !== 100) ||
              (tab === 'exam_points' && examPointsPolicy.enabled && !examPointsPolicy.activity_id)
            }
          >
            {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </Button>
        }
      />

      <div className="flex gap-2 border-b border-white/5 pb-0.5 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={clsx(
              'px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-all',
              tab === t.id ? 'border-gold-400 text-gold-400' : 'border-transparent text-white/40 hover:text-white/70'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="glass-card p-12 flex justify-center">
          <TapHandLoader label="جاري تحميل الإعدادات..." />
        </div>
      ) : (
        <div className="glass-card p-6 space-y-4">
          {tab === 'olympiad' && (
            <div className="space-y-4">
              <p className="text-white/50 text-sm">اختر قالباً جاهزاً — يُحدّث الأوزان والمستويات تلقائياً</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {OLYMPIAD_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setOlympiadId(t.id)}
                    className={clsx(
                      'text-right p-4 rounded-xl border transition-all',
                      olympiadId === t.id
                        ? 'border-gold-400/50 bg-gold-500/10'
                        : 'border-white/10 bg-white/3 hover:border-white/20'
                    )}
                  >
                    <p className="text-white font-semibold text-sm flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-gold-400" />
                      {t.name}
                    </p>
                    <p className="text-white/40 text-xs mt-1">{t.description}</p>
                  </button>
                ))}
              </div>
              <Button
                onClick={() => applyTemplateMutation.mutate()}
                disabled={applyTemplateMutation.isPending}
              >
                تطبيق القالب المحدد
              </Button>
            </div>
          )}

          {tab === 'activity_week' && (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activityWeek.active}
                  onChange={(e) => setActivityWeek((c) => ({ ...c, active: e.target.checked }))}
                  className="rounded border-white/20"
                />
                <Zap className="w-4 h-4 text-amber-400" />
                تفعيل {activityWeek.label} الآن
              </label>
              <label className="block space-y-1">
                <span className="text-white/50 text-xs">مضاعف النقاط</span>
                <input
                  type="number"
                  min={1.5}
                  max={5}
                  step={0.5}
                  value={activityWeek.multiplier}
                  onChange={(e) => setActivityWeek((c) => ({ ...c, multiplier: Number(e.target.value) }))}
                  className="w-full max-w-xs bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-white/50 text-xs">تاريخ البدء (اختياري)</span>
                <input
                  type="datetime-local"
                  value={activityWeek.starts_at ? activityWeek.starts_at.slice(0, 16) : ''}
                  onChange={(e) =>
                    setActivityWeek((c) => ({
                      ...c,
                      starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                    }))
                  }
                  className="w-full max-w-xs bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-white/50 text-xs">تاريخ الانتهاء</span>
                <input
                  type="datetime-local"
                  value={activityWeek.ends_at ? activityWeek.ends_at.slice(0, 16) : ''}
                  onChange={(e) =>
                    setActivityWeek((c) => ({
                      ...c,
                      ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                    }))
                  }
                  className="w-full max-w-xs bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                />
              </label>

              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-white/70 text-sm font-medium">جدولة مسبقة — AL6</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() =>
                      setActivityWeek((c) => ({
                        ...c,
                        scheduled: [...c.scheduled, newScheduleSlot()],
                      }))
                    }
                  >
                    إضافة أسبوع
                  </Button>
                </div>
                {activityWeek.scheduled.length === 0 ? (
                  <p className="text-white/30 text-xs">لا توجد أسابيع مجدولة — يُفعَّل تلقائياً عند حلول الموعد</p>
                ) : (
                  activityWeek.scheduled.map((slot, i) => (
                    <div key={slot.id} className="p-4 rounded-xl border border-white/10 bg-white/3 space-y-2">
                      <div className="flex gap-2 items-center">
                        <input
                          value={slot.label}
                          onChange={(e) => {
                            const next = [...activityWeek.scheduled];
                            next[i] = { ...slot, label: e.target.value };
                            setActivityWeek((c) => ({ ...c, scheduled: next }));
                          }}
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setActivityWeek((c) => ({
                              ...c,
                              scheduled: c.scheduled.filter((s) => s.id !== slot.id),
                            }))
                          }
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="number"
                          min={1.5}
                          max={5}
                          step={0.5}
                          value={slot.multiplier}
                          onChange={(e) => {
                            const next = [...activityWeek.scheduled];
                            next[i] = { ...slot, multiplier: Number(e.target.value) };
                            setActivityWeek((c) => ({ ...c, scheduled: next }));
                          }}
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                          title="المضاعف"
                        />
                        <input
                          type="datetime-local"
                          value={slot.starts_at.slice(0, 16)}
                          onChange={(e) => {
                            const next = [...activityWeek.scheduled];
                            next[i] = {
                              ...slot,
                              starts_at: new Date(e.target.value).toISOString(),
                            };
                            setActivityWeek((c) => ({ ...c, scheduled: next }));
                          }}
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                        />
                        <input
                          type="datetime-local"
                          value={slot.ends_at.slice(0, 16)}
                          onChange={(e) => {
                            const next = [...activityWeek.scheduled];
                            next[i] = {
                              ...slot,
                              ends_at: new Date(e.target.value).toISOString(),
                            };
                            setActivityWeek((c) => ({ ...c, scheduled: next }));
                          }}
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <p className="text-white/30 text-xs">
                عند التفعيل أو حلول موعد مجدول، تُضاعف نقاط محور النشاط تلقائياً
              </p>
            </div>
          )}

          {tab === 'school_calendar' && (
            <div className="space-y-4">
              <p className="text-white/50 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                فعاليات ومواعيد تظهر في التقويم المدرسي للطلاب وأولياء الأمور
              </p>
              <div className="space-y-3">
                {calendarEvents.map((event, i) => (
                  <div
                    key={event.id}
                    className="p-4 rounded-xl border border-white/10 bg-white/3 space-y-3"
                  >
                    <div className="flex gap-3 items-start">
                      <input
                        value={event.title}
                        onChange={(e) => {
                          const next = [...calendarEvents];
                          next[i] = { ...event, title: e.target.value };
                          setCalendarEvents(next);
                        }}
                        placeholder="عنوان الفعالية"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setCalendarEvents(calendarEvents.filter((_, j) => j !== i))}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="block space-y-1">
                        <span className="text-white/50 text-xs">النوع</span>
                        <select
                          value={event.type}
                          onChange={(e) => {
                            const next = [...calendarEvents];
                            next[i] = { ...event, type: e.target.value as SchoolEventType };
                            setCalendarEvents(next);
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                        >
                          {(Object.keys(SCHOOL_EVENT_TYPE_LABELS) as SchoolEventType[]).map((t) => (
                            <option key={t} value={t} className="bg-slate-900">
                              {SCHOOL_EVENT_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block space-y-1">
                        <span className="text-white/50 text-xs">تاريخ البداية</span>
                        <input
                          type="date"
                          value={event.date}
                          onChange={(e) => {
                            const next = [...calendarEvents];
                            next[i] = { ...event, date: e.target.value };
                            setCalendarEvents(next);
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-white/50 text-xs">تاريخ النهاية (اختياري)</span>
                        <input
                          type="date"
                          value={event.endDate ?? ''}
                          onChange={(e) => {
                            const next = [...calendarEvents];
                            next[i] = {
                              ...event,
                              endDate: e.target.value || undefined,
                            };
                            setCalendarEvents(next);
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                        />
                      </label>
                    </div>
                    <label className="block space-y-1">
                      <span className="text-white/50 text-xs">الوصف (اختياري)</span>
                      <input
                        value={event.description ?? ''}
                        onChange={(e) => {
                          const next = [...calendarEvents];
                          next[i] = {
                            ...event,
                            description: e.target.value || undefined,
                          };
                          setCalendarEvents(next);
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                      />
                    </label>
                  </div>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() =>
                  setCalendarEvents([
                    ...calendarEvents,
                    {
                      id: crypto.randomUUID(),
                      title: 'فعالية جديدة',
                      type: 'event',
                      date: new Date().toISOString().slice(0, 10),
                    },
                  ])
                }
              >
                إضافة فعالية
              </Button>
            </div>
          )}

          {tab === 'policy' && (
            <div className="space-y-4 max-w-md">
              <label className="block space-y-1">
                <span className="text-white/50 text-xs">سقف السلوك الأسبوعي</span>
                <input
                  type="number"
                  value={pointsPolicy.behavior_weekly_cap}
                  onChange={(e) =>
                    setPointsPolicy((p) => ({ ...p, behavior_weekly_cap: Number(e.target.value) }))
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-white/50 text-xs">حد النشاط/فصل/طالب</span>
                <input
                  type="number"
                  value={pointsPolicy.activity_per_term_max}
                  onChange={(e) =>
                    setPointsPolicy((p) => ({ ...p, activity_per_term_max: Number(e.target.value) }))
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                />
              </label>
            </div>
          )}

          {tab === 'weights' && (
            <>
              <p className="text-white/50 text-sm">يجب أن يكون مجموع الأوزان 100%</p>
              {(
                [
                  { key: 'activity' as const, label: 'النشاط', color: 'text-blue-400' },
                  { key: 'behavior' as const, label: 'السلوك', color: 'text-emerald-400' },
                  { key: 'achievement' as const, label: 'الإنجاز', color: 'text-purple-400' },
                  { key: 'initiative' as const, label: 'المبادرة', color: 'text-amber-400' },
                  { key: 'attendance' as const, label: 'الحضور', color: 'text-cyan-400' },
                ] as const
              ).map(({ key, label, color }) => (
                <label key={key} className="block space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className={color}>{label}</span>
                    <span className="text-white/50 font-mono">{Math.round(weights[key] * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    value={Math.round(weights[key] * 100)}
                    onChange={(e) =>
                      setWeights((w) => ({ ...w, [key]: Number(e.target.value) / 100 }))
                    }
                    className="w-full accent-gold-400"
                  />
                </label>
              ))}
              <p className={clsx('text-xs font-mono', weightSum === 100 ? 'text-emerald-400' : 'text-red-400')}>
                المجموع: {weightSum}%
              </p>
            </>
          )}

          {tab === 'levels' && (
            <div className="space-y-4">
              <p className="text-white/50 text-xs leading-relaxed">
                هذه العتبات هي التي تظهر كـ «المستوى» في شاشة الطالب وولي الأمر (مبتدئ / برونزي / فضي...). خفّض الحد الأدنى ليتغيّر المستوى عند نفس عدد النقاط.
              </p>
              {(levels.length > 0 ? levels : DEFAULT_EXCELLENCE_LEVELS).map((lvl, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <input
                    value={lvl.name}
                    onChange={(e) => {
                      const base = levels.length > 0 ? levels : DEFAULT_EXCELLENCE_LEVELS;
                      const next = [...base];
                      next[i] = { ...lvl, name: e.target.value };
                      setLevels(next);
                    }}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                  />
                  <input
                    type="number"
                    value={lvl.min}
                    onChange={(e) => {
                      const base = levels.length > 0 ? levels : DEFAULT_EXCELLENCE_LEVELS;
                      const next = [...base];
                      next[i] = { ...lvl, min: Number(e.target.value) };
                      setLevels(next);
                    }}
                    className="w-24 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setLevels((prev) => {
                        const base = prev.length > 0 ? prev : DEFAULT_EXCELLENCE_LEVELS;
                        return base.filter((_, j) => j !== i);
                      })
                    }
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setLevels([...levels, { name: 'مستوى جديد', min: 0 }])}
              >
                إضافة مستوى
              </Button>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5">
                <p className="text-white/60 text-xs font-semibold">معاينة المستوى</p>
                {[30, 80, 150, 300, 500].map((pts) => (
                  <p key={pts} className="text-white/45 text-xs font-mono">
                    طالب بـ {pts} نقطة → {getLevelInfoFromConfig(pts, levels).name}
                  </p>
                ))}
              </div>
              <Button
                icon={<Save className="w-4 h-4" />}
                onClick={() => levelsSaveMutation.mutate()}
                disabled={levelsSaveMutation.isPending || levels.length === 0}
              >
                {levelsSaveMutation.isPending ? 'جاري حفظ المستويات...' : 'حفظ مستويات التميز'}
              </Button>
            </div>
          )}

          {tab === 'badges' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-gold-400/20 bg-gold-500/5 p-4">
                <Award className="w-5 h-5 text-gold-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-semibold">عتبات شارات الإنجاز</p>
                  <p className="text-white/50 text-xs mt-1 leading-relaxed">
                    غيّر عدد النقاط أو الأيام المطلوبة لكل شارة. يظهر العدد (محققة / 10) حسب نقاط كل طالب بعد الحفظ.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {ACHIEVEMENT_THRESHOLD_FIELDS.map((field) => (
                  <label key={field.key} className="block space-y-1.5">
                    <span className="text-white/70 text-sm font-medium">{field.label}</span>
                    <input
                      type="number"
                      min={0}
                      value={badgeThresholds[field.key]}
                      onChange={(e) =>
                        setBadgeThresholds((prev) => ({
                          ...prev,
                          [field.key]: Number(e.target.value),
                        }))
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-mono"
                    />
                    <span className="text-white/35 text-xs">{field.hint}</span>
                  </label>
                ))}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5">
                <p className="text-white/60 text-xs font-semibold">معاينة فورية (نقاط نشاط فقط)</p>
                {[30, 80, 150, 300].map((pts) => {
                  const count = computeAchievements(
                    [{
                      id: 'preview',
                      points: pts,
                      status: 'approved',
                      activity_id: 'preview',
                      activities: { name: 'نشاط', category: 'activity' },
                    }],
                    null,
                    false,
                    0,
                    badgeThresholds,
                  ).filter((a) => a.earned).length;
                  return (
                    <p key={pts} className="text-white/45 text-xs font-mono">
                      طالب بـ {pts} نقطة → {count}/10 شارات
                    </p>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  icon={<Save className="w-4 h-4" />}
                  onClick={() => badgeSaveMutation.mutate()}
                  disabled={badgeSaveMutation.isPending}
                >
                  {badgeSaveMutation.isPending ? 'جاري حفظ الشارات...' : 'حفظ عتبات الشارات'}
                </Button>
                <button
                  type="button"
                  onClick={() => setBadgeThresholds({ ...DEFAULT_ACHIEVEMENT_THRESHOLDS })}
                  className="text-xs text-white/40 hover:text-gold-400 transition-colors"
                >
                  إعادة القيم الافتراضية
                </button>
              </div>
            </div>
          )}

          {tab === 'teacher_limits' && (
            <TeacherLimitsSettings
              limits={teacherLimits}
              teachers={teacherLimitRows}
              onChangeLimits={setTeacherLimits}
              onChangeTeachers={setTeacherLimitRows}
              applyDefaultsToAll={applyDefaultsToAll}
              onApplyDefaultsToAllChange={setApplyDefaultsToAll}
            />
          )}

          {tab === 'exam_points' && (
            <ExamPointsPolicySettings
              policy={examPointsPolicy}
              onChange={setExamPointsPolicy}
              gradeOptions={catalog.grades}
            />
          )}

          {tab === 'sms_alerts' && <SmsAlertsSettingsPanel />}

          {tab === 'certificates' && <OfficialCertificateSettingsPanel />}

          {tab === 'visibility' && <FeatureVisibilityPanel />}

          {tab === 'classes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-white/60 text-sm font-semibold">الصفوف</h4>
                {catalog.grades.map((g, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={g}
                      onChange={(e) => {
                        const grades = [...catalog.grades];
                        grades[i] = e.target.value;
                        setCatalog({ ...catalog, grades });
                      }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setCatalog({ ...catalog, grades: catalog.grades.filter((_, j) => j !== i) })
                      }
                      className="p-2 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value)}
                    placeholder="صف جديد..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (!newGrade.trim()) return;
                      setCatalog({ ...catalog, grades: [...catalog.grades, newGrade.trim()] });
                      setNewGrade('');
                    }}
                  >
                    إضافة
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-white/60 text-sm font-semibold">الفصول</h4>
                {catalog.classes.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={c}
                      onChange={(e) => {
                        const classes = [...catalog.classes];
                        classes[i] = e.target.value;
                        setCatalog({ ...catalog, classes });
                      }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setCatalog({ ...catalog, classes: catalog.classes.filter((_, j) => j !== i) })
                      }
                      className="p-2 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    value={newClass}
                    onChange={(e) => setNewClass(e.target.value)}
                    placeholder="فصل جديد..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (!newClass.trim()) return;
                      setCatalog({ ...catalog, classes: [...catalog.classes, newClass.trim()] });
                      setNewClass('');
                    }}
                  >
                    إضافة
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
