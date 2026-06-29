import { useQuery } from '@tanstack/react-query';
import { Award, FileDown, Trophy } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../../lib/supabase';
import { useStudentMetrics } from '../../hooks/useStudentMetrics';
import { AchievementBadges } from './AchievementBadges';
import { printStudentPortfolio } from '../../lib/studentPortfolio';
import { showError } from '../../lib/toast';

type Props = {
  studentId: string;
  studentName: string;
  grade: string;
  className: string;
};

export function StudentPortfolio({ studentId, studentName, grade, className }: Props) {
  const metrics = useStudentMetrics(studentId);

  const { data: topExams = [] } = useQuery({
    queryKey: ['student', 'portfolio-exams', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_results')
        .select('score, max_score, submitted_at, exams(title, subject_name)')
        .eq('student_id', studentId)
        .order('score', { ascending: false })
        .limit(5);
      if (error) throw error;

      return (data ?? [])
        .map((row) => {
          const meta = row.exams as { title: string; subject_name?: string } | { title: string; subject_name?: string }[] | null;
          const exam = Array.isArray(meta) ? meta[0] : meta;
          const max = Number(row.max_score) || 1;
          return {
            title: exam?.title ?? 'اختبار',
            subject: exam?.subject_name ?? '—',
            scorePct: Math.round((Number(row.score) / max) * 100),
            date: new Date(row.submitted_at as string).toLocaleDateString('ar-SA'),
          };
        })
        .sort((a, b) => b.scorePct - a.scorePct)
        .slice(0, 3);
    },
    enabled: !!studentId,
  });

  const earnedCount = metrics.achievements.filter((a) => a.earned).length;

  const handleExport = () => {
    if (metrics.isLoading) {
      showError(new Error('البيانات لم تُحمَّل بعد'), 'انتظر اكتمال التحميل');
      return;
    }

    printStudentPortfolio({
      studentName,
      grade,
      className,
      totalPoints: metrics.totalPoints,
      levelName: metrics.level.name,
      classRank: metrics.classRank,
      achievements: metrics.achievements,
      topExams,
      axes: {
        activity: metrics.breakdown.activity,
        behavior: metrics.breakdown.behavior,
        achievement: metrics.breakdown.achievement,
        initiative: metrics.breakdown.initiative,
        attendance: metrics.breakdown.attendance,
      },
    });
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="glass-card p-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold-400" />
            محفظة إنجازاتي
          </h2>
          <p className="text-white/40 text-xs mt-1">
            شارات · أفضل نتائج · تصدير PDF للمشاركة
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={metrics.isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-500/15 border border-gold-500/30 text-gold-300 text-xs font-semibold hover:bg-gold-500/25 transition-colors disabled:opacity-50"
        >
          <FileDown className="w-4 h-4" />
          تصدير PDF
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4 text-center">
          <p className="text-white/40 text-[10px]">النقاط</p>
          <p className="text-2xl font-bold text-gold-400 font-mono tabular-nums">{metrics.totalPoints}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-white/40 text-[10px]">المستوى</p>
          <p className="text-lg font-bold text-white">{metrics.level.name}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-white/40 text-[10px]">الشارات</p>
          <p className="text-2xl font-bold text-emerald-400 font-mono">
            {earnedCount}/{metrics.achievements.length}
          </p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-white/40 text-[10px]">الترتيب</p>
          <p className="text-2xl font-bold text-white font-mono">
            {metrics.classRank != null ? `#${metrics.classRank}` : '—'}
          </p>
        </div>
      </div>

      <div className="glass-card p-5">
        <AchievementBadges achievements={metrics.achievements} />
      </div>

      {topExams.length > 0 && (
        <div className="glass-card p-5 space-y-3">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-400" />
            أفضل نتائج الاختبارات
          </h3>
          <div className="space-y-2">
            {topExams.map((exam, i) => (
              <div
                key={`${exam.title}-${i}`}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/3 border border-white/5"
              >
                <div className="min-w-0">
                  <p className="text-white text-sm truncate">{exam.title}</p>
                  <p className="text-white/35 text-[10px]">{exam.subject} · {exam.date}</p>
                </div>
                <span
                  className={clsx(
                    'text-sm font-bold font-mono tabular-nums shrink-0',
                    exam.scorePct >= 80 ? 'text-emerald-400' : exam.scorePct >= 60 ? 'text-amber-400' : 'text-white/60',
                  )}
                >
                  {exam.scorePct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
