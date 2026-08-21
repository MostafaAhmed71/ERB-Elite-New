import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Calendar, ClipboardList, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { academicPortalService } from '../../lib/academic/portalService';
import { formatHomeworkPageNumbers, normalizeHomeworkPageNumbers } from '../../lib/academic/homeworkHelpers';
import { DAYS_AR } from '../../lib/academic/constants';
import {
  AcademicLayout, AcademicPageHeader, AcademicEmpty, AcademicBadge,
  academicBtnSecondary, academicBtnPrimary,
} from '../../components/academic/AcademicUi';
import { TapHandLoader } from '../../components/ui/TapHandLoader';

export function StudentAcademicPage() {
  const { user } = useAuthStore();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['student', 'profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*').eq('user_id', user!.id).single();
      if (error) throw error;
      return data as { full_name: string; grade: string; class_name: string };
    },
    enabled: !!user,
  });

  const { data: homeworks = [], isLoading: hwLoading } = useQuery({
    queryKey: ['portal', 'homework', 'student', user?.id],
    queryFn: () => academicPortalService.listHomeworks({ days: 14 }),
    enabled: !!user && !!profile,
  });

  const { data: plans = [], isLoading: planLoading } = useQuery({
    queryKey: ['portal', 'weekly-plans', 'student', user?.id],
    queryFn: () => academicPortalService.listWeeklyPlans(),
    enabled: !!user && !!profile,
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayHomeworks = useMemo(() => homeworks.filter((h) => h.date === today), [homeworks, today]);

  const latestWeek = useMemo(() => {
    if (!plans.length) return null;
    const sorted = [...plans].sort((a, b) => (b.week_number ?? 0) - (a.week_number ?? 0));
    return sorted[0]?.week_number ?? null;
  }, [plans]);

  const weekPlans = useMemo(
    () => (latestWeek != null ? plans.filter((p) => p.week_number === latestWeek) : []),
    [plans, latestWeek],
  );

  const weekEntries = useMemo(() => {
    const map = new Map<string, { day: string; period: number; subject: string; topic: string }>();
    for (const plan of weekPlans) {
      for (const e of plan.entries) {
        const key = `${e.day}_${e.period}`;
        if (!map.has(key)) map.set(key, { day: e.day, period: e.period, subject: e.subject, topic: e.lesson_topic });
      }
    }
    return DAYS_AR.flatMap((day) =>
      [...map.values()]
        .filter((e) => e.day === day)
        .sort((a, b) => a.period - b.period),
    );
  }, [weekPlans]);

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
        action={
          <Link to="/student/academic/reviews" className={academicBtnPrimary}>
            <Download className="w-4 h-4" />
            المراجعات
          </Link>
        }
      />

      <section className="mb-8">
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-gold-400" />
          واجب اليوم
          <AcademicBadge variant="gold">{new Date().toLocaleDateString('ar-SA')}</AcademicBadge>
        </h2>
        {todayHomeworks.length === 0 ? (
          <AcademicEmpty message="لا واجبات مسجّلة لليوم" icon={BookOpen} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {todayHomeworks.map((hw) => (
              <div key={hw.id} className="rounded-2xl bg-[#111c44] border border-white/[0.06] p-4">
                <p className="font-bold text-gold-400">{hw.subject}</p>
                <p className="text-white text-sm mt-1">{hw.lesson_topic}</p>
                <p className="text-[#A3AED0] text-xs mt-2">
                  {formatHomeworkPageNumbers(normalizeHomeworkPageNumbers(hw))}
                </p>
                <p className="text-white/80 text-sm mt-2 leading-relaxed">{hw.homework_text}</p>
                <p className="text-[#A3AED0] text-xs mt-2">المعلم: {hw.teacher_name}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-gold-400" />
          واجبات الأيام السابقة
        </h2>
        {homeworks.filter((h) => h.date !== today).length === 0 ? (
          <p className="text-[#A3AED0] text-sm">لا واجبات سابقة في آخر 14 يوماً</p>
        ) : (
          <div className="space-y-2">
            {homeworks.filter((h) => h.date !== today).slice(0, 20).map((hw) => (
              <div key={hw.id} className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 flex justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-gold-400 font-semibold text-sm">{hw.subject}</span>
                  <span className="text-white/70 text-sm mr-2">— {hw.lesson_topic}</span>
                </div>
                <span className="text-[#A3AED0] text-xs shrink-0">
                  {new Date(hw.date).toLocaleDateString('ar-SA')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gold-400" />
          الخطة الأسبوعية
          {latestWeek != null && <AcademicBadge variant="info">الأسبوع {latestWeek}</AcademicBadge>}
        </h2>
        {weekEntries.length === 0 ? (
          <AcademicEmpty message="لا توجد خطة أسبوعية لفصلك بعد" icon={Calendar} />
        ) : (
          <>
            {/* بطاقات مجمّعة حسب اليوم — الجوال */}
            <div className="space-y-3 sm:hidden">
              {DAYS_AR.map((day) => {
                const dayEntries = weekEntries.filter((e) => e.day === day);
                if (dayEntries.length === 0) return null;
                return (
                  <div key={day} className="rounded-2xl bg-[#111c44] border border-white/[0.06] overflow-hidden">
                    <div className="bg-white/[0.04] px-4 py-2.5 font-bold text-gold-400 text-sm">{day}</div>
                    <div className="divide-y divide-white/[0.06]">
                      {dayEntries.map((e, i) => (
                        <div key={i} className="px-4 py-3 flex items-start gap-3">
                          <span className="shrink-0 w-7 h-7 rounded-lg bg-white/[0.06] text-[#A3AED0] text-xs font-bold flex items-center justify-center mt-0.5">
                            {e.period}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-gold-400/90 font-semibold text-sm">{e.subject}</p>
                            <p className="text-white/85 text-sm leading-relaxed">{e.topic}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* جدول — الحاسب */}
            <div className="hidden sm:block rounded-2xl bg-[#111c44] border border-white/[0.06] overflow-hidden">
              <table className="w-full text-sm text-right">
                <thead>
                  <tr className="text-[#A3AED0] border-b border-white/10">
                    <th className="p-3">اليوم</th>
                    <th className="p-3">الحصة</th>
                    <th className="p-3">المادة</th>
                    <th className="p-3">الدرس</th>
                  </tr>
                </thead>
                <tbody>
                  {weekEntries.map((e, i) => (
                    <tr key={i} className="border-b border-white/5 text-white">
                      <td className="p-3">{e.day}</td>
                      <td className="p-3">{e.period}</td>
                      <td className="p-3 text-gold-400/90">{e.subject}</td>
                      <td className="p-3">{e.topic}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <div className="mt-6">
        <Link to="/student" className={academicBtnSecondary}>العودة للوحة الطالب</Link>
      </div>
    </AcademicLayout>
  );
}
