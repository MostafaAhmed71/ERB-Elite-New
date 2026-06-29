import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookMarked, Plus, Trash2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { getSubjectIcon, getSubjectColorClasses } from '../../lib/subjectMeta';
import { supabase } from '../../lib/supabase';
import { logAction } from '../../lib/auth';
import { useAuthStore } from '../../stores/authStore';
import { mergeGradeLists } from '../../lib/schoolClasses';
import { useGradeClassCatalog, useSyncedGrade } from '../../hooks/useGradeClassCatalog';
import { GradeTabs } from '../../components/shared/GradeTabs';
import { SUBJECT_PRESETS, getSkillsForSubject } from '../../lib/subjectSkillsCatalog';
import { seedSkillsForSubject, deleteSkillsForSubject } from '../../lib/subjectSkills';
import type { DbGradeSubject, DbSkill } from '../../types';
import { toast } from 'react-hot-toast';
import { BarsLoader } from '../../components/ui/BarsLoader';
import { TeacherSubjectsPanel } from '../../components/supervisor/TeacherSubjectsPanel';
import clsx from 'clsx';

export function SubjectsByGradePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: catalog } = useGradeClassCatalog();
  const [subjectName, setSubjectName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['grade-subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grade_subjects')
        .select('*')
        .order('grade')
        .order('subject_name');
      if (error) throw error;
      return data as DbGradeSubject[];
    },
  });

  const { data: skills = [] } = useQuery({
    queryKey: ['skills', 'by-grade'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .not('grade', 'is', null)
        .order('grade')
        .order('subject_name')
        .order('skill_name');
      if (error) throw error;
      return data as DbSkill[];
    },
  });

  const skillsForSubject = (grade: string, name: string) =>
    skills.filter((s) => s.grade === grade && s.subject_name === name);

  const addMutation = useMutation({
    mutationFn: async () => {
      const name = subjectName.trim();
      if (!name) throw new Error('اسم المادة مطلوب');

      const { error } = await supabase.from('grade_subjects').insert({
        grade: activeGrade,
        subject_name: name,
        created_by: user!.id,
      });
      if (error) throw error;

      const count = await seedSkillsForSubject(activeGrade, name, user!.id);

      await logAction('GRADE_SUBJECT_ADDED', 'grade_subjects', undefined, {
        grade: activeGrade,
        subject_name: name,
        skills_seeded: count,
      });

      return count;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['grade-subjects'] });
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      setSubjectName('');
      toast.success(
        count > 0
          ? `تمت إضافة المادة وإنشاء ${count} مهارة تلقائياً`
          : 'تمت إضافة المادة'
      );
    },
    onError: (e: Error) => {
      if (e.message.includes('duplicate') || e.message.includes('unique')) {
        toast.error('هذه المادة مسجّلة مسبقاً لهذا الصف');
      } else {
        toast.error(e.message || 'حدث خطأ أثناء الإضافة');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (subject: DbGradeSubject) => {
      await deleteSkillsForSubject(subject.grade, subject.subject_name);
      const { error } = await supabase.from('grade_subjects').delete().eq('id', subject.id);
      if (error) throw error;
      await logAction('GRADE_SUBJECT_DELETED', 'grade_subjects', subject.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-subjects'] });
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      setExpandedId(null);
      toast.success('تم حذف المادة ومهاراتها');
    },
    onError: () => toast.error('تعذّر حذف المادة'),
  });

  const grades = useMemo(
    () => mergeGradeLists(catalog?.grades, subjects.map((s) => s.grade)),
    [catalog?.grades, subjects]
  );
  const [activeGrade, setActiveGrade] = useSyncedGrade(grades);

  const previewSkills = useMemo(
    () => (subjectName.trim() ? getSkillsForSubject(activeGrade, subjectName.trim()) : []),
    [activeGrade, subjectName]
  );

  const gradeSubjects = subjects.filter((s) => s.grade === activeGrade);
  const subjectNames = gradeSubjects.map((s) => s.subject_name);

  const seedAllCurriculumMutation = useMutation({
    mutationFn: async () => {
      for (const preset of SUBJECT_PRESETS) {
        const exists = subjects.some((s) => s.grade === activeGrade && s.subject_name === preset);
        if (exists) continue;
        const { error } = await supabase.from('grade_subjects').insert({
          grade: activeGrade,
          subject_name: preset,
          created_by: user!.id,
        });
        if (error && !error.message.includes('unique')) throw error;
        await seedSkillsForSubject(activeGrade, preset, user!.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-subjects'] });
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      toast.success('تم استيراد مواد ومهارات المنهج السعودي');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookMarked className="w-6 h-6 text-gold-400" />
          المواد حسب الصف
        </h1>
        <p className="text-white/40 text-sm mt-1">
          عند إضافة مادة يتم التعرف على مهاراتها تلقائياً من مكتبة المنهج السعودي
        </p>
        <button
          type="button"
          onClick={() => seedAllCurriculumMutation.mutate()}
          disabled={seedAllCurriculumMutation.isPending || !activeGrade}
          className="mt-3 flex items-center gap-2 px-4 py-2 text-xs border border-gold-400/30 text-gold-300 rounded-xl hover:bg-gold-500/10 disabled:opacity-40"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {seedAllCurriculumMutation.isPending ? 'جاري الاستيراد...' : 'استيراد كل مواد المنهج لهذا الصف'}
        </button>
      </div>

      <GradeTabs
        grades={grades}
        activeGrade={activeGrade}
        onChange={setActiveGrade}
        getBadge={(grade) => subjects.filter((s) => s.grade === grade).length}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addMutation.mutate();
        }}
        className="bg-navy-900/50 border border-white/8 rounded-2xl p-5 space-y-4"
      >
        <p className="text-white/60 text-sm">
          إضافة مادة لـ <span className="text-gold-400 font-medium">{activeGrade}</span>
        </p>

        <div className="flex flex-wrap gap-2">
          {SUBJECT_PRESETS.map((preset) => {
            const PresetIcon = getSubjectIcon(preset);
            const presetColors = getSubjectColorClasses(preset);
            return (
            <button
              key={preset}
              type="button"
              onClick={() => setSubjectName(preset)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all',
                subjectName === preset
                  ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
              )}
            >
              <PresetIcon className={clsx('w-3.5 h-3.5', subjectName === preset ? 'text-cyan-200' : presetColors.text)} />
              {preset}
            </button>
            );
          })}
        </div>

        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            list="subject-presets"
            placeholder="اختر مادة أو اكتب اسم مادة جديدة..."
            className="flex-1 min-w-48 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 text-sm"
          />
          <datalist id="subject-presets">
            {SUBJECT_PRESETS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <button
            type="submit"
            disabled={addMutation.isPending || !subjectName.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 rounded-xl font-semibold text-sm hover:shadow-lg disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {addMutation.isPending ? 'جاري الإضافة...' : 'إضافة مادة'}
          </button>
        </div>

        {previewSkills.length > 0 && (
          <div className="p-4 bg-cyan-500/5 border border-cyan-500/15 rounded-xl">
            <p className="text-cyan-300/80 text-xs flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              سيتم إنشاء {previewSkills.length} مهارة تلقائياً:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {previewSkills.map((s) => (
                <span
                  key={s.skill_name}
                  className="px-2 py-1 rounded-lg bg-white/5 text-white/60 text-xs border border-white/8"
                >
                  {s.skill_name}
                </span>
              ))}
            </div>
          </div>
        )}
      </form>

      <div className="bg-navy-900/50 border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-white font-semibold text-sm">مواد {activeGrade}</h2>
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center">
            <BarsLoader label="جاري تحميل المواد..." />
          </div>
        ) : gradeSubjects.length === 0 ? (
          <div className="p-10 text-center text-white/30 text-sm">
            لا توجد مواد لهذا الصف بعد. أضف أول مادة من الأعلى.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {gradeSubjects.map((subject) => {
              const subjectSkills = skillsForSubject(subject.grade, subject.subject_name);
              const isOpen = expandedId === subject.id;
              const SubjectIcon = getSubjectIcon(subject.subject_name);
              const subjectColors = getSubjectColorClasses(subject.subject_name);

              return (
                <li key={subject.id} className="hover:bg-white/3 transition-colors">
                  <div className="flex items-center justify-between px-5 py-3.5 group">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : subject.id)}
                      className="flex items-center gap-3 flex-1 text-right"
                    >
                      <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', subjectColors.bg)}>
                        <SubjectIcon className={clsx('w-4 h-4', subjectColors.text)} />
                      </div>
                      <div>
                        <span className="text-white font-medium text-sm block">
                          {subject.subject_name}
                        </span>
                        <span className="text-white/35 text-xs flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {subjectSkills.length} مهارة
                        </span>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-white/30 mr-2" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-white/30 mr-2" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `حذف مادة "${subject.subject_name}" وكل مهاراتها (${subjectSkills.length})؟`
                          )
                        ) {
                          deleteMutation.mutate(subject);
                        }
                      }}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                      title="حذف المادة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="px-5 pb-4 pr-16">
                      {subjectSkills.length === 0 ? (
                        <p className="text-white/30 text-xs">لا توجد مهارات بعد</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {subjectSkills.map((skill) => (
                            <li
                              key={skill.id}
                              className="text-white/60 text-xs flex items-start gap-2"
                            >
                              <span className="text-gold-400/60 mt-0.5">•</span>
                              <span>
                                <span className="text-white/80">{skill.skill_name}</span>
                                {skill.description && (
                                  <span className="text-white/35"> — {skill.description}</span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <TeacherSubjectsPanel activeGrade={activeGrade} subjects={subjectNames} />
    </div>
  );
}
