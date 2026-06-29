import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAction } from '../../lib/auth';
import { useAuthStore } from '../../stores/authStore';
import { mergeGradeLists } from '../../lib/schoolClasses';
import { useGradeClassCatalog, useSyncedGrade } from '../../hooks/useGradeClassCatalog';
import { GradeTabs } from '../../components/shared/GradeTabs';
import type { DbSkill } from '../../types';
import { toast } from 'react-hot-toast';
import { BarsLoader } from '../../components/ui/BarsLoader';
import clsx from 'clsx';

interface SkillModalProps {
  skill: DbSkill | null;
  grade: string;
  subjectName: string;
  onClose: () => void;
  onSuccess: () => void;
}

function SkillModal({ skill, grade, subjectName, onClose, onSuccess }: SkillModalProps) {
  const { user } = useAuthStore();
  const isEdit = !!skill;
  const [form, setForm] = useState({
    skill_name: skill?.skill_name ?? '',
    description: skill?.description ?? '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        const { error } = await supabase
          .from('skills')
          .update({
            skill_name: form.skill_name,
            description: form.description || null,
          })
          .eq('id', skill!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('skills').insert({
          grade,
          subject_name: subjectName,
          skill_name: form.skill_name,
          description: form.description || null,
          created_by: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'تم التحديث' : 'تم الإنشاء');
      onSuccess();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-white font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gold-400" />
            {isEdit ? 'تعديل مهارة' : 'إضافة مهارة'}
          </h2>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white/80">✕</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="p-6 space-y-4">
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-sm space-y-1">
            <p className="text-white/40 text-xs">الصف</p>
            <p className="text-white">{grade}</p>
            <p className="text-white/40 text-xs mt-2">المادة</p>
            <p className="text-gold-400 font-medium">{subjectName}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-white/60 text-sm">اسم المهارة</label>
            <input
              value={form.skill_name}
              onChange={(e) => setForm({ ...form, skill_name: e.target.value })}
              required
              placeholder="مثال: الجمع والطرح"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-white/60 text-sm">وصف (اختياري)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="وصف المهارة..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 text-sm resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white text-sm">
              إلغاء
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 font-semibold text-sm disabled:opacity-60"
            >
              {mutation.isPending ? 'جاري...' : isEdit ? 'حفظ' : 'إنشاء'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SkillsPage() {
  const queryClient = useQueryClient();
  const { data: catalog } = useGradeClassCatalog();
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editSkill, setEditSkill] = useState<DbSkill | null>(null);

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['grade-subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grade_subjects')
        .select('*')
        .order('grade')
        .order('subject_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: skills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .not('grade', 'is', null)
        .order('subject_name')
        .order('skill_name');
      if (error) throw error;
      return data as DbSkill[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('skills').delete().eq('id', id);
      if (error) throw error;
      await logAction('SKILL_DELETED', 'skills', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      toast.success('تم الحذف');
    },
    onError: () => toast.error('لا يمكن حذف مهارة مرتبطة بأسئلة'),
  });

  const grades = useMemo(
    () => mergeGradeLists(catalog?.grades, subjects.map((s) => s.grade)),
    [catalog?.grades, subjects]
  );
  const [activeGrade, setActiveGrade] = useSyncedGrade(grades);

  const gradeSubjects = subjects.filter((s) => s.grade === activeGrade);
  const subjectSkills = activeSubject
    ? skills.filter((s) => s.grade === activeGrade && s.subject_name === activeSubject)
    : [];

  const skillCount = (subjectName: string) =>
    skills.filter((s) => s.grade === activeGrade && s.subject_name === subjectName).length;

  const handleGradeChange = (grade: string) => {
    setActiveGrade(grade);
    setActiveSubject(null);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-gold-400" />
            إدارة المهارات
          </h1>
          <p className="text-white/40 text-sm mt-1">
            اختر الصف ثم المادة لعرض وإدارة مهاراتها
          </p>
        </div>
        {activeSubject && (
          <button
            type="button"
            onClick={() => { setEditSkill(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 rounded-xl font-semibold text-sm"
          >
            <Plus className="w-4 h-4" />
            إضافة مهارة
          </button>
        )}
      </div>

      {/* تبويبات الصفوف */}
      <GradeTabs
        grades={grades}
        activeGrade={activeGrade}
        onChange={(grade) => handleGradeChange(grade)}
        getBadge={(grade) => subjects.filter((s) => s.grade === grade).length}
      />

      {/* قائمة المواد */}
      <div className="bg-navy-900/50 border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-white font-semibold text-sm">مواد {activeGrade}</h2>
        </div>

        {subjectsLoading ? (
          <div className="p-8 flex justify-center">
            <BarsLoader label="جاري تحميل المواد..." />
          </div>
        ) : gradeSubjects.length === 0 ? (
          <div className="p-10 text-center text-white/30 text-sm">
            لا توجد مواد لهذا الصف. أضف مواد من صفحة «المواد حسب الصف» أولاً.
          </div>
        ) : (
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {gradeSubjects.map((subject) => (
              <button
                key={subject.id}
                type="button"
                onClick={() => setActiveSubject(subject.subject_name)}
                className={clsx(
                  'p-4 rounded-xl border text-right transition-all',
                  activeSubject === subject.subject_name
                    ? 'bg-cyan-500/15 border-cyan-400/40 ring-1 ring-cyan-400/20'
                    : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
                )}
              >
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-300 text-sm font-bold mb-2">
                  {subject.subject_name.charAt(0)}
                </div>
                <p className="text-white font-medium text-sm">{subject.subject_name}</p>
                <p className="text-white/35 text-xs mt-1">
                  {skillCount(subject.subject_name)} مهارة
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* مهارات المادة المختارة */}
      {activeSubject && (
        <div className="space-y-4">
          <h2 className="text-white/70 text-sm font-medium px-1">
            مهارات <span className="text-gold-400">{activeSubject}</span> — {activeGrade}
          </h2>

          {skillsLoading ? (
            <div className="py-10 flex justify-center">
              <BarsLoader label="جاري تحميل المهارات..." />
            </div>
          ) : subjectSkills.length === 0 ? (
            <div className="p-10 text-center bg-navy-900/50 border border-white/8 rounded-2xl text-white/30 text-sm">
              لا توجد مهارات لهذه المادة بعد.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {subjectSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="bg-navy-900/50 border border-white/8 rounded-2xl p-4 group hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{skill.skill_name}</p>
                      {skill.description && (
                        <p className="text-white/40 text-xs mt-1 line-clamp-2">{skill.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => { setEditSkill(skill); setShowModal(true); }}
                        className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(skill.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && activeSubject && (
        <SkillModal
          skill={editSkill}
          grade={activeGrade}
          subjectName={activeSubject}
          onClose={() => { setShowModal(false); setEditSkill(null); }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['skills'] });
            setShowModal(false);
            setEditSkill(null);
          }}
        />
      )}
    </div>
  );
}
