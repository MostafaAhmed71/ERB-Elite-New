import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList, Plus, CheckSquare, Square, Power, PowerOff,
  FilePlus, List, Pencil, ChevronLeft, Trash2, Calendar, Copy,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { GradeSubjectPicker, skillsForGradeSubject } from '../../components/supervisor/GradeSubjectPicker';
import { useGradeClassCatalog, useSyncedGrade } from '../../hooks/useGradeClassCatalog';
import { toDatetimeLocalValue, fromDatetimeLocalValue } from '../../lib/examSchedule';
import { DiagnosticExamBanner } from '../../components/supervisor/DiagnosticExamBanner';
import { EXAM_TYPE_LABELS, type ExamType } from '../../lib/examAnalytics';
import { EXAM_PRESETS } from '../../lib/examTemplates';
import { ADAPTIVE_QUESTION_COUNT } from '../../lib/adaptiveExam';
import type { DbExam, DbQuestion, DbSkill } from '../../types';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';
import { DocumentPageLoader } from '../../components/ui/DocumentPageLoader';

type PageMode = 'menu' | 'create' | 'manage';

export function ExamBuilderPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: catalog } = useGradeClassCatalog();
  const [mode, setMode] = useState<PageMode>('menu');
  const [activeGrade, setActiveGrade] = useSyncedGrade(catalog?.grades ?? []);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeExam, setActiveExam] = useState<DbExam | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newExamType, setNewExamType] = useState<ExamType>('formative');
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [filterGrade, setFilterGrade] = useState<string>('');
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [scheduleStarts, setScheduleStarts] = useState('');
  const [scheduleEnds, setScheduleEnds] = useState('');
  const [durationMin, setDurationMin] = useState<number | ''>('');
  const [allowReview, setAllowReview] = useState(true);

  useEffect(() => {
    if (!activeExam) return;
    setScheduleStarts(toDatetimeLocalValue(activeExam.starts_at));
    setScheduleEnds(toDatetimeLocalValue(activeExam.ends_at));
    setDurationMin(activeExam.duration_min ?? '');
    setAllowReview(activeExam.allow_review ?? true);
  }, [activeExam?.id]);

  const { data: skills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data, error } = await supabase.from('skills').select('*').order('skill_name');
      if (error) throw error;
      return data as DbSkill[];
    },
  });

  const subjectSkills = activeSubject
    ? skillsForGradeSubject(skills, activeGrade, activeSubject)
    : [];
  const skillIds = subjectSkills.map(s => s.id);

  const { data: allExams = [], isLoading: examsLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbExam[];
    },
  });

  const { data: questionCounts = {}, isLoading: countsLoading } = useQuery({
    queryKey: ['exam_question_counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exam_questions').select('exam_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const id = (row as { exam_id: string }).exam_id;
        counts[id] = (counts[id] ?? 0) + 1;
      }
      return counts;
    },
  });

  const examsForSubject = activeSubject
    ? allExams.filter(e => e.grade === activeGrade && e.subject_name === activeSubject)
    : [];

  const filteredExams = allExams.filter(e => {
    if (filterGrade && e.grade !== filterGrade) return false;
    if (filterSubject && e.subject_name !== filterSubject) return false;
    return true;
  });

  const allSubjects = [...new Set(allExams.map(e => e.subject_name).filter(Boolean))] as string[];

  const { data: questions = [] } = useQuery({
    queryKey: ['questions', activeGrade, activeSubject],
    queryFn: async () => {
      if (!activeSubject || skillIds.length === 0) return [];
      const { data, error } = await supabase
        .from('questions')
        .select('*, skills:skill_id(subject_name, skill_name)')
        .in('skill_id', skillIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (DbQuestion & { skills: { subject_name: string; skill_name: string } | null })[];
    },
    enabled: !!activeSubject && skillIds.length > 0 && !!activeExam,
  });

  useQuery({
    queryKey: ['exam_questions', activeExam?.id],
    queryFn: async () => {
      if (!activeExam) return [];
      const { data, error } = await supabase.from('exam_questions').select('question_id').eq('exam_id', activeExam.id);
      if (error) throw error;
      const ids = (data ?? []).map((r: { question_id: string }) => r.question_id);
      setSelectedQuestions(ids);
      return ids;
    },
    enabled: !!activeExam,
  });

  const createExamMutation = useMutation({
    mutationFn: async () => {
      if (!user || !newTitle.trim() || !activeSubject) throw new Error('أدخل عنوان الاختبار واختر المادة');
      const { data, error } = await supabase.from('exams').insert({
        title: newTitle,
        grade: activeGrade,
        subject_name: activeSubject,
        exam_type: newExamType,
        created_by: user.id,
        is_active: false,
        academic_year: new Date().getFullYear().toString(),
      }).select().single();
      if (error) throw error;
      return data as DbExam;
    },
    onSuccess: (exam) => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setActiveExam(exam);
      setNewTitle('');
      toast.success('تم إنشاء الاختبار — اختر الأسئلة ثم احفظ');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createAdaptiveExamMutation = useMutation({
    mutationFn: async () => {
      if (!user || !activeSubject) throw new Error('اختر المادة أولاً');
      const title = newTitle.trim() || `اختبار تكيفي — ${activeSubject}`;
      const { data: exam, error } = await supabase.from('exams').insert({
        title,
        grade: activeGrade,
        subject_name: activeSubject,
        exam_type: 'adaptive',
        created_by: user.id,
        is_active: false,
        academic_year: new Date().getFullYear().toString(),
        description: 'adaptive-pool',
      }).select().single();
      if (error) throw error;

      if (skillIds.length > 0) {
        const { data: pool } = await supabase
          .from('questions')
          .select('id')
          .in('skill_id', skillIds)
          .limit(30);
        const inserts = (pool ?? []).map((q, i) => ({
          exam_id: exam.id,
          question_id: q.id,
          order_index: i,
        }));
        if (inserts.length > 0) {
          await supabase.from('exam_questions').insert(inserts);
        }
      }
      return exam as DbExam;
    },
    onSuccess: (exam) => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setActiveExam(exam);
      setNewTitle('');
      toast.success(`اختبار تكيفي — يختار ${ADAPTIVE_QUESTION_COUNT} أسئلة حسب ضعف كل طالب`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateExamMutation = useMutation({
    mutationFn: async (source: DbExam) => {
      if (!user) throw new Error('غير مصرح');
      const { data: exam, error } = await supabase.from('exams').insert({
        title: `${source.title} (نسخة)`,
        grade: source.grade,
        subject_name: source.subject_name,
        exam_type: source.exam_type,
        created_by: user.id,
        is_active: false,
        duration_min: source.duration_min,
        allow_review: source.allow_review,
        academic_year: new Date().getFullYear().toString(),
      }).select().single();
      if (error) throw error;

      const { data: eq } = await supabase
        .from('exam_questions')
        .select('question_id, order_index')
        .eq('exam_id', source.id);
      if (eq && eq.length > 0) {
        await supabase.from('exam_questions').insert(
          eq.map((row) => ({ exam_id: exam.id, question_id: row.question_id, order_index: row.order_index })),
        );
      }
      return exam as DbExam;
    },
    onSuccess: (exam) => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['exam_question_counts'] });
      if (exam.grade) setActiveGrade(exam.grade);
      if (exam.subject_name) setActiveSubject(exam.subject_name);
      setActiveExam(exam);
      setMode('manage');
      toast.success('تم نسخ الاختبار — يمكنك تعديله ونشره');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createFromPresetMutation = useMutation({
    mutationFn: async (presetKey: string) => {
      if (!user || !activeSubject) throw new Error('اختر المادة أولاً');
      const preset = EXAM_PRESETS.find((p) => p.key === presetKey);
      if (!preset) throw new Error('قالب غير معروف');
      const { data, error } = await supabase.from('exams').insert({
        title: preset.titleTemplate(activeSubject),
        grade: activeGrade,
        subject_name: activeSubject,
        exam_type: preset.exam_type,
        template_label: preset.label,
        is_template: false,
        duration_min: preset.duration_min,
        created_by: user.id,
        is_active: false,
        academic_year: new Date().getFullYear().toString(),
      }).select().single();
      if (error) throw error;
      return data as DbExam;
    },
    onSuccess: (exam) => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setActiveExam(exam);
      toast.success('تم إنشاء الاختبار من القالب — اختر الأسئلة');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveQuestionsMutation = useMutation({
    mutationFn: async () => {
      if (!activeExam) return;
      await supabase.from('exam_questions').delete().eq('exam_id', activeExam.id);
      if (selectedQuestions.length > 0) {
        const inserts = selectedQuestions.map((qId, i) => ({ exam_id: activeExam.id, question_id: qId, order_index: i }));
        const { error } = await supabase.from('exam_questions').insert(inserts);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('تم حفظ أسئلة الاختبار');
      queryClient.invalidateQueries({ queryKey: ['exam_questions'] });
      queryClient.invalidateQueries({ queryKey: ['exam_question_counts'] });
      if (activeExam && !activeExam.is_active && selectedQuestions.length > 0) {
        toast('اضغط «نشر للطلاب» ليظهر الاختبار في حساب الطلاب', { icon: '📢', duration: 5000 });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!activeExam) return;
      const { data, error } = await supabase
        .from('exams')
        .update({
          starts_at: fromDatetimeLocalValue(scheduleStarts),
          ends_at: fromDatetimeLocalValue(scheduleEnds),
          duration_min: durationMin === '' ? null : Number(durationMin),
          allow_review: allowReview,
        })
        .eq('id', activeExam.id)
        .select()
        .single();
      if (error) throw error;
      return data as DbExam;
    },
    onSuccess: (exam) => {
      setActiveExam(exam ?? null);
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success('تم حفظ جدولة الاختبار');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteExamMutation = useMutation({
    mutationFn: async (examId: string) => {
      const { error } = await supabase.from('exams').delete().eq('id', examId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['exam_question_counts'] });
      setActiveExam(null);
      setSelectedQuestions([]);
      toast.success('تم حذف الاختبار');
    },
    onError: (e: Error) => toast.error(e.message || 'تعذّر حذف الاختبار — قد يكون مرتبطاً بنتائج طلاب'),
  });

  const handleDeleteExam = (exam: DbExam) => {
    if (!confirm(`هل تريد حذف اختبار «${exam.title}»؟\nسيتم حذف أسئلته ونتائجه المرتبطة.`)) return;
    deleteExamMutation.mutate(exam.id);
  };

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ exam, activate }: { exam: DbExam; activate: boolean }) => {
      const qCount = questionCounts[exam.id] ?? 0;
      if (activate && qCount === 0) {
        throw new Error('أضف أسئلة واحفظها قبل نشر الاختبار للطلاب');
      }
      if (activate && exam.grade && exam.subject_name) {
        await supabase
          .from('exams')
          .update({ is_active: false })
          .eq('grade', exam.grade)
          .eq('subject_name', exam.subject_name);
        const { error } = await supabase.from('exams').update({ is_active: true }).eq('id', exam.id);
        if (error) throw error;
      } else if (activate) {
        const { error } = await supabase.from('exams').update({ is_active: true }).eq('id', exam.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('exams').update({ is_active: false }).eq('id', exam.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, { activate }) => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success(activate ? 'تم نشر الاختبار — سيظهر للطلاب الآن' : 'تم إيقاف الاختبار');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleQuestion = (id: string) => {
    setSelectedQuestions(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const openExamForEdit = (exam: DbExam) => {
    if (exam.grade) setActiveGrade(exam.grade);
    if (exam.subject_name) setActiveSubject(exam.subject_name);
    setActiveExam(exam);
    setMode('manage');
  };

  const handleGradeChange = (grade: string) => {
    setActiveGrade(grade);
    setActiveSubject(null);
    setActiveExam(null);
    setSelectedQuestions([]);
  };

  const handleSubjectChange = (subject: string) => {
    setActiveSubject(subject);
    setActiveExam(null);
    setSelectedQuestions([]);
  };

  const examCountBySubject = (grade: string, subjectName: string) => {
    const count = allExams.filter(e => e.grade === grade && e.subject_name === subjectName).length;
    return count > 0 ? `${count} اختبار` : '';
  };

  const initialLoading = skillsLoading || examsLoading || countsLoading;

  const renderQuestionEditor = () => {
    if (!activeExam) return null;
    if (subjectSkills.length === 0) {
      return (
        <div className="flex items-center justify-center min-h-48 p-8">
          <p className="text-white/30 text-sm">لا توجد مهارات أو أسئلة لهذه المادة</p>
        </div>
      );
    }
    return (
      <>
        {!activeExam.is_active && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs leading-relaxed">
            هذا الاختبار <strong>مسودة</strong> ولن يظهر للطلاب حتى تضغط «نشر للطلاب» بعد حفظ الأسئلة.
          </div>
        )}
        <div className="p-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-white font-medium">{activeExam.title}</p>
            <p className="text-white/40 text-xs">{selectedQuestions.length} سؤال محدد — {activeGrade} / {activeSubject}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => toggleActiveMutation.mutate({ exam: activeExam, activate: !activeExam.is_active })}
              disabled={toggleActiveMutation.isPending || (!activeExam.is_active && (questionCounts[activeExam.id] ?? 0) === 0 && selectedQuestions.length === 0)}
              className={clsx(
                'px-4 py-2 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all',
                activeExam.is_active
                  ? 'border border-white/10 text-white/60 hover:text-white'
                  : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
              )}
            >
              {activeExam.is_active ? 'إيقاف النشر' : 'نشر للطلاب'}
            </button>
            <button type="button" onClick={() => saveQuestionsMutation.mutate()} disabled={saveQuestionsMutation.isPending}
              className="px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 rounded-xl font-semibold text-sm disabled:opacity-50">
              {saveQuestionsMutation.isPending ? 'جاري...' : 'حفظ الأسئلة'}
            </button>
          </div>
        </div>
        <div className="mx-4 mb-4 p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
          <p className="text-white/60 text-xs font-semibold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            جدولة الاختبار وإعدادات التسليم
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="space-y-1">
              <span className="text-white/40 text-[10px]">بدء الاختبار</span>
              <input
                type="datetime-local"
                value={scheduleStarts}
                onChange={(e) => setScheduleStarts(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
              />
            </label>
            <label className="space-y-1">
              <span className="text-white/40 text-[10px]">انتهاء الاختبار</span>
              <input
                type="datetime-local"
                value={scheduleEnds}
                onChange={(e) => setScheduleEnds(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
              />
            </label>
            <label className="space-y-1">
              <span className="text-white/40 text-[10px]">مدة الحل (دقيقة)</span>
              <input
                type="number"
                min={1}
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="بدون حد"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
              />
            </label>
            <label className="flex items-end gap-2 pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowReview}
                onChange={(e) => setAllowReview(e.target.checked)}
                className="rounded border-white/20"
              />
              <span className="text-white/60 text-xs">وضع المراجعة بعد التسليم</span>
            </label>
          </div>
          <button
            type="button"
            onClick={() => saveScheduleMutation.mutate()}
            disabled={saveScheduleMutation.isPending}
            className="px-4 py-2 bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 rounded-xl text-xs font-semibold disabled:opacity-50"
          >
            {saveScheduleMutation.isPending ? 'جاري الحفظ...' : 'حفظ الجدولة'}
          </button>
        </div>
        <div className="p-3 overflow-y-auto max-h-[480px] space-y-2">
          {questions.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">لا توجد أسئلة في بنك الأسئلة لهذه المادة</p>
          ) : questions.map(q => {
            const selected = selectedQuestions.includes(q.id);
            return (
              <div key={q.id} onClick={() => toggleQuestion(q.id)}
                className={clsx('flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all',
                  selected ? 'bg-gold-500/10 border border-gold-500/20' : 'hover:bg-white/5 border border-transparent'
                )}>
                {selected ? <CheckSquare className="w-5 h-5 text-gold-400 flex-shrink-0 mt-0.5" /> : <Square className="w-5 h-5 text-white/20 flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">{q.question_text}</p>
                  <p className="text-white/30 text-xs mt-1">{q.skills?.skill_name} • {q.type}</p>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  if (initialLoading) {
    return <DocumentPageLoader label="جاري تحميل الاختبارات..." fullScreen />;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-gold-400" /> إدارة الاختبارات
        </h1>
        {mode !== 'menu' && (
          <button
            type="button"
            onClick={() => { setMode('menu'); setActiveExam(null); }}
            className="text-white/50 hover:text-white text-sm flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            القائمة الرئيسية
          </button>
        )}
      </div>

      <DiagnosticExamBanner />

      {mode === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <button
            type="button"
            onClick={() => { setMode('create'); setActiveExam(null); setActiveSubject(null); }}
            className="group bg-navy-900/50 border border-white/10 hover:border-gold-400/40 rounded-2xl p-8 text-right transition-all hover:bg-gold-500/5"
          >
            <div className="w-14 h-14 rounded-2xl bg-gold-500/15 flex items-center justify-center mb-4 group-hover:bg-gold-500/25 transition-all">
              <FilePlus className="w-7 h-7 text-gold-400" />
            </div>
            <h2 className="text-white font-bold text-lg mb-2">إنشاء اختبار جديد</h2>
            <p className="text-white/40 text-sm leading-relaxed">اختر الصف والمادة، أنشئ الاختبار، وحدّد الأسئلة من بنك الأسئلة</p>
          </button>
          <button
            type="button"
            onClick={() => { setMode('manage'); setActiveExam(null); }}
            className="group bg-navy-900/50 border border-white/10 hover:border-cyan-400/40 rounded-2xl p-8 text-right transition-all hover:bg-cyan-500/5"
          >
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 flex items-center justify-center mb-4 group-hover:bg-cyan-500/25 transition-all">
              <List className="w-7 h-7 text-cyan-400" />
            </div>
            <h2 className="text-white font-bold text-lg mb-2">الاختبارات المنشأة</h2>
            <p className="text-white/40 text-sm leading-relaxed">
              عرض وتعديل ونشر الاختبارات ({allExams.length} اختبار)
            </p>
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="space-y-6">
          <GradeSubjectPicker
            activeGrade={activeGrade}
            activeSubject={activeSubject}
            onGradeChange={handleGradeChange}
            onSubjectChange={handleSubjectChange}
            getSubjectBadge={examCountBySubject}
          />
          {!activeSubject ? (
            <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-12 text-center">
              <p className="text-white/40 text-sm">اختر الصف ثم المادة لبدء إنشاء الاختبار</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-navy-900/50 border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-white/50 text-xs mb-2">{activeGrade} — {activeSubject}</p>
                  <div className="flex flex-col gap-2">
                    <select
                      value={newExamType}
                      onChange={(e) => setNewExamType(e.target.value as ExamType)}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                    >
                      {(Object.keys(EXAM_TYPE_LABELS) as ExamType[]).map((t) => (
                        <option key={t} value={t}>{EXAM_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                    <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                      placeholder="عنوان الاختبار الجديد..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 text-sm" />
                    <button type="button" onClick={() => createExamMutation.mutate()} disabled={createExamMutation.isPending || !newTitle.trim()}
                      className="p-2 bg-gold-500/15 hover:bg-gold-500/25 border border-gold-500/25 text-gold-400 rounded-xl transition-all disabled:opacity-50">
                      <Plus className="w-4 h-4" />
                    </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => createAdaptiveExamMutation.mutate()}
                      disabled={createAdaptiveExamMutation.isPending}
                      className="w-full py-2 text-xs border border-purple-400/30 text-purple-300 rounded-xl hover:bg-purple-500/10 disabled:opacity-50"
                    >
                      إنشاء اختبار تكيفي (يركز على نقاط الضعف)
                    </button>
                    <div className="pt-2 border-t border-white/5 space-y-1.5">
                      <p className="text-white/40 text-[10px]">قوالب جاهزة</p>
                      {EXAM_PRESETS.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => createFromPresetMutation.mutate(p.key)}
                          disabled={createFromPresetMutation.isPending}
                          className="w-full py-2 text-xs border border-cyan-400/20 text-cyan-300/90 rounded-xl hover:bg-cyan-500/10 disabled:opacity-50 text-right px-3"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto">
                  {examsForSubject.length === 0 ? (
                    <p className="text-white/30 text-sm text-center py-8">لا توجد اختبارات لهذه المادة بعد</p>
                  ) : examsForSubject.map(exam => (
                    <div key={exam.id}
                      className={clsx('flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all',
                        activeExam?.id === exam.id ? 'bg-gold-500/15 border border-gold-500/25' : 'hover:bg-white/5 border border-transparent'
                      )}
                      onClick={() => setActiveExam(exam)}>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{exam.title}</p>
                        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full border mt-0.5 inline-block',
                          exam.is_active ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-white/5 border-white/10 text-white/35'
                        )}>
                          {exam.is_active ? 'منشور' : 'مسودة'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-2 bg-navy-900/50 border border-white/5 rounded-2xl overflow-hidden">
                {!activeExam ? (
                  <div className="flex items-center justify-center min-h-64">
                    <p className="text-white/30 text-sm">أنشئ اختباراً جديداً أو اختر واحداً للتعديل</p>
                  </div>
                ) : renderQuestionEditor()}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'manage' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm appearance-none">
              <option value="" className="bg-navy-900">كل الصفوف</option>
              {(catalog?.grades ?? []).map((g) => (
                <option key={g} value={g} className="bg-navy-900">{g}</option>
              ))}
            </select>
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm appearance-none">
              <option value="" className="bg-navy-900">كل المواد</option>
              {allSubjects.map(s => <option key={s} value={s} className="bg-navy-900">{s}</option>)}
            </select>
          </div>

          <div className="bg-navy-900/50 border border-white/5 rounded-2xl overflow-hidden">
            {filteredExams.length === 0 ? (
              <div className="p-12 text-center text-white/30 text-sm">لا توجد اختبارات</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-right text-white/40 font-medium">الاختبار</th>
                      <th className="px-4 py-3 text-right text-white/40 font-medium">الصف</th>
                      <th className="px-4 py-3 text-right text-white/40 font-medium">المادة</th>
                      <th className="px-4 py-3 text-right text-white/40 font-medium">الأسئلة</th>
                      <th className="px-4 py-3 text-right text-white/40 font-medium">الحالة</th>
                      <th className="px-4 py-3 text-right text-white/40 font-medium">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredExams.map(exam => (
                      <tr key={exam.id} className={clsx('hover:bg-white/3 transition-colors', activeExam?.id === exam.id && 'bg-gold-500/5')}>
                        <td className="px-4 py-3 text-white font-medium">{exam.title}</td>
                        <td className="px-4 py-3 text-white/50">{exam.grade ?? '—'}</td>
                        <td className="px-4 py-3 text-white/50">{exam.subject_name ?? '—'}</td>
                        <td className="px-4 py-3 text-white/60">{questionCounts[exam.id] ?? 0}</td>
                        <td className="px-4 py-3">
                          <span className={clsx('text-xs px-2 py-0.5 rounded-full border',
                            exam.is_active ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-white/5 border-white/10 text-white/40'
                          )}>
                            {exam.is_active ? 'منشور' : 'مسودة'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => openExamForEdit(exam)}
                              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" title="تعديل">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => duplicateExamMutation.mutate(exam)}
                              className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20" title="نسخ الاختبار">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button type="button"
                              onClick={() => toggleActiveMutation.mutate({ exam, activate: !exam.is_active })}
                              className={clsx('p-1.5 rounded-lg transition-all',
                                exam.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/30'
                              )}
                              title={exam.is_active ? 'إيقاف' : 'نشر'}>
                              {exam.is_active ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                            </button>
                            <button type="button"
                              onClick={() => handleDeleteExam(exam)}
                              disabled={deleteExamMutation.isPending}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                              title="حذف">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {activeExam && (
            <div className="bg-navy-900/50 border border-gold-500/20 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <p className="text-white font-medium text-sm">تعديل: {activeExam.title}</p>
                <button type="button" onClick={() => setActiveExam(null)} className="text-white/40 hover:text-white text-xs">إغلاق</button>
              </div>
              {renderQuestionEditor()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
