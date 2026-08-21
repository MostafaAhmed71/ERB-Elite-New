import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { academicAdminService } from '../../../lib/academic/adminService';
import { ACADEMIC_LEVEL_LABELS, gradesForLevel, formatGradeLabel } from '../../../lib/academic/constants';
import { formatSubjectGrades } from '../../../lib/academic/subjectHelpers';
import type { AcademicEducationLevel, AcademicSubject } from '../../../lib/academic/types';
import {
  AcademicLayout, AcademicPageHeader, AcademicEmpty, AcademicFormPanel, AcademicField, AcademicChip, AcademicBadge,
  academicInputClass, academicBtnPrimary, academicBtnSecondary,
} from '../../../components/academic/AcademicUi';

export function PrincipalAcademicSubjectsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [level, setLevel] = useState<AcademicEducationLevel>('middle');
  const [selectedGrades, setSelectedGrades] = useState<number[]>([1]);
  const [editing, setEditing] = useState<AcademicSubject | null>(null);

  const { data: subjects = [] } = useQuery({ queryKey: ['academic-subjects'], queryFn: academicAdminService.listSubjects });

  useEffect(() => {
    setSelectedGrades([gradesForLevel(level)[0]]);
  }, [level]);

  const toggleGrade = (g: number) => {
    setSelectedGrades((prev) =>
      prev.includes(g) ? (prev.length > 1 ? prev.filter((x) => x !== g) : prev) : [...prev, g].sort((a, b) => a - b),
    );
  };

  const createMut = useMutation({
    mutationFn: () =>
      academicAdminService.createSubject({
        name,
        education_level: level,
        grades: selectedGrades,
        is_active: true,
        is_available_for_parents: false,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-subjects'] });
      setName('');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<AcademicSubject> }) =>
      academicAdminService.updateSubject(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-subjects'] });
      setEditing(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: academicAdminService.deleteSubject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-subjects'] }),
  });

  const sorted = [...subjects].sort(
    (a, b) =>
      a.education_level.localeCompare(b.education_level) ||
      Math.min(...a.grades) - Math.min(...b.grades) ||
      a.name.localeCompare(b.name, 'ar'),
  );

  return (
    <AcademicLayout size="4xl">
      <AcademicPageHeader
        title="إدارة المواد"
        subtitle="كل مادة تُربط بصفوف محددة — وليس المرحلة فقط"
        backTo="/principal/academic"
      />

      <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }}>
        <AcademicFormPanel title="إضافة مادة">
          <AcademicField label="اسم المادة">
            <input className={academicInputClass} placeholder="مثال: رياضيات" value={name} onChange={(e) => setName(e.target.value)} required />
          </AcademicField>
          <AcademicField label="المرحلة">
            <select className={academicInputClass} value={level} onChange={(e) => setLevel(e.target.value as AcademicEducationLevel)}>
              <option value="middle">متوسط</option>
              <option value="high">ثانوي</option>
            </select>
          </AcademicField>
          <AcademicField label="الصفوف (اختر واحداً أو أكثر)">
            <div className="flex flex-wrap gap-2 mt-1">
              {gradesForLevel(level).map((g) => (
                <AcademicChip key={g} label={formatGradeLabel(level, g)} selected={selectedGrades.includes(g)} onClick={() => toggleGrade(g)} />
              ))}
            </div>
          </AcademicField>
          <button type="submit" className={academicBtnPrimary} disabled={!name.trim() || selectedGrades.length === 0}>
            <Plus className="w-4 h-4" /> إضافة
          </button>
        </AcademicFormPanel>
      </form>

      {editing && (
        <AcademicFormPanel title={`تعديل: ${editing.name}`}>
          <AcademicField label="الاسم">
            <input className={academicInputClass} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </AcademicField>
          <AcademicField label="الصفوف">
            <div className="flex flex-wrap gap-2 mt-1">
              {gradesForLevel(editing.education_level).map((g) => (
                <AcademicChip
                  key={g}
                  label={formatGradeLabel(editing.education_level, g)}
                  selected={editing.grades.includes(g)}
                  onClick={() => {
                    const grades = editing.grades.includes(g)
                      ? editing.grades.length > 1 ? editing.grades.filter((x) => x !== g) : editing.grades
                      : [...editing.grades, g].sort((a, b) => a - b);
                    setEditing({ ...editing, grades });
                  }}
                />
              ))}
            </div>
          </AcademicField>
          <label className="flex items-center gap-2 text-white text-sm">
            <input type="checkbox" checked={editing.is_available_for_parents} onChange={(e) => setEditing({ ...editing, is_available_for_parents: e.target.checked })} />
            متاحة لطلبات أولياء الأمور
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className={academicBtnPrimary}
              onClick={() =>
                updateMut.mutate({
                  id: editing.id,
                  updates: { name: editing.name, grades: editing.grades, is_available_for_parents: editing.is_available_for_parents },
                })
              }
            >
              حفظ
            </button>
            <button type="button" className={academicBtnSecondary} onClick={() => setEditing(null)}>إلغاء</button>
          </div>
        </AcademicFormPanel>
      )}

      {sorted.length === 0 ? (
        <AcademicEmpty message="لا مواد — أضف مواداً لكل صف" />
      ) : (
        <ul className="space-y-2">
          {sorted.map((s) => (
            <li key={s.id} className="horizon-card rounded-xl bg-[#111c44] p-3 flex justify-between items-center text-white gap-2 border border-white/[0.04]">
              <div>
                <span className="font-semibold">{s.name}</span>
                <p className="text-[#A3AED0] text-sm mt-0.5">
                  {formatSubjectGrades(s.education_level, s.grades)}
                </p>
                {s.is_available_for_parents && <AcademicBadge variant="gold">لأولياء الأمور</AcademicBadge>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="button" className="text-gold-400 p-2 hover:bg-gold-400/10 rounded-lg" onClick={() => setEditing({ ...s, grades: [...s.grades] })}>
                  <Pencil className="w-4 h-4" />
                </button>
                <button type="button" className="text-red-400 p-2 hover:bg-red-400/10 rounded-lg" onClick={() => deleteMut.mutate(s.id)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AcademicLayout>
  );
}
