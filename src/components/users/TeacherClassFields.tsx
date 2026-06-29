import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import clsx from 'clsx';
import { fetchGradeClassOptions, getGradesFromOptions, getClassesForGrade } from '../../lib/schoolClasses';
import type { GradeClassOption } from '../../lib/schoolClasses';
import type { TeacherClassAssignment } from '../../lib/teacherScope';
import { isAssignmentSelected, toggleAssignment } from '../../lib/teacherScope';

interface TeacherClassFieldsProps {
  assignments: Pick<TeacherClassAssignment, 'grade' | 'class_name'>[];
  onChange: (assignments: Pick<TeacherClassAssignment, 'grade' | 'class_name'>[]) => void;
}

export function TeacherClassFields({ assignments, onChange }: TeacherClassFieldsProps) {
  const [options, setOptions] = useState<GradeClassOption[]>([]);
  const [selectedGrade, setSelectedGrade] = useState('');

  useEffect(() => {
    fetchGradeClassOptions().then(setOptions);
  }, []);

  const grades = getGradesFromOptions(options);
  const classes = getClassesForGrade(options, selectedGrade);

  const handleToggle = (grade: string, className: string) => {
    onChange(toggleAssignment(assignments, grade, className));
  };

  return (
    <div className="p-4 bg-white/3 border border-white/5 rounded-xl space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-gold-400" />
        <div>
          <p className="text-white text-sm font-medium">الفصول المسندة للمعلم</p>
          <p className="text-white/40 text-xs">يظهر للمعلم طلاب هذه الفصول فقط عند منح النقاط</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-white/60 text-xs">اختر الصف لعرض الفصول</label>
        <select
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none"
        >
          <option value="" className="bg-navy-900">اختر الصف</option>
          {grades.map((g) => (
            <option key={g} value={g} className="bg-navy-900">{g}</option>
          ))}
        </select>
      </div>

      {selectedGrade && (
        <div className="space-y-2">
          <label className="text-white/60 text-xs">الفصول المتاحة</label>
          <div className="flex flex-wrap gap-2">
            {classes.map((className) => {
              const selected = isAssignmentSelected(assignments, selectedGrade, className);
              return (
                <button
                  key={className}
                  type="button"
                  onClick={() => handleToggle(selectedGrade, className)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                    selected
                      ? 'bg-gold-500/15 border-gold-400/40 text-gold-400'
                      : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                  )}
                >
                  {selectedGrade} — {className}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {assignments.length > 0 && (
        <div className="pt-2 border-t border-white/5">
          <p className="text-white/40 text-xs mb-2">الفصول المحددة ({assignments.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {assignments.map((a) => (
              <span
                key={`${a.grade}-${a.class_name}`}
                className="text-[10px] px-2 py-0.5 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-400"
              >
                {a.grade} — {a.class_name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
