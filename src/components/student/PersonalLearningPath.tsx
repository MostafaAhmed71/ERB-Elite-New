import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Target, BookOpen, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { computeStudentWeaknesses } from '../../lib/examAnalytics';
import { buildPersonalLearningPath } from '../../lib/learningPath';
import type { AxisBreakdown } from '../../lib/calculations';
import type { DbSkill } from '../../types';

const STORAGE_KEY = 'learning-path-progress';

function readProgress(studentId: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-${studentId}`);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeProgress(studentId: string, progress: Record<string, number>) {
  try {
    localStorage.setItem(`${STORAGE_KEY}-${studentId}`, JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

type Props = {
  studentId: string;
  breakdown: AxisBreakdown;
};

export function PersonalLearningPath({ studentId, breakdown }: Props) {
  const [progress, setProgress] = useState(() => readProgress(studentId));

  useEffect(() => {
    setProgress(readProgress(studentId));
  }, [studentId]);

  const { data: tasks = [] } = useQuery({
    queryKey: ['student', 'learning-path', studentId],
    queryFn: async () => {
      const [resultsRes, skillsRes] = await Promise.all([
        supabase.from('exam_results').select('details').eq('student_id', studentId),
        supabase.from('skills').select('*'),
      ]);
      if (resultsRes.error) throw resultsRes.error;
      if (skillsRes.error) throw skillsRes.error;

      const weaknesses = computeStudentWeaknesses(
        resultsRes.data ?? [],
        (skillsRes.data ?? []) as DbSkill[],
      );
      return buildPersonalLearningPath(weaknesses, breakdown);
    },
    enabled: !!studentId,
  });

  const toggleStep = (taskId: string, target: number) => {
    const current = progress[taskId] ?? 0;
    const next = current >= target ? 0 : current + 1;
    const updated = { ...progress, [taskId]: next };
    setProgress(updated);
    writeProgress(studentId, updated);
  };

  if (tasks.length === 0) return null;

  return (
    <div className="glass-card p-5 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-cyan-400" />
        <h3 className="text-white font-semibold text-sm">مسار تعلمي شخصي</h3>
      </div>
      <p className="text-white/40 text-[11px]">
        خطة عمل مبنية على نقاط ضعفك في الاختبارات والمحاور
      </p>

      <div className="space-y-3">
        {tasks.map((task) => {
          const done = (progress[task.id] ?? 0) >= task.targetCount;
          const current = progress[task.id] ?? 0;
          return (
            <div
              key={task.id}
              className="p-4 rounded-xl bg-white/3 border border-white/8 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium">{task.title}</p>
                  <p className="text-white/45 text-xs mt-1">{task.description}</p>
                </div>
                {done && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => toggleStep(task.id, task.targetCount)}
                  className="text-[11px] px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/25 text-cyan-300 hover:bg-cyan-500/25 transition-colors"
                >
                  {done ? 'إعادة' : `تم خطوة (${current}/${task.targetCount})`}
                </button>
                {task.kind === 'skill' && (
                  <Link
                    to="/student/exams"
                    className="inline-flex items-center gap-1 text-[11px] text-gold-400 hover:text-gold-300"
                  >
                    <BookOpen className="w-3 h-3" />
                    تدريب
                    <ChevronLeft className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
