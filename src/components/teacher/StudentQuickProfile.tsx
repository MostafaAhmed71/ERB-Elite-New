import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Award, ClipboardList, StickyNote, Trash2, TrendingDown, User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { DbStudent } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { BarsLoader } from '../ui/BarsLoader';
import { getCategoryBreakdown, getLevelInfo, type PointEntry } from '../../lib/calculations';
import { AXES_KEYS } from '../../lib/pointsReference';
import { showSuccess, showError } from '../../lib/toast';
import clsx from 'clsx';
import { RtiPanel } from '../shared/RtiPanel';
import { computeExamSkillBreakdown } from '../../lib/examAnalytics';
import type { DbSkill, ExamResultDetail } from '../../types';

type StudentQuickProfileProps = {
  student: DbStudent | null;
  open: boolean;
  onClose: () => void;
};

const AXIS_COLORS: Record<string, string> = {
  activity: 'bg-blue-500',
  behavior: 'bg-emerald-500',
  achievement: 'bg-purple-500',
  initiative: 'bg-amber-500',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  approved: { label: 'معتمد', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  pending: { label: 'معلّق', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  rejected: { label: 'مرفوض', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
};

export function StudentQuickProfile({ student, open, onClose }: StudentQuickProfileProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState('');

  const studentId = student?.id;

  const { data: ledger = [], isLoading: ledgerLoading } = useQuery({
    queryKey: ['teacher', 'student-ledger', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_ledger')
        .select(`
          id, points, status, activity_id, created_at, note, rejection_reason,
          activities (name, category),
          granted_by_user:users!points_ledger_granted_by_fkey (full_name)
        `)
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as unknown as (PointEntry & {
        note: string | null;
        rejection_reason: string | null;
        created_at: string;
        granted_by_user: { full_name: string } | null;
      })[];
    },
    enabled: !!studentId && open,
  });

  const { data: lastExam, isLoading: examLoading } = useQuery({
    queryKey: ['teacher', 'student-last-exam', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_results')
        .select('score, max_score, submitted_at, details, exams (title, subject_name)')
        .eq('student_id', studentId!)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as {
        score: number;
        max_score: number;
        submitted_at: string;
        details?: ExamResultDetail[] | null;
        exams: { title: string; subject_name?: string } | null;
      } | null;
    },
    enabled: !!studentId && open,
  });

  const { data: skills = [] } = useQuery({
    queryKey: ['skills-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('skills').select('id, skill_name, subject_name');
      if (error) throw error;
      return data as DbSkill[];
    },
    enabled: open && !!lastExam?.details?.length,
  });

  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['teacher', 'student-notes', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_student_notes')
        .select('*')
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!studentId && open,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user || !studentId) throw new Error('غير مصرح');
      const { data: teacher, error: teacherErr } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (teacherErr) throw teacherErr;

      const { error } = await supabase.from('teacher_student_notes').insert({
        teacher_id: teacher.id,
        student_id: studentId,
        note: text.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNoteText('');
      showSuccess('تم حفظ الملاحظة');
      queryClient.invalidateQueries({ queryKey: ['teacher', 'student-notes', studentId] });
    },
    onError: (e: Error) => showError(e),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('teacher_student_notes')
        .delete()
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'student-notes', studentId] });
    },
    onError: (e: Error) => showError(e),
  });

  if (!student) return null;

  const breakdown = getCategoryBreakdown(ledger);
  const level = getLevelInfo(breakdown.weighted);
  const isLoading = ledgerLoading || examLoading;

  const skillMap = new Map(skills.map((s) => [s.id, { skill_name: s.skill_name, subject_name: s.subject_name }]));
  const examWeaknesses =
    lastExam?.details?.length
      ? computeExamSkillBreakdown(
          lastExam.details,
          skillMap,
          lastExam.exams?.subject_name,
        ).filter((s) => s.mastery_pct < 60)
      : [];

  const axes = [
    { key: 'activity', label: AXES_KEYS.activity, value: breakdown.activity, weight: '40%' },
    { key: 'behavior', label: AXES_KEYS.behavior, value: breakdown.behavior, weight: '30%' },
    { key: 'achievement', label: AXES_KEYS.achievement, value: breakdown.achievement, weight: '20%' },
    { key: 'initiative', label: AXES_KEYS.initiative, value: breakdown.initiative, weight: '10%' },
  ] as const;

  return (
    <Modal open={open} onClose={onClose} title="ملف الطالب السريع" size="lg">
      <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
        {/* Student header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {student.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-lg">{student.full_name}</h3>
            <p className="text-white/40 text-sm font-mono">{student.admission_number}</p>
            <p className="text-white/50 text-xs mt-0.5">
              {student.grade} — {student.class_name}
            </p>
          </div>
          <div className="text-left shrink-0">
            <p className="text-2xl font-bold text-gold-400">{breakdown.weighted}</p>
            <span className={clsx('text-xs px-2 py-0.5 rounded-full border', level.badgeBg)}>
              {level.name}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <BarsLoader label="جاري التحميل..." />
          </div>
        ) : (
          <>
            {/* Weighted breakdown */}
            <div className="glass-card p-4 space-y-3">
              <h4 className="text-white/70 text-sm font-medium flex items-center gap-2">
                <Award className="w-4 h-4 text-gold-400" />
                توزيع النقاط المرجّحة
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {axes.map(axis => (
                  <div key={axis.key} className="bg-white/3 rounded-xl p-3">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-white/60 text-xs">{axis.label}</span>
                      <span className="text-white/30 text-[10px]">{axis.weight}</span>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-white font-bold text-lg">{axis.value}</span>
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={clsx('h-full rounded-full', AXIS_COLORS[axis.key])}
                          style={{ width: `${Math.min(axis.value, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Last exam */}
            <div className="glass-card p-4">
              <h4 className="text-white/70 text-sm font-medium flex items-center gap-2 mb-3">
                <ClipboardList className="w-4 h-4 text-gold-400" />
                آخر اختبار
              </h4>
              {lastExam ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{lastExam.exams?.title ?? 'اختبار'}</p>
                      <p className="text-white/30 text-xs mt-0.5">
                        {new Date(lastExam.submitted_at).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-gold-400 font-bold text-xl">
                        {lastExam.score}/{lastExam.max_score}
                      </p>
                      <p className="text-white/30 text-xs">
                        {lastExam.max_score > 0
                          ? `${Math.round((Number(lastExam.score) / lastExam.max_score) * 100)}%`
                          : '—'}
                      </p>
                    </div>
                  </div>
                  {examWeaknesses.length > 0 && (
                    <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 p-3 space-y-2">
                      <p className="text-amber-300 text-[10px] font-semibold flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        مهارات تحتاج مراجعة (T4)
                      </p>
                      <ul className="space-y-1">
                        {examWeaknesses.slice(0, 4).map((s) => (
                          <li key={s.skill_id} className="flex items-center justify-between text-[11px] text-white/70">
                            <span className="truncate ml-2">{s.skill_name}</span>
                            <span className="text-amber-400 font-mono shrink-0">
                              {s.correct}/{s.total} ({s.mastery_pct}%)
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-white/30 text-sm">لم يُجرَ أي اختبار بعد</p>
              )}
            </div>

            {/* Recent ledger */}
            <div className="glass-card p-4">
              <h4 className="text-white/70 text-sm font-medium mb-3">آخر عمليات النقاط</h4>
              {ledger.length === 0 ? (
                <p className="text-white/30 text-sm">لا توجد نقاط مسجّلة</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {ledger.slice(0, 8).map(entry => {
                    const status = STATUS_LABELS[entry.status] ?? STATUS_LABELS.pending;
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0"
                      >
                        <span className="text-gold-400 font-bold text-sm w-8 shrink-0">
                          {entry.points > 0 ? '+' : ''}{entry.points}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/70 text-xs truncate">
                            {entry.activities?.name ?? 'نشاط'}
                          </p>
                          {entry.status === 'rejected' && entry.rejection_reason && (
                            <p className="text-red-400/70 text-[10px] truncate">
                              {entry.rejection_reason}
                            </p>
                          )}
                        </div>
                        <span className={clsx('text-[10px] px-2 py-0.5 rounded-full border shrink-0', status.color)}>
                          {status.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* RTI intervention */}
        {student && (
          <RtiPanel studentId={student.id} studentName={student.full_name} />
        )}

        {/* Private notes */}
        <div className="glass-card p-4">
          <h4 className="text-white/70 text-sm font-medium flex items-center gap-2 mb-3">
            <StickyNote className="w-4 h-4 text-gold-400" />
            ملاحظات خاصة (للمعلم فقط)
          </h4>
          <div className="flex gap-2 mb-3">
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="أضف ملاحظة عن الطالب..."
              rows={2}
              className="flex-1 bg-navy-950/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-gold-400/40 resize-none"
            />
            <Button
              size="sm"
              disabled={!noteText.trim() || addNoteMutation.isPending}
              onClick={() => addNoteMutation.mutate(noteText)}
            >
              حفظ
            </Button>
          </div>
          {notesLoading ? (
            <div className="py-4 flex justify-center">
              <BarsLoader compact label="" />
            </div>
          ) : notes.length === 0 ? (
            <p className="text-white/30 text-xs">لا توجد ملاحظات بعد</p>
          ) : (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {notes.map(n => (
                <div
                  key={n.id}
                  className="flex items-start gap-2 bg-white/3 rounded-lg px-3 py-2 group"
                >
                  <p className="text-white/70 text-xs flex-1">{n.note}</p>
                  <span className="text-white/20 text-[10px] shrink-0">
                    {new Date(n.created_at).toLocaleDateString('ar-SA')}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteNoteMutation.mutate(n.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition-all p-0.5"
                    aria-label="حذف"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-white/5">
          <Link
            to={`/points/grant?studentId=${student.id}`}
            className="flex-1"
            onClick={onClose}
          >
            <Button variant="primary" className="w-full" icon={<Award className="w-4 h-4" />}>
              منح نقاط
            </Button>
          </Link>
          <Button variant="secondary" onClick={onClose} icon={<User className="w-4 h-4" />}>
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
}
