import { useQuery } from '@tanstack/react-query';
import { Trophy, Medal, Crown, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { buildClassBulkRankings, fetchApprovedClassGrants } from '../../lib/classPoints';
import { embedOne, type Embed } from '../../lib/supabaseEmbeds';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { itemVariants } from '../../lib/motionVariants';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
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

export function LeaderboardPage() {
  const { data: students = [], isLoading } = useQuery({
    queryKey: ['leaderboard_students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_ledger')
        .select('student_id, points, students:student_id(full_name, grade, class_name)')
        .eq('status', 'approved');
      if (error) throw error;

      const map: Record<string, LeaderboardEntry> = {};
      for (const r of data ?? []) {
        const s = embedOne<{ full_name: string; grade: string; class_name: string }>((r as { students: Embed<{ full_name: string; grade: string; class_name: string }> }).students);
        if (!s) continue;
        if (!map[r.student_id]) {
          map[r.student_id] = { student_id: r.student_id, full_name: s.full_name, grade: s.grade, class_name: s.class_name, total_points: 0, rank: 0 };
        }
        map[r.student_id].total_points += r.points;
      }

      return Object.values(map)
        .sort((a, b) => b.total_points - a.total_points)
        .map((e, i) => ({ ...e, rank: i + 1 }));
    },
  });

  const { data: classBoard = [], isLoading: classLoading } = useQuery({
    queryKey: ['leaderboard_classes'],
    queryFn: async () => {
      const [classGrants, studentsRes] = await Promise.all([
        fetchApprovedClassGrants(),
        supabase.from('students').select('grade, class_name').eq('is_active', true),
      ]);
      if (studentsRes.error) throw studentsRes.error;

      const studentCountByClass = new Map<string, number>();
      for (const s of studentsRes.data ?? []) {
        const key = `${s.grade}__${s.class_name}`;
        studentCountByClass.set(key, (studentCountByClass.get(key) ?? 0) + 1);
      }

      return buildClassBulkRankings(classGrants, studentCountByClass).map((row) => ({
        grade: row.grade,
        class_name: row.class_name,
        total_points: row.totalPoints,
        student_count: row.studentCount,
        grant_count: row.grantCount,
      }));
    },
  });

  const loading = isLoading || classLoading;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
      dir="rtl"
    >
      <PageHeader
        title="لوحة المتصدرين"
        subtitle="ترتيب الطلاب والفصول — يتحدّث تلقائياً عند اعتماد النقاط"
        icon={Trophy}
        badge={students.length > 0 ? `${students.length} طالب` : undefined}
      />

      {loading ? (
        <TapHandLoader label="جاري تحميل المتصدرين..." fullScreen />
      ) : students.length === 0 ? (
        <EmptyState
          illustration="leaderboard"
          title="لا توجد نقاط معتمدة بعد"
          description="ستظهر لوحة المتصدرين عند اعتماد أول نقاط للطلاب"
        />
      ) : (
        <>
          {students.length >= 3 && (
            <div className="flex items-end justify-center gap-4 py-6">
              {[students[1], students[0], students[2]].map((s, podiumIdx) => {
                const realRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
                const targetHeights = [112, 144, 96];
                const colors = ['bg-slate-400/20', 'bg-gold-400/20', 'bg-amber-700/20'];
                const textColors = ['text-slate-300', 'text-gold-400', 'text-amber-600'];
                return (
                  <motion.div
                    key={s.student_id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: podiumIdx * 0.1 }}
                    className={clsx('flex flex-col items-center gap-2', podiumIdx === 1 && '-mt-4')}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy-700 to-navy-800 border border-white/10 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                      {s.full_name.charAt(0)}
                    </div>
                    <p className="text-white text-sm font-medium text-center max-w-24 truncate">{s.full_name}</p>
                    <p className={clsx('font-bold text-lg', textColors[podiumIdx])}>{s.total_points}</p>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: targetHeights[podiumIdx] }}
                      transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.2 + podiumIdx * 0.1 }}
                      className={clsx('w-20 rounded-t-xl flex items-center justify-center border border-white/10 overflow-hidden', colors[podiumIdx])}
                    >
                      <span className={clsx('text-2xl font-black', textColors[podiumIdx])}>{realRank}</span>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div variants={itemVariants} className="glass-card overflow-hidden">
              <div className="p-4 border-b border-white/5">
                <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-gold-400" /> ترتيب الطلاب
                </h2>
              </div>
              <motion.div variants={containerVariants} className="overflow-y-auto max-h-[480px]">
                {students.map((s) => (
                  <motion.div
                    key={s.student_id}
                    variants={itemVariants}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                    className={clsx(
                      'flex items-center gap-4 px-4 py-3 border-b border-white/5 transition-colors',
                      s.rank <= 3 && 'bg-gradient-to-r from-gold-500/5 to-transparent'
                    )}
                  >
                    <div className="w-6 flex items-center justify-center flex-shrink-0">
                      {RANK_ICON(s.rank)}
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {s.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{s.full_name}</p>
                      <p className="text-white/30 text-xs">{s.grade} — {s.class_name}</p>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className={clsx('font-bold', s.rank === 1 ? 'text-gold-400' : s.rank === 2 ? 'text-slate-300' : s.rank === 3 ? 'text-amber-600' : 'text-white/70')}>
                        {s.total_points.toLocaleString('ar-SA')}
                      </p>
                      <p className="text-white/20 text-xs">نقطة</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div variants={itemVariants} className="glass-card overflow-hidden">
              <div className="p-4 border-b border-white/5">
                <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gold-400" /> ترتيب الفصول — المنح الجماعية
                </h2>
              </div>
              {classBoard.length > 0 ? (
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={classBoard.slice(0, 8)} layout="vertical">
                      <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                      <YAxis dataKey="class_name" type="category" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} width={60} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0d1b3e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
                        formatter={(v) => [`${v?.toLocaleString('ar-SA')} نقطة`, 'منح جماعي']}
                        labelFormatter={(l) => `${l}`}
                      />
                      <Bar dataKey="total_points" radius={[0, 6, 6, 0]}>
                        {classBoard.slice(0, 8).map((_, i) => (
                          <Cell key={i} fill={i < 3 ? TOP_COLORS[i] : '#3b5ea6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState
                  icon={TrendingUp}
                  title="لا توجد بيانات فصول"
                  description="ستظهر بيانات الفصول عند تسجيل نقاط معتمدة"
                  className="py-8"
                />
              )}
            </motion.div>
          </div>
        </>
      )}
    </motion.div>
  );
}
