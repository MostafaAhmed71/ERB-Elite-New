import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { academicCommunicationService } from '../../lib/academic/adminService';
import { AcademicLayout, AcademicPageHeader, AcademicEmpty, academicInputClass, academicBtnPrimary } from '../../components/academic/AcademicUi';
import { TapHandLoader } from '../../components/ui/TapHandLoader';

export function AcademicCommunicationPage() {
  const { user, role } = useAuthStore();
  const qc = useQueryClient();
  const isTeacher = role === 'teacher';
  const isPrincipal = role === 'principal';
  const [showForm, setShowForm] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['academic-communications', user?.id, role],
    queryFn: () => (isTeacher && user ? academicCommunicationService.listByTeacher(user.id) : academicCommunicationService.listAll()),
    enabled: !!user,
  });

  const createMut = useMutation({
    mutationFn: academicCommunicationService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['academic-communications'] }); setShowForm(false); setStudentName(''); setNotes(''); },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' | 'sent' }) =>
      academicCommunicationService.updateStatus(id, status, user?.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-communications'] }),
  });

  return (
    <AcademicLayout size="6xl">
      <AcademicPageHeader
        title="تقارير التواصل مع أولياء الأمور"
        backTo="/academic"
        action={isTeacher ? <button type="button" className={academicBtnPrimary} onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> تقرير جديد</button> : undefined}
      />

      {showForm && user && (
        <form className="horizon-card rounded-[20px] bg-[#111c44] p-5 mb-6 space-y-3" onSubmit={(e) => {
          e.preventDefault();
          createMut.mutate({ teacher_id: user.id, teacher_name: user.full_name, student_name: studentName, communication_date: date, notes, status: 'submitted' });
        }}>
          <input className={academicInputClass} placeholder="اسم الطالب" value={studentName} onChange={(e) => setStudentName(e.target.value)} required />
          <input type="date" className={academicInputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
          <textarea className={academicInputClass} rows={3} placeholder="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button type="submit" className={academicBtnPrimary}>إرسال للمراجعة</button>
        </form>
      )}

      {isLoading ? <TapHandLoader /> : items.length === 0 ? <AcademicEmpty message="لا توجد تقارير" /> : (
        <div className="space-y-3">
          {items.map((c) => (
            <Link key={c.id} to={`/academic/communication/${c.id}`} className="block horizon-card rounded-[20px] bg-[#111c44] p-4 hover:bg-[#152452] transition-colors">
              <h3 className="text-white font-semibold">{c.student_name}</h3>
              <p className="text-[#A3AED0] text-sm">{c.teacher_name} · {c.communication_date} · {c.status}</p>
              {c.notes && <p className="text-white/70 text-sm mt-1 line-clamp-2">{c.notes}</p>}
              {isPrincipal && c.status === 'submitted' && (
                <div className="flex gap-2 mt-2" onClick={(e) => e.preventDefault()}>
                  <button type="button" className={academicBtnPrimary} onClick={() => statusMut.mutate({ id: c.id, status: 'approved' })}>اعتماد</button>
                  <button type="button" className="text-red-400 text-sm" onClick={() => statusMut.mutate({ id: c.id, status: 'rejected' })}>رفض</button>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </AcademicLayout>
  );
}
