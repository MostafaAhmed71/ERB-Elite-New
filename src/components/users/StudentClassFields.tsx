import { useEffect, useState } from 'react';
import { GraduationCap, Hash } from 'lucide-react';
import {
  fetchGradeClassOptions,
  getClassesForGrade,
  getGradesFromOptions,
  type GradeClassOption,
} from '../../lib/schoolClasses';
import clsx from 'clsx';

interface StudentClassFieldsProps {
  admissionNumber: string;
  grade: string;
  className: string;
  onAdmissionNumberChange: (value: string) => void;
  onGradeChange: (value: string) => void;
  onClassNameChange: (value: string) => void;
  compact?: boolean;
  variant?: 'default' | 'auth';
}

const selectClass = clsx(
  'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white',
  'focus:outline-none focus:border-gold-400/50 text-sm appearance-none'
);

export function StudentClassFields({
  admissionNumber,
  grade,
  className,
  onAdmissionNumberChange,
  onGradeChange,
  onClassNameChange,
  compact = false,
  variant = 'default',
}: StudentClassFieldsProps) {
  const [options, setOptions] = useState<GradeClassOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGradeClassOptions()
      .then(setOptions)
      .finally(() => setLoading(false));
  }, []);

  const grades = getGradesFromOptions(options);
  const classes = grade ? getClassesForGrade(options, grade) : [];

  useEffect(() => {
    if (grade && className && !classes.includes(className)) {
      onClassNameChange('');
    }
  }, [grade, className, classes, onClassNameChange]);

  const labelClass = compact ? 'text-white/60 text-xs' : 'text-white/60 text-sm';

  if (variant === 'auth') {
    return (
      <div className="login-student-box">
        <div className="login-field">
          <label className="login-field-label flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" /> رقم القيد
          </label>
          <input
            type="text"
            value={admissionNumber}
            onChange={(e) => onAdmissionNumberChange(e.target.value)}
            placeholder="مثال: 1448001"
            className="login-input"
          />
        </div>

        <div className="login-field-row">
          <div className="login-field" style={{ marginBottom: 0 }}>
            <label className="login-field-label flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" /> الصف الدراسي
            </label>
            <select
              value={grade}
              onChange={(e) => onGradeChange(e.target.value)}
              required
              disabled={loading}
              className="login-select"
            >
              <option value="">{loading ? 'جاري التحميل...' : 'اختر الصف'}</option>
              {grades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="login-field" style={{ marginBottom: 0 }}>
            <label className="login-field-label">الفصل / الشعبة</label>
            <select
              value={className}
              onChange={(e) => onClassNameChange(e.target.value)}
              required
              disabled={!grade || loading}
              className="login-select"
            >
              <option value="">{!grade ? 'اختر الصف أولاً' : 'اختر الفصل'}</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white/3 border border-white/5 rounded-xl space-y-4">
      <div className="space-y-1.5">
        <label className={clsx(labelClass, 'flex items-center gap-1.5')}>
          <Hash className="w-3.5 h-3.5 text-gold-400" /> رقم القيد
        </label>
        <input
          type="text"
          value={admissionNumber}
          onChange={(e) => onAdmissionNumberChange(e.target.value)}
          placeholder="مثال: 1448001"
          className={selectClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className={clsx(labelClass, 'flex items-center gap-1.5')}>
            <GraduationCap className="w-3.5 h-3.5 text-gold-400" /> الصف الدراسي
          </label>
          <select
            value={grade}
            onChange={(e) => onGradeChange(e.target.value)}
            required
            disabled={loading}
            className={selectClass}
          >
            <option value="" className="bg-navy-900">
              {loading ? 'جاري التحميل...' : 'اختر الصف'}
            </option>
            {grades.map((g) => (
              <option key={g} value={g} className="bg-navy-900">
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>الفصل / الشعبة</label>
          <select
            value={className}
            onChange={(e) => onClassNameChange(e.target.value)}
            required
            disabled={!grade || loading}
            className={selectClass}
          >
            <option value="" className="bg-navy-900">
              {!grade ? 'اختر الصف أولاً' : 'اختر الفصل'}
            </option>
            {classes.map((c) => (
              <option key={c} value={c} className="bg-navy-900">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
