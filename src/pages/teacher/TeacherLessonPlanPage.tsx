import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Rocket, Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import {
  fetchTeacherLessonPlans,
  saveLessonPlan,
  launchLessonPlan,
  deleteLessonPlan,
} from '../../lib/lessonPlan';
import {
  fetchTeacherClassAssignmentsByUserId,
} from '../../lib/teacherScope';
import { fetchTeacherSubjectAssignments } from '../../lib/teacherAnalytics';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { showSuccess, showError } from '../../lib/toast';

/** T9 — خطة الدرس + اختبار قصير */
export function TeacherLessonPlanPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [grade, setGrade] = useState('');
  const [className, setClassName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [title, setTitle] = useState('');
  const [examId, setExamId] = useState('');
  const [notes, setNotes] = useState('');

  const { data: assignments = [] } = useQuery({
    queryKey: ['teacher', 'classes', user?.id],
    queryFn: () => fetchTeacherClassAssignmentsByUserId(user!.id),
    enabled: !!user,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['teacher', 'subjects', user?.id],
    queryFn: () => fetchTeacherSubjectAssignments(user!.id),
    enabled: !!user,
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['teacher', 'lesson-plans', user?.id],
    queryFn: () => fetchTeacherLessonPlans(user!.id),
    enabled: !!user,
  });

  const { data: exams = [] } = useQuery({
    queryKey: ['teacher', 'exams-list', grade],
    queryFn: async () => {
      let q = supabase.from('exams').select('id, title, grade, subject_name').eq('is_active', true);
      if (grade) q = q.eq('grade', grade);
      const { data, error } = await q.order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!grade,
  });

  const grades = [...new Set(assignments.map((a) => a.grade))];
  const classesForGrade = assignments.filter((a) => a.grade === (grade || grades[0]));
  const subjectOptions = subjects.filter((s) => s.grade === (grade || grades[0]));

  const saveMutation = useMutation({
    mutationFn: () =>
      saveLessonPlan(user!.id, {
        grade: grade || grades[0],
        class_name: className || classesForGrade[0]?.class_name || '',
        subject_name: subjectName || subjectOptions[0]?.subject_name || 'عام',
        lesson_title: title,
        lesson_date: today,
        linked_exam_id: examId || null,
        notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'lesson-plans'] });
      showSuccess('تم حفظ خطة الدرس');
      setTitle('');
      setNotes('');
    },
    onError: (e: Error) => showError(e),
  });

  const launchMutation = useMutation({
    mutationFn: launchLessonPlan,
    onSuccess: (n) => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'lesson-plans'] });
      showSuccess(`تم إشعار ${n} طالب/ة بالاختبار القصير`);
    },
    onError: (e: Error) => showError(e),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLessonPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'lesson-plans'] });
      showSuccess('تم الحذف');
    },
  });

  if (isLoading) return <TapHandLoader label="جاري التحميل..." fullScreen />;

  const todayPlans = plans.filter((p) => p.lesson_date === today);

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        icon={BookOpen}
        title="خطة الدرس اليوم"
        subtitle="T9 — درس → اختبار قصير → إشعار الطلاب"
      />

      <div className="glass-card p-5 space-y-4">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-gold-400" />
          درس جديد — {today}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={grade || grades[0] || ''}
            onChange={(e) => setGrade(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
          >
            {grades.map((g) => (
              <option key={g} value={g} className="bg-navy-950">{g}</option>
            ))}
          </select>
          <select
            value={className || classesForGrade[0]?.class_name || ''}
            onChange={(e) => setClassName(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
          >
            {classesForGrade.map((c) => (
              <option key={c.class_name} value={c.class_name} className="bg-navy-950">{c.class_name}</option>
            ))}
          </select>
          <select
            value={subjectName || subjectOptions[0]?.subject_name || ''}
            onChange={(e) => setSubjectName(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
          >
            {subjectOptions.length === 0 ? (
              <option value="عام" className="bg-navy-950">عام</option>
            ) : (
              subjectOptions.map((s) => (
                <option key={s.id} value={s.subject_name} className="bg-navy-950">{s.subject_name}</option>
              ))
            )}
          </select>
          <select
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
          >
            <option value="" className="bg-navy-950">بدون اختبار مرتبط</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id} className="bg-navy-950">{e.title}</option>
            ))}
          </select>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان الدرس (مثال: الكسور العشرية)"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ملاحظات..."
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm resize-none"
        />
        <Button
          disabled={!title.trim() || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          حفظ الخطة
        </Button>
      </div>

      <div className="space-y-3">
        <h3 className="text-white font-semibold text-sm">خطط اليوم</h3>
        {todayPlans.length === 0 ? (
          <p className="text-white/30 text-sm">لا توجد خطط لليوم</p>
        ) : (
          todayPlans.map((p) => (
            <div
              key={p.id}
              className="glass-card p-4 flex items-center justify-between gap-3 flex-wrap"
            >
              <div>
                <p className="text-white font-bold text-sm">{p.lesson_title}</p>
                <p className="text-white/40 text-xs">
                  {p.grade} — {p.class_name} · {p.subject_name}
                  {p.launched_at && ' · مُطلَق'}
                </p>
              </div>
              <div className="flex gap-2">
                {!p.launched_at && (
                  <Button
                    size="sm"
                    icon={<Rocket className="w-4 h-4" />}
                    disabled={launchMutation.isPending}
                    onClick={() => launchMutation.mutate(p.id)}
                  >
                    إطلاق الاختبار
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(p.id)}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-red-400/70 hover:text-red-300 hover:bg-red-500/10"
                  aria-label="حذف الخطة"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
