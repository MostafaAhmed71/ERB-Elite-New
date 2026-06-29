import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Crown, Award, AlertTriangle, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { DbStudent } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { SelectFilter } from '../../components/ui';
import { EmptyState } from '../../components/ui/EmptyState';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { sumRawApprovedPoints, getLevelInfo, type PointEntry } from '../../lib/calculations';
import {
  fetchTeacherClassAssignmentsByUserId,
  filterStudentsByAssignments,
} from '../../lib/teacherScope';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { itemVariants } from '../../lib/motionVariants';

interface RankedStudent extends DbStudent {
  weightedScore: number;
  rank: number;
  weekPoints: number;
}

const RANK_ICON = (rank: number) => {
  if (rank === 1) return <Crown className="w-5 h-5 text-gold-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="text-white/30 font-mono text-sm w-5 text-center">{rank}</span>;
};

export function ClassBoardPage() {
  const { user } = useAuthStore();
  const [gradeFilter, setGradeFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: ranked = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['teacher', 'class-board', user?.id],
    queryFn: async () => {
      const assignments = user ? await fetchTeacherClassAssignmentsByUserId(user.id) : [];

      const { data: studentsData, error: studentErr } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .order('full_name');
      if (studentErr) throw studentErr;

      let students = studentsData as DbStudent[];
      if (assignments.length > 0) {
        students = filterStudentsByAssignments(students, assignments);
      }

      if (students.length === 0) return [];

      const ids = students.map((s) => s.id);

      const { data: ledgerData, error: ledgerErr } = await supabase
        .from('points_ledger')
        .select('student_id, points, status, activity_id, created_at, activities (name, category)')
        .in('student_id', ids)
        .eq('status', 'approved');
      if (ledgerErr) throw ledgerErr;

      const ledgerByStudent: Record<string, PointEntry[]> = {};
      const weekPointsByStudent: Record<string, number> = {};

      (ledgerData ?? []).forEach((item) => {
        const sid = item.student_id as string;
        if (!ledgerByStudent[sid]) ledgerByStudent[sid] = [];
        ledgerByStudent[sid].push(item as unknown as PointEntry);

        const created = new Date(item.created_at as string);
        if (created >= weekAgo) {
          weekPointsByStudent[sid] = (weekPointsByStudent[sid] ?? 0) + Number(item.points);
        }
      });

      return students
        .map((s) => ({
          ...s,
          weightedScore: sumRawApprovedPoints(ledgerByStudent[s.id] ?? []),
          weekPoints: weekPointsByStudent[s.id] ?? 0,
          rank: 0,
        }))
        .sort((a, b) => b.weightedScore - a.weightedScore)
        .map((s, i) => ({ ...s, rank: i + 1 })) as RankedStudent[];
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const grades = [...new Set(ranked.map((s) => s.grade))].sort();
  const classes = [
    ...new Set(
      ranked.filter((s) => gradeFilter === '' || s.grade === gradeFilter).map((s) => s.class_name),
    ),
  ].sort();

  const filtered = ranked.filter((s) => {
    const matchGrade = gradeFilter === '' || s.grade === gradeFilter;
    const matchClass = classFilter === '' || s.class_name === classFilter;
    return matchGrade && matchClass;
  });

  const inactiveThisWeek = filtered.filter((s) => s.weekPoints === 0);
  const top3 = filtered.slice(0, 3);

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <PageHeader
        title="لوحة الفصل الذكية"
        subtitle="ترتيب مباشر · منح بنقرة · تنبيهات أسبوعية"
        icon={Trophy}
        badge={filtered.length > 0 ? `${filtered.length} طالب` : undefined}
      />

      {dataUpdatedAt > 0 && (
        <p className="text-white/25 text-[10px] flex items-center gap-1">
          <Zap className="w-3 h-3" />
          تحديث تلقائي كل 30 ثانية
        </p>
      )}

      {inactiveThisWeek.length > 0 && (
        <div className="glass-card p-4 flex items-start gap-3 border border-amber-500/20 bg-amber-500/5">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-amber-200 text-sm font-medium">
              {inactiveThisWeek.length} طالب بلا نقاط هذا الأسبوع
            </p>
            <p className="text-white/40 text-xs mt-1">
              {inactiveThisWeek
                .slice(0, 4)
                .map((s) => s.full_name)
                .join(' · ')}
              {inactiveThisWeek.length > 4 ? '...' : ''}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <SelectFilter
          value={gradeFilter}
          onChange={(v) => {
            setGradeFilter(v);
            setClassFilter('');
          }}
          placeholder="كل الصفوف"
          options={grades.map((g) => ({ value: g, label: g }))}
        />
        <SelectFilter
          value={classFilter}
          onChange={setClassFilter}
          placeholder="كل الفصول"
          options={classes.map((c) => ({ value: c, label: c }))}
        />
        <Link
          to="/points/grant"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-500/15 border border-gold-500/30 text-gold-300 text-sm font-semibold hover:bg-gold-500/25 transition-colors mr-auto"
        >
          <Award className="w-4 h-4" />
          منح سريع
        </Link>
      </div>

      {isLoading ? (
        <TapHandLoader label="جاري تحميل الفصل..." fullScreen />
      ) : filtered.length === 0 ? (
        <EmptyState
          illustration="students"
          title="لا يوجد طلاب في الفصل"
          description="سيظهر ترتيب طلاب فصولك المسندة هنا"
        />
      ) : (
        <>
          {top3.length >= 3 && (
            <div className="flex items-end justify-center gap-6 py-4">
              {[top3[1], top3[0], top3[2]].map((s, idx) => {
                const heights = [96, 128, 80];
                const colors = ['bg-slate-400/20', 'bg-gold-400/20', 'bg-amber-700/20'];
                const textColors = ['text-slate-300', 'text-gold-400', 'text-amber-600'];
                return (
                  <motion.div
                    key={s.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    className={clsx('flex flex-col items-center gap-2', idx === 1 && '-mt-4')}
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-navy-700 to-navy-800 border border-white/10 flex items-center justify-center text-lg font-bold text-white">
                      {s.full_name.charAt(0)}
                    </div>
                    <p className="text-white text-sm font-medium text-center max-w-20 truncate">
                      {s.full_name}
                    </p>
                    <p className={clsx('font-bold', textColors[idx])}>{s.weightedScore}</p>
                    <div
                      className={clsx(
                        'w-16 rounded-t-xl flex items-center justify-center border border-white/10',
                        colors[idx],
                      )}
                      style={{ height: heights[idx] }}
                    >
                      {RANK_ICON(s.rank)}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 border-b border-white/5 text-white/40 font-medium">
                  <tr>
                    <th className="px-5 py-3 text-right w-12">#</th>
                    <th className="px-5 py-3 text-right">الطالب</th>
                    <th className="px-5 py-3 text-right">الصف / الفصل</th>
                    <th className="px-5 py-3 text-right">المستوى</th>
                    <th className="px-5 py-3 text-right">هذا الأسبوع</th>
                    <th className="px-5 py-3 text-left">النقاط</th>
                    <th className="px-5 py-3 text-center w-24">منح</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/70">
                  {filtered.map((s) => {
                    const level = getLevelInfo(s.weightedScore);
                    return (
                      <tr
                        key={s.id}
                        className={clsx(
                          'hover:bg-white/3 transition-colors',
                          s.rank <= 3 && 'bg-gradient-to-r from-gold-500/5 to-transparent',
                          s.weekPoints === 0 && 'bg-amber-500/3',
                        )}
                      >
                        <td className="px-5 py-3">{RANK_ICON(s.rank)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                              {s.full_name.charAt(0)}
                            </div>
                            <span className="text-white font-medium">{s.full_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-white/50 text-xs">
                          {s.grade} — {s.class_name}
                        </td>
                        <td className="px-5 py-3">
                          <span className={clsx('text-xs px-2 py-0.5 rounded-full border', level.badgeBg)}>
                            {level.name}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={clsx(
                              'text-xs font-mono tabular-nums',
                              s.weekPoints === 0 ? 'text-amber-400' : 'text-emerald-400',
                            )}
                          >
                            {s.weekPoints === 0 ? '—' : `+${s.weekPoints}`}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-left font-bold text-gold-400">
                          {s.weightedScore}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <Link
                            to={`/points/grant?studentId=${s.id}`}
                            className="inline-flex p-2 rounded-lg bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 transition-colors"
                            title="منح نقاط"
                          >
                            <Award className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
