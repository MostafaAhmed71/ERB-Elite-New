import { useMemo, useState } from 'react';
import {
  BookOpen, Calendar, ChevronRight, ChevronLeft,
  ClipboardList, AlertCircle, Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { academicPortalService } from '../../lib/academic/portalService';
import { formatHomeworkPageNumbers, normalizeHomeworkPageNumbers } from '../../lib/academic/homeworkHelpers';
import { DAYS_AR } from '../../lib/academic/constants';
import {
  AcademicLayout, AcademicPageHeader, AcademicEmpty, AcademicBadge,
  academicBtnSecondary,
} from '../../components/academic/AcademicUi';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { useQuery } from '@tanstack/react-query';

const SUBJECT_COLORS: Record<string, { bg: string; border: string; badge: string; dot: string }> = {
  'رياضيات':       { bg: 'bg-blue-900/30',   border: 'border-blue-500/30',   badge: 'bg-blue-500/20 text-blue-300',       dot: 'bg-blue-400' },
  'علوم':          { bg: 'bg-emerald-900/30', border: 'border-emerald-500/30', badge: 'bg-emerald-500/20 text-emerald-300', dot: 'bg-emerald-400' },
  'لغة عربية':     { bg: 'bg-amber-900/30',   border: 'border-amber-500/30',   badge: 'bg-amber-500/20 text-amber-300',     dot: 'bg-amber-400' },
  'إنجليزي':       { bg: 'bg-purple-900/30',  border: 'border-purple-500/30',  badge: 'bg-purple-500/20 text-purple-300',   dot: 'bg-purple-400' },
  'إنجليزية':      { bg: 'bg-purple-900/30',  border: 'border-purple-500/30',  badge: 'bg-purple-500/20 text-purple-300',   dot: 'bg-purple-400' },
  'تربية إسلامية': { bg: 'bg-teal-900/30',    border: 'border-teal-500/30',    badge: 'bg-teal-500/20 text-teal-300',       dot: 'bg-teal-400' },
  'فيزياء':        { bg: 'bg-cyan-900/30',    border: 'border-cyan-500/30',    badge: 'bg-cyan-500/20 text-cyan-300',       dot: 'bg-cyan-400' },
  'كيمياء':        { bg: 'bg-pink-900/30',    border: 'border-pink-500/30',    badge: 'bg-pink-500/20 text-pink-300',       dot: 'bg-pink-400' },
  'أحياء':         { bg: 'bg-lime-900/30',    border: 'border-lime-500/30',    badge: 'bg-lime-500/20 text-lime-300',       dot: 'bg-lime-400' },
  'تاريخ':         { bg: 'bg-orange-900/30',  border: 'border-orange-500/30',  badge: 'bg-orange-500/20 text-orange-300',   dot: 'bg-orange-400' },
  'جغرافيا':       { bg: 'bg-green-900/30',   border: 'border-green-500/30',   badge: 'bg-green-500/20 text-green-300',     dot: 'bg-green-400' },
};
const DEFAULT_COLOR = { bg: 'bg-[#111c44]', border: 'border-white/[0.06]', badge: 'bg-gold-500/20 text-gold-300', dot: 'bg-gold-400' };
function subjectColor(subject: string) {
  for (const [key, val] of Object.entries(SUBJECT_COLORS)) {
    if (subject?.includes(key)) return val;
  }
  return DEFAULT_COLOR;
}

type MainTab = 'homework' | 'plans';
type HwTab = 'today' | 'week' | 'past';

export function StudentAcademicPage() {
  const { user } = useAuthStore();
  const [mainTab, setMainTab] = useState<MainTab>('homework');
  const [hwTab, setHwTab] = useState<HwTab>('today');
  const [planWeekOffset, setPlanWeekOffset] = useState(0);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['student', 'profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('full_name, grade, class_name')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data as { full_name: string; grade: string; class_name: string };
    },
    enabled: !!user,
  });

  const { data: homeworks = [], isLoading: hwLoading } = useQuery({
    queryKey: ['portal', 'homework', 'student', user?.id],
    queryFn: () => academicPortalService.listHomeworks({ days: 30 }),
    enabled: !!user && !!profile,
  });

  const { data: plans = [], isLoading: planLoading } = useQuery({
    queryKey: ['portal', 'weekly-plans', 'student', user?.id],
    queryFn: () => academicPortalService.listWeeklyPlans(),
    enabled: !!user && !!profile,
  });

  const availableWeeks = useMemo(() => {
    const seen = new Map<string, { week: number; semester: number }>();
    for (const p of plans) {
      const key = `${p.semester ?? 1}_${p.week_number}`;
      if (!seen.has(key)) seen.set(key, { week: p.week_number, semester: p.semester ?? 1 });
    }
    return [...seen.values()].sort((a, b) =>
      a.semester !== b.semester ? b.semester - a.semester : b.week - a.week,
    );
  }, [plans]);

  const currentWeekIndex = useMemo(() => {
    return Math.max(0, Math.min(planWeekOffset, availableWeeks.length - 1));
  }, [planWeekOffset, availableWeeks.length]);

  const currentWeekInfo = availableWeeks[currentWeekIndex];

  const weekPlans = useMemo(() => {
    if (!currentWeekInfo) return [];
    return plans.filter(
      (p) => p.week_number === currentWeekInfo.week && (p.semester ?? 1) === currentWeekInfo.semester,
    );
  }, [plans, currentWeekInfo]);

  const weekEntries = useMemo(() => {
    const map = new Map<string, { day: string; period: number; subject: string; topic: string; teacherName?: string }>();
    for (const plan of weekPlans) {
      for (const e of plan.entries) {
        const key = `${e.day}_${e.period}`;
        if (!map.has(key)) {
          map.set(key, {
            day: e.day, period: e.period, subject: e.subject,
            topic: e.lesson_topic, teacherName: e.teacher_name ?? plan.teacher_name,
          });
        }
      }
    }
    return DAYS_AR.flatMap((day) =>
      [...map.values()].filter((e) => e.day === day).sort((a, b) => a.period - b.period),
    );
  }, [weekPlans]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const startOfWeek = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  }, []);

  const filteredHomeworks = useMemo(() => {
    if (hwTab === 'today') return homeworks.filter((h) => h.date === today);
    if (hwTab === 'week')  return homeworks.filter((h) => h.date >= startOfWeek && h.date <= today);
    return homeworks.filter((h) => h.date < startOfWeek);
  }, [homeworks, hwTab, today, startOfWeek]);

  const todayCount = homeworks.filter((h) => h.date === today).length;
  const weekCount  = homeworks.filter((h) => h.date >= startOfWeek && h.date <= today).length;
  const pastCount  = homeworks.filter((h) => h.date < startOfWeek).length;

  const isLoading = profileLoading || hwLoading || planLoading;
  if (isLoading) return <TapHandLoader label="جاري تحميل الواجبات والخطط..." fullScreen />;
  if (!profile) {
    return (
      <AcademicLayout size="lg">
        <AcademicEmpty message="لم يُربط حسابك بملف طالب — تواصل مع الإدارة" />
      </AcademicLayout>
    );
  }

  return (
    <AcademicLayout>
      <AcademicPageHeader
        title="واجباتي وخطتي"
        subtitle={`${profile.full_name} · ${profile.grade} — فصل ${profile.class_name}`}
        backTo="/student"
        badge="فصلك فقط"
      />

      {/* ══════ التبويبات الرئيسية ══════ */}
      <div className="flex gap-1 mb-6 rounded-xl bg-white/[0.04] p-1 w-fit">
        <button
          onClick={() => setMainTab('homework')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            mainTab === 'homework' ? 'bg-gold-500/20 text-gold-300 shadow-sm' : 'text-white/50 hover:text-white/80',
          )}
        >
          <BookOpen className="w-4 h-4" />
          الواجبات
          {todayCount > 0 && (
            <span className={clsx('text-xs rounded-full px-1.5 font-bold leading-5',
              mainTab === 'homework' ? 'bg-gold-500/30 text-gold-200' : 'bg-white/10 text-white/50')}>
              {todayCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setMainTab('plans')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            mainTab === 'plans' ? 'bg-blue-500/20 text-blue-300 shadow-sm' : 'text-white/50 hover:text-white/80',
          )}
        >
          <Calendar className="w-4 h-4" />
          الخطة الأسبوعية
          {availableWeeks.length > 0 && (
            <span className={clsx('text-xs rounded-full px-1.5 font-bold leading-5',
              mainTab === 'plans' ? 'bg-blue-500/30 text-blue-200' : 'bg-white/10 text-white/50')}>
              {availableWeeks.length}
            </span>
          )}
        </button>
      </div>

      {/* ══════ الواجبات ══════ */}
      {mainTab === 'homework' && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gold-500/15 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-gold-400" />
            </div>
            <h2 className="text-lg font-bold text-white flex-1">الواجبات المنزلية</h2>
            {todayCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-500/25 rounded-full px-2.5 py-0.5">
                <Sparkles className="w-3 h-3" />{todayCount} واجب اليوم
              </span>
            )}
          </div>
          <div className="flex gap-1 mb-4 rounded-xl bg-white/[0.04] p-1 w-fit">
            {([
              { id: 'today' as HwTab, label: 'اليوم',       icon: <Sparkles className="w-3 h-3" />, count: todayCount },
              { id: 'week'  as HwTab, label: 'هذا الأسبوع', icon: <Calendar className="w-3 h-3" />,  count: weekCount  },
              { id: 'past'  as HwTab, label: 'السابق',      icon: <ClipboardList className="w-3 h-3" />, count: pastCount  },
            ]).map((tab) => (
              <button key={tab.id} onClick={() => setHwTab(tab.id)}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  hwTab === tab.id ? 'bg-gold-500/20 text-gold-300 shadow-sm' : 'text-white/50 hover:text-white/80')}>
                {tab.icon}{tab.label}
                {tab.count > 0 && (
                  <span className={clsx('text-xs rounded-full px-1.5 font-bold leading-5',
                    hwTab === tab.id ? 'bg-gold-500/30 text-gold-200' : 'bg-white/10 text-white/50')}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          {filteredHomeworks.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-8 text-center">
              <AlertCircle className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-[#A3AED0] text-sm">
                {hwTab === 'today' ? 'لا واجبات مسجّلة لليوم' : hwTab === 'week' ? 'لا واجبات هذا الأسبوع' : 'لا واجبات سابقة'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredHomeworks.map((hw) => {
                const colors = subjectColor(hw.subject);
                const pages = formatHomeworkPageNumbers(normalizeHomeworkPageNumbers(hw));
                return (
                  <div key={hw.id} className={clsx(
                    'rounded-2xl border p-4 flex flex-col gap-2 relative overflow-hidden transition-all hover:shadow-lg hover:border-white/25',
                    colors.bg, colors.border)}>
                    {hw.date === today && (
                      <span className="absolute top-3 left-3 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full px-1.5 py-0.5">جديد</span>
                    )}
                    <span className={clsx('text-xs font-bold rounded-full px-2.5 py-0.5 self-start', colors.badge)}>{hw.subject}</span>
                    <p className="text-white font-semibold text-sm leading-snug">{hw.lesson_topic}</p>
                    {hw.homework_text && <p className="text-white/75 text-sm leading-relaxed border-t border-white/[0.06] pt-2">{hw.homework_text}</p>}
                    {pages && <p className="text-[#A3AED0] text-xs">{pages}</p>}
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/[0.06]">
                      <span className="text-[#A3AED0] text-xs">{hw.teacher_name}</span>
                      <span className="text-[#A3AED0] text-xs">
                        {new Date(hw.date + 'T12:00:00').toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ══════ الخطة الأسبوعية ══════ */}
      {mainTab === 'plans' && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-white flex-1">الخطة الأسبوعية</h2>
            {availableWeeks.length > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPlanWeekOffset((v) => Math.min(v + 1, availableWeeks.length - 1))}
                  disabled={currentWeekIndex >= availableWeeks.length - 1}
                  className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.10] disabled:opacity-30 flex items-center justify-center text-white/70 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => setPlanWeekOffset((v) => Math.max(v - 1, 0))}
                  disabled={currentWeekIndex <= 0}
                  className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.10] disabled:opacity-30 flex items-center justify-center text-white/70 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
            {currentWeekInfo && (
              <AcademicBadge variant="info">الفصل {currentWeekInfo.semester} — الأسبوع {currentWeekInfo.week}</AcademicBadge>
            )}
          </div>
          {weekEntries.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-8 text-center">
              <Calendar className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-[#A3AED0] text-sm">{availableWeeks.length === 0 ? 'لا توجد خطة أسبوعية لفصلك بعد' : 'لا بيانات لهذا الأسبوع'}</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 sm:hidden">
                {DAYS_AR.map((day) => {
                  const dayEntries = weekEntries.filter((e) => e.day === day);
                  if (!dayEntries.length) return null;
                  return (
                    <div key={day} className="rounded-2xl bg-[#0d1736] border border-white/[0.07] overflow-hidden">
                      <div className="bg-white/[0.04] px-4 py-2.5 font-bold text-blue-300 text-sm border-b border-white/[0.06]">{day}</div>
                      <div className="divide-y divide-white/[0.05]">
                        {dayEntries.map((e, i) => {
                          const colors = subjectColor(e.subject);
                          return (
                            <div key={i} className="px-4 py-3 flex items-start gap-3">
                              <span className="shrink-0 w-7 h-7 rounded-lg bg-white/[0.06] text-[#A3AED0] text-xs font-bold flex items-center justify-center mt-0.5">{e.period}</span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className={clsx('w-2 h-2 rounded-full shrink-0', colors.dot)} />
                                  <p className="font-semibold text-sm text-white">{e.subject}</p>
                                </div>
                                <p className="text-white/70 text-sm">{e.topic}</p>
                                {e.teacherName && <p className="text-[#A3AED0] text-xs mt-1">{e.teacherName}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="hidden sm:block rounded-2xl bg-[#0d1736] border border-white/[0.07] overflow-hidden">
                <table className="w-full text-sm text-right">
                  <thead>
                    <tr className="text-[#A3AED0] border-b border-white/10 bg-white/[0.02]">
                      <th className="p-3 font-semibold">اليوم</th>
                      <th className="p-3 font-semibold text-center">الحصة</th>
                      <th className="p-3 font-semibold">المادة</th>
                      <th className="p-3 font-semibold">موضوع الدرس</th>
                      <th className="p-3 font-semibold">المعلم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekEntries.map((e, i) => {
                      const colors = subjectColor(e.subject);
                      return (
                        <tr key={i} className="border-b border-white/[0.05] text-white hover:bg-white/[0.02] transition-colors">
                          <td className="p-3 font-medium text-blue-300">{e.day}</td>
                          <td className="p-3 text-center">
                            <span className="inline-flex w-7 h-7 rounded-lg bg-white/[0.06] items-center justify-center text-xs font-bold text-[#A3AED0]">{e.period}</span>
                          </td>
                          <td className="p-3">
                            <span className="flex items-center gap-1.5">
                              <span className={clsx('w-2 h-2 rounded-full shrink-0', colors.dot)} />
                              <span className="font-semibold">{e.subject}</span>
                            </span>
                          </td>
                          <td className="p-3 text-white/80">{e.topic}</td>
                          <td className="p-3 text-[#A3AED0] text-xs">{e.teacherName ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[#A3AED0] text-xs mt-2 text-left">إجمالي الحصص: {weekEntries.length}</p>
            </>
          )}
        </section>
      )}

      <div className="mt-8">
        <Link to="/student" className={academicBtnSecondary}>العودة للوحة الطالب</Link>
      </div>
    </AcademicLayout>
  );
}
