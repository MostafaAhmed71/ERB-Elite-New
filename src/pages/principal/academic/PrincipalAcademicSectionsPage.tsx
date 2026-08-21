import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { academicAdminService } from '../../../lib/academic/adminService';
import { AcademicLayout, AcademicPageHeader, AcademicEmpty, academicInputClass, academicBtnPrimary } from '../../../components/academic/AcademicUi';

export function PrincipalAcademicSectionsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const { data: sections = [] } = useQuery({ queryKey: ['academic-sections'], queryFn: academicAdminService.listSections });
  const createMut = useMutation({
    mutationFn: () => academicAdminService.createSection(name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['academic-sections'] }); setName(''); },
  });

  return (
    <AcademicLayout size="md">
      <AcademicPageHeader title="الفصول" backTo="/principal/academic" />
      <form className="flex gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }}>
        <input className={academicInputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        <button type="submit" className={academicBtnPrimary}><Plus className="w-4 h-4" /></button>
      </form>
      {sections.length === 0 ? <AcademicEmpty message="لا فصول" /> : (
        <ul className="text-white space-y-1">{sections.map((s) => <li key={s.id} className="horizon-card rounded-lg bg-[#111c44] p-2">{s.name}</li>)}</ul>
      )}
    </AcademicLayout>
  );
}
