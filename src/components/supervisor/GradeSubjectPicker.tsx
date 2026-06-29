import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { mergeGradeLists } from '../../lib/schoolClasses';
import { useGradeClassCatalog } from '../../hooks/useGradeClassCatalog';
import type { DbGradeSubject, DbSkill } from '../../types';
import { BarsLoader } from '../ui/BarsLoader';
import clsx from 'clsx';

interface GradeSubjectPickerProps {
  activeGrade: string;
  activeSubject: string | null;
  onGradeChange: (grade: string) => void;
  onSubjectChange: (subject: string) => void;
  getSubjectBadge?: (grade: string, subjectName: string) => number | string;
}

export function GradeSubjectPicker({
  activeGrade,
  activeSubject,
  onGradeChange,
  onSubjectChange,
  getSubjectBadge,
}: GradeSubjectPickerProps) {
  const { data: catalog, isLoading: catalogLoading } = useGradeClassCatalog();

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
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

  const grades = useMemo(
    () => mergeGradeLists(catalog?.grades, subjects.map((s) => s.grade)),
    [catalog?.grades, subjects]
  );

  const gradeSubjects = subjects.filter((s) => s.grade === activeGrade);

  const handleGradeChange = (grade: string) => {
    onGradeChange(grade);
    onSubjectChange('');
  };

  const isLoading = catalogLoading || subjectsLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {grades.length === 0 && !isLoading ? (
          <p className="text-white/40 text-sm py-2">لا توجد صفوف — أضف طلاباً أو حدّث الإعدادات</p>
        ) : (
          grades.map((grade) => (
            <button
              key={grade}
              type="button"
              onClick={() => handleGradeChange(grade)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all border',
                activeGrade === grade
                  ? 'bg-gold-500/20 border-gold-400/40 text-gold-300'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/8'
              )}
            >
              <span className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                {grade}
                <span className="text-xs opacity-60">
                  ({subjects.filter((s) => s.grade === grade).length})
                </span>
              </span>
            </button>
          ))
        )}
      </div>

      <div className="bg-navy-900/50 border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-white font-semibold text-sm">
            {activeGrade ? `مواد ${activeGrade}` : 'اختر صفاً'}
          </h2>
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center">
            <BarsLoader label="جاري التحميل..." />
          </div>
        ) : !activeGrade ? (
          <div className="p-10 text-center text-white/30 text-sm">اختر صفاً من الأعلى</div>
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
                onClick={() => onSubjectChange(subject.subject_name)}
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
                {getSubjectBadge && (
                  <p className="text-white/35 text-xs mt-1">
                    {getSubjectBadge(activeGrade, subject.subject_name)}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function skillsForGradeSubject(
  skills: DbSkill[],
  grade: string,
  subjectName: string
): DbSkill[] {
  return skills.filter((s) => s.grade === grade && s.subject_name === subjectName);
}
