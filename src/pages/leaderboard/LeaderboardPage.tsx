import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Medal, Crown, TrendingUp, Users, School, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { buildClassBulkRankings, fetchApprovedClassGrants } from '../../lib/classPoints';
import { embedOne, type Embed } from '../../lib/supabaseEmbeds';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { useAuthStore } from '../../stores/authStore';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { itemVariants } from '../../lib/motionVariants';

import { gradesMatch, classesMatch } from '../../lib/academic/gradeBridge';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

interface LeaderboardEntry {
  student_id: string;
  full_name: string;
  grade: string;
  class_name: string;
  total_points: number;
  rank: number;
}

const RANK_ICON = (rank: number) => {
  if (rank === 1) return <Crown className="w-5 h-5 text-gold-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="text-white/30 font-mono text-sm w-5 text-center">{rank}</span>;
};

const TOP_COLORS = ['#f59e0b', '#94a3b8', '#b45309'];

type LbTab = 'school' | 'grade' | 'class';

export function LeaderboardPage() {
  const { user } = useAuthStore();
  const [lbTab, setLbTab] = useState<LbTab>('school');

  // ─── بيانات الطالب الحالي ────────────────────────────────
  const { data: myProfile } = useQuery({
    queryKey: ['leaderboard', 'my-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, full_name, grade, class_name')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data as { id: string; full_name: string; grade: string; class_name: string } | null;
    },
    enabled: !!user,
  });

  // ─── جلب المتصدرين عبر الـ RPC العام (تجاوز قيود RLS) ──────
  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ['display_leaderboard_rpc'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('display_leaderboard');
      if (error) throw error;
      return (data ?? { students: [], classes: [] }) as {
        students: Array<{
          id: string;
          full_name: string;
          grade: string;
          class_name: string;
          photo_url: string | null;
          total_points: number;
        }>;
        classes: Array<{
          id: string;
          grade: string;
          class_name: string;
          total_points: number;
          grant_count: number;
          student_count: number;
        }>;
      };
    },
    staleTime: 30_000,
  });

  const rawStudents = leaderboardData?.students ?? [];
  const classBoard = leaderboardData?.classes ?? [];

  // ─── كل المدرسة ──────────────────────────────────────────
  const schoolRanked = useMemo(() => {
    const list: LeaderboardEntry[] = rawStudents.map((s, i) => ({
      student_id: s.id,
      full_name: s.full_name,
      grade: s.grade,
      class_name: s.class_name,
      total_points: s.total_points,
      rank: i + 1,
    }));

    // إذا كان الطالب الحالي غير موجود (ليس لديه نقاط بعد)، نضيفه في نهاية الترتيب
    if (myProfile && !list.some((s) => s.student_id === myProfile.id)) {
      list.push({
        student_id: myProfile.id,
        full_name: myProfile.full_name,
        grade: myProfile.grade,
        class_name: myProfile.class_name,
        total_points: 0,
        rank: list.length + 1,
      });
    }

    return list;
  }, [rawStudents, myProfile]);

  // ─── ترتيب على الصف (جميع فصول نفس الصف) ─────────────────
  const gradeRanked = useMemo(() => {
    if (!myProfile) return schoolRanked;
    const sameGrade = schoolRanked.filter((s) => gradesMatch(s.grade, myProfile.grade));
    return sameGrade.map((s, i) => ({ ...s, rank: i + 1 }));
  }, [schoolRanked, myProfile]);

  // ─── ترتيب على الفصل (نفس الصف ونفس الفصل) ───────────────
  const classRanked = useMemo(() => {
    if (!myProfile) return schoolRanked;
    const sameClass = schoolRanked.filter(
      (s) => gradesMatch(s.grade, myProfile.grade) && classesMatch(s.class_name, myProfile.class_name)
    );
    return sameClass.map((s, i) => ({ ...s, rank: i + 1 }));
  }, [schoolRanked, myProfile]);

  const displayList = lbTab === 'school' ? schoolRanked : lbTab === 'grade' ? gradeRanked : classRanked;

  // ─── ترتيب الطالب الحالي في كل نطاق ─────────────────────
  const myEntry = schoolRanked.find((s) => myProfile && s.student_id === myProfile.id);
  const mySchoolRank = myEntry?.rank ?? null;
  const myGradeRank  = gradeRanked.find((s) => myProfile && s.student_id === myProfile.id)?.rank ?? null;
  const myClassRank  = classRanked.find((s) => myProfile && s.student_id === myProfile.id)?.rank ?? null;

  const loading = isLoading;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6" dir="rtl">
      <PageHeader
        title="لوحة المتصدرين"
        subtitle="ترتيب الطلاب — يتحدّث تلقائياً عند اعتماد النقاط"
        icon={Trophy}
        badge={schoolRanked.length > 0 ? `${schoolRanked.length} طالب` : undefined}
      />

      {loading ? (
        <TapHandLoader label="جاري تحميل المتصدرين..." fullScreen />
      ) : schoolRanked.length === 0 ? (
        <EmptyState
          illustration="leaderboard"
          title="لا توجد نقاط معتمدة بعد"
          description="ستظهر لوحة المتصدرين عند اعتماد أول نقاط للطلاب"
        />
      ) : (
        <>
          {/* ─── بطاقة ترتيبي الشخصي ─── */}
          {myProfile && myEntry && (
            <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
              {[
                { label: 'ترتيبي على فصلي', rank: myClassRank, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                { label: 'ترتيبي على صفي',  rank: myGradeRank, icon: School, color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
                { label: 'ترتيبي على المدرسة', rank: mySchoolRank, icon: Star, color: 'text-gold-400',  bg: 'bg-gold-500/10 border-gold-500/20' },
              ].map((item) => (
                <div key={item.label} className={clsx('rounded-2xl border p-4 text-center', item.bg)}>
                  <item.icon className={clsx('w-5 h-5 mx-auto mb-1', item.color)} />
                  <p className={clsx('text-2xl font-black', item.color)}>
                    {item.rank != null ? `#${item.rank}` : '—'}
                  </p>
                  <p className="text-white/50 text-xs mt-1">{item.label}</p>
                </div>
              ))}
            </motion.div>
          )}

          {/* ─── تبويبات الترتيب ─── */}
          <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1 w-fit">
            {([
              { id: 'class'  as LbTab, label: 'ترتيبي على فصلي', icon: Users,   count: classRanked.length  },
              { id: 'grade'  as LbTab, label: 'ترتيبي على الصف',  icon: School,  count: gradeRanked.length  },
              { id: 'school' as LbTab, label: 'ترتيبي على المدرسة', icon: Trophy, count: schoolRanked.length },
            ]).map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setLbTab(tab.id)}
                  className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                    lbTab === tab.id ? 'bg-gold-500/20 text-gold-300 shadow-sm' : 'text-white/50 hover:text-white/80')}>
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  <span className={clsx('text-xs rounded-full px-1.5 font-bold leading-5',
                    lbTab === tab.id ? 'bg-gold-500/30 text-gold-200' : 'bg-white/10 text-white/50')}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ─── عنوان السياق ─── */}
          {lbTab !== 'school' && myProfile && (
            <p className="text-[#A3AED0] text-sm">
              {lbTab === 'class'
                ? `فصل: ${myProfile.grade} — ${myProfile.class_name}`
                : `صف: ${myProfile.grade}`}
            </p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ─── قائمة الطلاب ─── */}
            <motion.div variants={itemVariants} className="glass-card overflow-hidden">
              <div className="p-4 border-b border-white/5">
                <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-gold-400" />
                  {lbTab === 'class' ? 'ترتيب فصلك' : lbTab === 'grade' ? 'ترتيب صفك' : 'ترتيب المدرسة'}
                </h2>
              </div>
              {displayList.length === 0 ? (
                <EmptyState icon={Trophy} title="لا توجد بيانات" description="لا توجد نقاط لهذا النطاق بعد" className="py-8" />
              ) : (
                <>
                  {/* منصة المتصدرين الثلاثة الأوائل */}
                  {displayList.length >= 3 && (
                    <div className="flex items-end justify-center gap-4 py-6">
                      {[displayList[1], displayList[0], displayList[2]].map((s, podiumIdx) => {
                        const realRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
                        const targetHeights = [112, 144, 96];
                        const colors = ['bg-slate-400/20', 'bg-gold-400/20', 'bg-amber-700/20'];
                        const textColors = ['text-slate-300', 'text-gold-400', 'text-amber-600'];
                        const isMe = myEntry && s.student_id === myEntry.student_id;
                        return (
                          <motion.div key={s.student_id}
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, delay: podiumIdx * 0.1 }}
                            className={clsx('flex flex-col items-center gap-2', podiumIdx === 1 && '-mt-4')}>
                            <div className={clsx(
                              'w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg',
                              isMe ? 'bg-gradient-to-br from-gold-500 to-gold-700 ring-2 ring-gold-400' : 'bg-gradient-to-br from-navy-700 to-navy-800 border border-white/10'
                            )}>
                              {s.full_name.charAt(0)}
                            </div>
                            <p className="text-white text-sm font-medium text-center max-w-24 truncate">{s.full_name}</p>
                            <p className={clsx('font-bold text-lg', textColors[podiumIdx])}>{s.total_points}</p>
                            <motion.div
                              initial={{ height: 0 }} animate={{ height: targetHeights[podiumIdx] }}
                              transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.2 + podiumIdx * 0.1 }}
                              className={clsx('w-20 rounded-t-xl flex items-center justify-center border border-white/10 overflow-hidden', colors[podiumIdx])}>
                              <span className={clsx('text-2xl font-black', textColors[podiumIdx])}>{realRank}</span>
                            </motion.div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  <motion.div variants={containerVariants} className="overflow-y-auto max-h-[480px]">
                    {displayList.map((s) => {
                      const isMe = myEntry && s.student_id === myEntry.student_id;
                      return (
                        <motion.div key={s.student_id} variants={itemVariants}
                          whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                          className={clsx(
                            'flex items-center gap-4 px-4 py-3 border-b border-white/5 transition-colors',
                            s.rank <= 3 && 'bg-gradient-to-r from-gold-500/5 to-transparent',
                            isMe && 'bg-gold-500/10 border-r-2 border-r-gold-400',
                          )}>
                          <div className="w-6 flex items-center justify-center flex-shrink-0">{RANK_ICON(s.rank)}</div>
                          <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0',
                            isMe ? 'bg-gold-500 text-navy-900' : 'bg-gradient-to-br from-[var(--primary)] to-[var(--primary-secondary)] text-on-contrast')}>
                            {s.full_name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={clsx('text-sm font-medium', isMe ? 'text-gold-300' : 'text-white')}>
                              {s.full_name}{isMe && ' (أنت)'}
                            </p>
                            <p className="text-white/30 text-xs">{s.grade} — {s.class_name}</p>
                          </div>
                          <div className="text-left flex-shrink-0">
                            <p className={clsx('font-bold', s.rank === 1 ? 'text-gold-400' : s.rank === 2 ? 'text-slate-300' : s.rank === 3 ? 'text-amber-600' : 'text-white/70')}>
                              {s.total_points.toLocaleString('ar-SA')}
                            </p>
                            <p className="text-white/20 text-xs">نقطة</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </motion.div>

            {/* ─── ترتيب الفصول ─── */}
            <motion.div variants={itemVariants} className="glass-card overflow-hidden">
              <div className="p-4 border-b border-white/5">
                <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gold-400" /> ترتيب الفصول — المنح الجماعية
                </h2>
              </div>
              {classBoard.length > 0 ? (
                <div className="overflow-y-auto max-h-[560px]">
                  {classBoard.map((row, i) => {
                    const isMyClass = myProfile && row.grade === myProfile.grade && row.class_name === myProfile.class_name;
                    return (
                      <div key={i} className={clsx(
                        'flex items-center gap-3 px-4 py-3 border-b border-white/5',
                        isMyClass && 'bg-gold-500/10 border-r-2 border-r-gold-400',
                      )}>
                        <span className={clsx('w-6 text-center font-bold text-sm shrink-0',
                          i === 0 ? 'text-gold-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-white/30')}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={clsx('text-sm font-semibold', isMyClass ? 'text-gold-300' : 'text-white')}>
                            {row.grade} — فصل {row.class_name}{isMyClass ? ' (فصلك)' : ''}
                          </p>
                          <p className="text-white/30 text-xs">{row.student_count} طالب</p>
                        </div>
                        <div className="text-left shrink-0">
                          <p className="font-bold text-gold-400">{row.total_points.toLocaleString('ar-SA')}</p>
                          <p className="text-white/20 text-xs">نقطة</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={TrendingUp} title="لا توجد بيانات فصول" description="ستظهر بيانات الفصول عند تسجيل نقاط معتمدة" className="py-8" />
              )}
            </motion.div>
          </div>
        </>
      )}
    </motion.div>
  );
}
