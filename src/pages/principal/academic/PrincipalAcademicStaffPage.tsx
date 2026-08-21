import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicAdminService } from '../../../lib/academic/adminService';
import { ACADEMIC_LEVEL_LABELS } from '../../../lib/academic/constants';
import type { AcademicEducationLevel, AcademicStaffUser } from '../../../lib/academic/types';
import { AcademicLayout, AcademicPageHeader, AcademicEmpty, academicInputClass, academicBtnPrimary, academicBtnSecondary } from '../../../components/academic/AcademicUi';
import { Pencil } from 'lucide-react';

export function PrincipalAcademicStaffPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AcademicStaffUser | null>(null);

  const { data: staff = [] } = useQuery({ queryKey: ['academic-staff'], queryFn: academicAdminService.listStaffUsers });

  const saveMut = useMutation({
    mutationFn: () => academicAdminService.updateStaffUser(editing!.id, {
      staff_education_level: editing!.staff_education_level ?? null,
      is_active: editing!.is_active,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['academic-staff'] }); setEditing(null); },
  });

  return (
    <AcademicLayout size="4xl">
      <AcademicPageHeader title="الموظفون الأكاديميون" backTo="/principal/academic" subtitle="تعيين مرحلة الوكيل من هنا" />

      {editing && (
        <div className="horizon-card rounded-[20px] bg-[#111c44] p-4 mb-4 space-y-3">
          <h3 className="text-white">{editing.full_name}</h3>
          {editing.role === 'deputy' && (
            <select className={academicInputClass} value={editing.staff_education_level ?? ''} onChange={(e) => setEditing({ ...editing, staff_education_level: (e.target.value || null) as AcademicEducationLevel | null })}>
              <option value="">—</option>
              <option value="middle">متوسط</option>
              <option value="high">ثانوي</option>
            </select>
          )}
          <label className="flex items-center gap-2 text-white text-sm">
            <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
            نشط
          </label>
          <div className="flex gap-2">
            <button type="button" className={academicBtnPrimary} onClick={() => saveMut.mutate()}>حفظ</button>
            <button type="button" className={academicBtnSecondary} onClick={() => setEditing(null)}>إلغاء</button>
          </div>
        </div>
      )}

      {staff.length === 0 ? <AcademicEmpty message="لا مستخدمين" /> : (
        <ul className="space-y-2">
          {staff.map((u) => (
            <li key={u.id} className="horizon-card rounded-xl bg-[#111c44] p-3 text-white flex justify-between items-center">
              <div>
                <span className="font-medium">{u.full_name}</span>
                <p className="text-[#A3AED0] text-sm">{u.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#A3AED0] text-sm">
                  {u.role}{u.staff_education_level ? ` · ${ACADEMIC_LEVEL_LABELS[u.staff_education_level]}` : ''}
                </span>
                <button type="button" className="text-gold-400" onClick={() => setEditing(u)}><Pencil className="w-4 h-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AcademicLayout>
  );
}
