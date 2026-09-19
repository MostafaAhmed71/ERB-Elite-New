import { useMemo, useState } from 'react';
import { Trophy, Medal, Crown, School, Users, ArrowLeft, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { gradesMatch, classesMatch } from '../../lib/academic/gradeBridge';
import type { ClassRankEntry } from '../../hooks/useStudentMetrics';
import clsx from 'clsx';

type Props = {
  rank?: number | null;
  top3?: ClassRankEntry[];
  currentStudentId?: string;
  grade?: string;
  className?: string;
};

type RankTab = 'class' | 'grade' | 'school';

const MEDAL_COLORS = ['text-gold-400', 'text-slate-300', 'text-amber-600'];

export function ClassRankSection({
  rank: fallbackClassRank,
  top3: fallbackClassTop3,
  currentStudentId,
  grade: propGrade,
  className: propClassName,
}: Props) {
  const [tab, setTab] = useState<RankTab>('class');

  // جلب المتصدرين عبر الـ RPC العام لتجاوز قيود RLS
  // BUG-006: مفتاح موحَّد مع LeaderboardPage لمشاركة الـ cache وتقليل طلبات الشبكة
  const { data: allStudents = [], isLoading } = useQuery({
    queryKey: ['display_leaderboard_rpc'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('display_leaderboard');
      if (error) throw error;
      // display_leaderboard تُرجع JSON object { students: [...], classes: [...] }
      const payload = data as { students?: Array<{
        id: string;
        full_name: string;
        grade: string;
        class_name: string;
        total_points: number;
      }> } | null;
      const raw = payload?.students ?? [];
      return raw
        .sort((a, b) => b.total_points - a.total_points)
        .map((s) => ({
          studentId: s.id,
          name: s.full_name,
          grade: s.grade,
          className: s.class_name,
          score: s.total_points,
        }));
    },
    staleTime: 30_000,
  });

  // تحديد صف وفصل الطالب الحالي
  const currentStudent = useMemo(() => {
    if (!currentStudentId) return null;
    return allStudents.find((s) => s.studentId === currentStudentId) ?? null;
  }, [allStudents, currentStudentId]);

  const targetGrade = propGrade || currentStudent?.grade;
  const targetClass = propClassName || currentStudent?.className;

  // القائمة الكاملة على مستوى المدرسة (مع إضافة الطالب الحالي إن لم يكن لديه نقاط بعد)
  const schoolRanked = useMemo(() => {
    let list = allStudents.map((s, i) => ({ ...s, rank: i + 1 }));

    if (currentStudentId && targetGrade && !list.some((s) => s.studentId === currentStudentId)) {
      list.push({
        studentId: currentStudentId,
        name: currentStudent?.name || 'أنت',
        grade: targetGrade,
        className: targetClass || '',
        score: 0,
        rank: list.length + 1,
      });
    }

    return list;
  }, [allStudents, currentStudentId, targetGrade, targetClass, currentStudent]);

  // ترتيب على مستوى الصف كاملاً (كل الفصول لنفس الصف)
  const gradeRanked = useMemo(() => {
    if (!targetGrade) return schoolRanked;
    const sameGrade = schoolRanked.filter((s) => gradesMatch(s.grade, targetGrade));
    return sameGrade.map((s, i) => ({ ...s, rank: i + 1 }));
  }, [schoolRanked, targetGrade]);

  // ترتيب على مستوى الفصل فقط
  const classRanked = useMemo(() => {
    if (!targetGrade || !targetClass) {
      if (fallbackClassTop3 && fallbackClassTop3.length > 0) {
        return fallbackClassTop3.map((e) => ({
          studentId: e.studentId,
          name: e.name,
          grade: targetGrade ?? '',
          className: targetClass ?? '',
          score: e.score,
          rank: e.rank,
        }));
      }
      return schoolRanked;
    }
    const sameClass = schoolRanked.filter(
      (s) => gradesMatch(s.grade, targetGrade) && classesMatch(s.className, targetClass)
    );
    return sameClass.map((s, i) => ({ ...s, rank: i + 1 }));
  }, [schoolRanked, targetGrade, targetClass, fallbackClassTop3]);

  const activeList = tab === 'school' ? schoolRanked : tab === 'grade' ? gradeRanked : classRanked;

  const currentRank = useMemo(() => {
    if (!currentStudentId) return tab === 'class' ? fallbackClassRank : null;
    const found = activeList.find((s) => s.studentId === currentStudentId);
    return found ? found.rank : tab === 'class' ? fallbackClassRank : null;
  }, [activeList, currentStudentId, tab, fallbackClassRank]);

  const topStudents = useMemo(() => {
    return activeList.slice(0, 5);
  }, [activeList]);

  const tabLabels: Record<RankTab, { title: string; subtitle: string; icon: typeof Users }> = {
    class: {
      title: 'ترتيبي على فصلي',
      subtitle: targetClass && targetGrade ? `${targetGrade} — فصل ${targetClass}` : 'فصلك',
      icon: Users,
    },
    grade: {
      title: 'ترتيبي على الصف',
      subtitle: targetGrade ? `الصف: ${targetGrade}` : 'صفك بالكامل',
      icon: School,
    },
    school: {
      title: 'ترتيبي على المدرسة',
      subtitle: 'جميع صفوف وفصول المدرسة',
      icon: Trophy,
    },
  };

  if (!isLoading && allStudents.length === 0 && fallbackClassRank == null && (!fallbackClassTop3 || fallbackClassTop3.length === 0)) {
    return null;
  }

  return (
    <div className="glass-card p-5 space-y-4" dir="rtl">
      {/* ─── ترويسة البطاقة ─── */}
      <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gold-500/15 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-gold-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">لوحة المتصدرين</h3>
            <p className="text-white/40 text-[11px]">{tabLabels[tab].subtitle}</p>
          </div>
        </div>

        <Link
          to="/leaderboard"
          className="text-xs text-gold-400 hover:text-gold-300 flex items-center gap-1 font-medium transition-colors"
        >
          <span>عرض الكل</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ─── التبويبات الثلاثة ─── */}
      <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1">
        {([
          { id: 'class' as RankTab, label: 'ترتيبي على فصلي', icon: Users, count: classRanked.length },
          { id: 'grade' as RankTab, label: 'ترتيبي على الصف', icon: School, count: gradeRanked.length },
          { id: 'school' as RankTab, label: 'ترتيبي على المدرسة', icon: Star, count: schoolRanked.length },
        ]).map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all',
                isActive
                  ? 'bg-gold-500/20 text-gold-300 shadow-sm border border-gold-500/30'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.02]',
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.label}</span>
              {t.count > 0 && (
                <span
                  className={clsx(
                    'text-[10px] rounded-full px-1.5 py-px font-mono font-bold leading-4',
                    isActive ? 'bg-gold-500/30 text-gold-200' : 'bg-white/10 text-white/40',
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── بطاقة الترتيب الحالي للطالب ─── */}
      <div className="bg-gradient-to-r from-gold-500/10 via-amber-500/5 to-transparent border border-gold-500/20 rounded-xl p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center text-gold-300">
            {currentRank === 1 ? (
              <Crown className="w-5 h-5 text-gold-400" />
            ) : currentRank && currentRank <= 3 ? (
              <Medal className="w-5 h-5 text-gold-400" />
            ) : (
              <Trophy className="w-4 h-4 text-gold-400" />
            )}
          </div>
          <div>
            <p className="text-white font-bold text-xs">{tabLabels[tab].title}</p>
            <p className="text-white/40 text-[10px]">
              {activeList.length > 0 ? `من إجمالي ${activeList.length} طالب` : 'جارِ حساب الترتيب...'}
            </p>
          </div>
        </div>

        <div className="text-left">
          <span className="text-xl font-black text-gold-400 font-mono">
            {currentRank != null ? `#${currentRank}` : '—'}
          </span>
          <p className="text-white/40 text-[10px]">مركزك الحالي</p>
        </div>
      </div>

      {/* ─── قائمة المتصدرين في النطاق المحدد ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-white/40 text-[11px] px-1">
          <span>أوائل {tab === 'class' ? 'الفصل' : tab === 'grade' ? 'الصف' : 'المدرسة'}</span>
          <span>النقاط</span>
        </div>

        {topStudents.length === 0 ? (
          <p className="text-white/30 text-xs text-center py-3">لا توجد نقاط مسجلة بعد لهذا النطاق</p>
        ) : (
          topStudents.map((entry, i) => {
            const isMe = currentStudentId && entry.studentId === currentStudentId;
            return (
              <div
                key={entry.studentId}
                className={clsx(
                  'flex items-center justify-between gap-2 p-2.5 rounded-xl text-xs transition-colors',
                  isMe
                    ? 'bg-gold-500/15 border border-gold-500/30 text-gold-200'
                    : 'bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 text-white',
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-5 flex items-center justify-center shrink-0">
                    {i === 0 ? (
                      <Crown className="w-4 h-4 text-gold-400" />
                    ) : (
                      <Medal className={clsx('w-4 h-4', MEDAL_COLORS[i] ?? 'text-white/30')} />
                    )}
                  </div>
                  <span className="font-mono text-white/40 text-[11px] w-4 shrink-0">#{entry.rank}</span>
                  <div className="min-w-0">
                    <p className={clsx('font-medium truncate text-xs', isMe ? 'text-gold-300 font-bold' : 'text-white')}>
                      {entry.name}
                      {isMe && <span className="text-gold-400 text-[10px] mr-1.5">(أنت)</span>}
                    </p>
                    {tab !== 'class' && (
                      <p className="text-white/30 text-[10px] truncate">
                        {entry.grade} {entry.className ? `— ${entry.className}` : ''}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-left shrink-0">
                  <span className="text-gold-400 font-mono font-bold tabular-nums">
                    {entry.score.toLocaleString('ar-SA')}
                  </span>
                  <span className="text-white/30 text-[10px] mr-1">ن</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── زر التوجيه للوحة المتصدرين الكاملة ─── */}
      <Link
        to="/leaderboard"
        className="block text-center py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-gold-500/10 border border-white/10 hover:border-gold-500/30 text-white/70 hover:text-gold-300 text-xs font-semibold transition-all"
      >
        فتح لوحة المتصدرين الشاملة لجميع الفصول ←
      </Link>
    </div>
  );
}
