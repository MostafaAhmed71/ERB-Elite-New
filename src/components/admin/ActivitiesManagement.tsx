import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Star, Pencil, Trash2, Tag, ArrowLeft, MapPin, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAction } from '../../lib/auth';
import type { DbActivity } from '../../types';
import { toast } from 'react-hot-toast';
import { BarsLoader } from '../../components/ui/BarsLoader';
import clsx from 'clsx';
import {
  ACTIVITY_COLORS,
  ACTIVITY_ICONS,
  ACTIVITY_ICON_LABELS,
  ACADEMIC_TERMS,
  SEASONAL_PRESETS,
  getActivityColorClasses,
  getActivityIcon,
} from '../../lib/activityMeta';
import { LIFECYCLE_STAGES, getLifecycleLabel } from '../../lib/activityLifecycle';
import { ActivitySuggestionsReview } from './ActivitySuggestionsReview';
import { SeasonalTemplatesPanel } from './SeasonalTemplatesPanel';
import { PLATFORM_NAME_SHORT } from '../../lib/branding';
import { ScreenGuideButton } from './ScreenGuideButton';

const CATEGORIES = [
  { key: 'activity', label: 'النشاط (40%)', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { key: 'behavior', label: 'السلوك (30%)', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { key: 'achievement', label: 'الإنجاز (20%)', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { key: 'initiative', label: 'المبادرة (10%)', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
];

export function ActivitiesManagement() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editActivity, setEditActivity] = useState<DbActivity | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('activity');
  const [defaultPoints, setDefaultPoints] = useState(10);
  const [icon, setIcon] = useState('star');
  const [color, setColor] = useState('gold');
  const [isSeasonal, setIsSeasonal] = useState(false);
  const [seasonLabel, setSeasonLabel] = useState('');
  const [academicTerm, setAcademicTerm] = useState('all');
  const [termFilter, setTermFilter] = useState('all');
  const [lifecycleStage, setLifecycleStage] = useState('active');
  const [learningObjective, setLearningObjective] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [location, setLocation] = useState('');

  // Query activities
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['admin', 'activities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('activities').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbActivity[];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const isEdit = !!editActivity;
      const payload = {
        name,
        category,
        default_points: Number(defaultPoints),
        is_active: editActivity ? editActivity.is_active : true,
        icon,
        color,
        is_seasonal: isSeasonal,
        season_label: isSeasonal ? seasonLabel || null : null,
        academic_term: academicTerm,
        lifecycle_stage: lifecycleStage,
        learning_objective: learningObjective.trim() || null,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        location: location.trim() || null,
      };

      if (isEdit) {
        const { error } = await supabase.from('activities').update(payload).eq('id', editActivity.id);
        if (error) throw error;
        await logAction('ACTIVITY_UPDATED_ADMIN', 'activities', editActivity.id, payload);
      } else {
        const { error } = await supabase.from('activities').insert([payload]);
        if (error) throw error;
        await logAction('ACTIVITY_CREATED_ADMIN', 'activities', undefined, payload);
      }
    },
    onSuccess: () => {
      toast.success(editActivity ? 'تم تحديث النشاط بنجاح' : 'تم إنشاء النشاط بنجاح');
      setShowModal(false);
      setName('');
      setCategory('activity');
      setDefaultPoints(10);
      setIcon('star');
      setColor('gold');
      setIsSeasonal(false);
      setSeasonLabel('');
      setAcademicTerm('all');
      setLifecycleStage('active');
      setLearningObjective('');
      setScheduledAt('');
      setLocation('');
      setEditActivity(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'activities'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // CASCADE behavior: deleting a main/parent activity should cascade remove entries in points ledger.
      // But standard DB constraints already handle cascade or restrict.
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) throw error;
      await logAction('ACTIVITY_DELETED_ADMIN', 'activities', id);
    },
    onSuccess: () => {
      toast.success('تم حذف النشاط بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admin', 'activities'] });
    },
    onError: () => toast.error('فشل الحذف. ربما النشاط مرتبط بنقاط طلاب مرصودة مسبقاً.'),
  });

  const openEdit = (act: DbActivity) => {
    setEditActivity(act);
    setName(act.name);
    setCategory(act.category);
    setDefaultPoints(act.default_points);
    setIcon(act.icon ?? 'star');
    setColor(act.color ?? 'gold');
    setIsSeasonal(act.is_seasonal ?? false);
    setSeasonLabel(act.season_label ?? '');
    setAcademicTerm(act.academic_term ?? 'all');
    setLifecycleStage(act.lifecycle_stage ?? 'active');
    setLearningObjective(act.learning_objective ?? '');
    setScheduledAt(act.scheduled_at ? act.scheduled_at.slice(0, 16) : '');
    setLocation(act.location ?? '');
    setShowModal(true);
  };

  const resetForm = () => {
    setEditActivity(null);
    setName('');
    setCategory('activity');
    setDefaultPoints(10);
    setIcon('star');
    setColor('gold');
    setIsSeasonal(false);
    setSeasonLabel('');
    setAcademicTerm('all');
    setLifecycleStage('active');
    setLearningObjective('');
    setScheduledAt('');
    setLocation('');
  };

  const applySeasonalPreset = (preset: (typeof SEASONAL_PRESETS)[number]) => {
    setIsSeasonal(true);
    setSeasonLabel(preset.season_label);
    setIcon(preset.icon);
    setColor(preset.color);
    setCategory(preset.category);
    if (!name) setName(preset.season_label);
  };

  const filteredActivities = activities.filter((act) => {
    if (termFilter === 'all') return true;
    return act.academic_term === 'all' || act.academic_term === termFilter;
  });

  return (
    <div className="space-y-6 text-white" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6 text-gold-400" />
            إدارة كتالوج الأنشطة
          </h1>
          <p className="text-white/40 text-sm mt-1">تحديد محاور التميز والأنشطة الفرعية التابعة ل{PLATFORM_NAME_SHORT}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ScreenGuideButton path="/admin/activities" />
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-gold-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          إضافة نشاط
        </button>
        </div>
      </div>

      <ActivitySuggestionsReview />

      <SeasonalTemplatesPanel />

      <div className="flex gap-2 flex-wrap">
        {ACADEMIC_TERMS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTermFilter(t.value)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs border transition-all',
              termFilter === t.value
                ? 'bg-gold-500/15 border-gold-400/40 text-gold-400'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <BarsLoader label="جاري تحميل الأنشطة..." fullScreen />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredActivities.map((act) => {
            const catInfo = CATEGORIES.find(c => c.key === act.category) || CATEGORIES[0];
            const colorCls = getActivityColorClasses(act.color);
            const IconComp = getActivityIcon(act.icon);
            return (
              <div key={act.id} className={clsx('bg-navy-900/40 border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200', colorCls.border, 'hover:border-white/20')}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className={clsx('p-2 rounded-xl border', colorCls.bg, colorCls.border)}>
                      <IconComp className={clsx('w-4 h-4', colorCls.text)} />
                    </span>
                    <span className={clsx('px-2.5 py-1 rounded-full text-[10px] font-bold border', catInfo.color)}>
                      {catInfo.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 border border-white/10 text-white/50">
                      {getLifecycleLabel(act.lifecycle_stage)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(act)}
                      className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { if (confirm('هل أنت متأكد من حذف هذا النشاط؟')) deleteMutation.mutate(act.id); }}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm leading-snug">{act.name}</h3>
                  {act.is_seasonal && act.season_label && (
                    <span className="text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full inline-block mt-1">
                      موسمي: {act.season_label}
                    </span>
                  )}
                  <p className="text-gold-400 text-xs mt-2 font-semibold font-mono">
                    النقاط الافتراضية: {act.default_points} ن
                  </p>
                  {act.learning_objective && (
                    <p className="text-white/40 text-[10px] mt-1 line-clamp-2">{act.learning_objective}</p>
                  )}
                  {act.scheduled_at && (
                    <p className="text-white/40 text-[10px] mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(act.scheduled_at).toLocaleString('ar-SA')}
                      {act.location && (
                        <>
                          <MapPin className="w-3 h-3 mr-1" />
                          {act.location}
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-white font-bold text-base flex items-center gap-2">
                <Star className="w-5 h-5 text-gold-400" />
                {editActivity ? 'تعديل نشاط' : 'إضافة نشاط جديد'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/40 hover:text-white/80 transition-colors"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={e => { e.preventDefault(); mutation.mutate(); }}
              className="p-6 space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-white/60 text-xs">اسم النشاط</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="مثال: الإذاعة المدرسية الصباحية"
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-white/60 text-xs">محور التميز</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.key} value={cat.key} className="bg-navy-900">
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-white/60 text-xs">النقاط الافتراضية</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={defaultPoints}
                  onChange={e => setDefaultPoints(Number(e.target.value))}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-400/50 text-sm font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-white/60 text-xs">الأيقونة</label>
                  <select value={icon} onChange={e => setIcon(e.target.value)}
                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm appearance-none">
                    {Object.keys(ACTIVITY_ICONS).map((k) => (
                      <option key={k} value={k} className="bg-navy-900">
                        {ACTIVITY_ICON_LABELS[k] ?? k}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-white/60 text-xs">اللون</label>
                  <select value={color} onChange={e => setColor(e.target.value)}
                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm appearance-none">
                    {Object.keys(ACTIVITY_COLORS).map((k) => (
                      <option key={k} value={k} className="bg-navy-900">{k}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-white/60 text-xs">الفصل الدراسي</label>
                <select value={academicTerm} onChange={e => setAcademicTerm(e.target.value)}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm appearance-none">
                  {ACADEMIC_TERMS.map((t) => (
                    <option key={t.value} value={t.value} className="bg-navy-900">{t.label}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                <input type="checkbox" checked={isSeasonal} onChange={e => setIsSeasonal(e.target.checked)}
                  className="rounded border-white/20" />
                نشاط موسمي
              </label>

              {isSeasonal && (
                <div className="space-y-2">
                  <input
                    value={seasonLabel}
                    onChange={e => setSeasonLabel(e.target.value)}
                    placeholder="مثال: رمضان، اليوم الوطني"
                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {SEASONAL_PRESETS.map((p) => (
                      <button key={p.season_label} type="button" onClick={() => applySeasonalPreset(p)}
                        className="text-[10px] px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20">
                        {p.season_label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-white/60 text-xs">مرحلة دورة الحياة</label>
                <select
                  value={lifecycleStage}
                  onChange={(e) => setLifecycleStage(e.target.value)}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm appearance-none"
                >
                  {LIFECYCLE_STAGES.map((s) => (
                    <option key={s.value} value={s.value} className="bg-navy-900">
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-white/60 text-xs">الهدف التعليمي</label>
                <textarea
                  value={learningObjective}
                  onChange={(e) => setLearningObjective(e.target.value)}
                  rows={2}
                  placeholder="مثال: تنمية مهارات التواصل والعمل الجماعي"
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-white/60 text-xs">موعد النشاط</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-white/60 text-xs">المكان</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="مثال: الساحة الرئيسية"
                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 font-bold text-xs hover:shadow-lg disabled:opacity-50"
                >
                  {mutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
