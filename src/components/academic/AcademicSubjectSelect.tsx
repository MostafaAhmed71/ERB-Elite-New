import { useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { academicAdminService } from '../../lib/academic/adminService';
import { teacherSubjectNamesForGrade } from '../../lib/academic/subjectHelpers';
import type { AcademicEducationLevel } from '../../lib/academic/types';
import { academicInputClass } from './AcademicUi';

type Props = {
  level: AcademicEducationLevel;
  grade: number;
  value: string;
  onChange: (value: string) => void;
  teacherSetupSubjects?: string[];
  required?: boolean;
  className?: string;
  placeholder?: string;
  allowCustom?: boolean;
  /** اقتراحات تظهر أثناء الكتابة عندما لا توجد مواد معرّفة لهذا الصف */
  suggestions?: string[];
};

/** قائمة مواد حسب المرحلة + الصف */
export function AcademicSubjectSelect({
  level,
  grade,
  value,
  onChange,
  teacherSetupSubjects,
  required,
  className,
  placeholder = 'اختر المادة',
  allowCustom = true,
  suggestions,
}: Props) {
  const listId = useId();
  const { data: allSubjects = [] } = useQuery({
    queryKey: ['academic-subjects'],
    queryFn: academicAdminService.listSubjects,
  });

  const options = teacherSubjectNamesForGrade(allSubjects, level, grade, teacherSetupSubjects);

  if (options.length === 0 && allowCustom) {
    const hasSuggestions = !!suggestions?.length;
    return (
      <>
        <input
          className={className ?? academicInputClass}
          placeholder={hasSuggestions ? 'اكتب أو اختر المادة' : 'اسم المادة'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          list={hasSuggestions ? listId : undefined}
        />
        {hasSuggestions && (
          <datalist id={listId}>
            {suggestions!.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        )}
      </>
    );
  }

  return (
    <select
      className={className ?? academicInputClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      <option value="">{placeholder}</option>
      {options.map((name) => (
        <option key={name} value={name}>{name}</option>
      ))}
      {allowCustom && value && !options.includes(value) && (
        <option value={value}>{value}</option>
      )}
    </select>
  );
}
