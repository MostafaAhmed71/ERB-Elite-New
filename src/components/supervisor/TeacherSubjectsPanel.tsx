import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCheck, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

type TeacherRow = {
  id: string;
  user_id: string;
  users: { full_name: string; email: string } | null;
};

type TeacherSubjectRow = {
  id: string;
  teacher_id: string;
  grade: string;
  subject_name: string;
  teachers: { users: { full_name: string } | null } | null;
};

type Props = {
  activeGrade: string;
  subjects: string[];
};

export function TeacherSubjectsPanel({ activeGrade, subjects }: Props) {
  const queryClient = useQueryClient();
  const [teacherId, setTeacherId] = useState('');
  const [subjectName, setSubjectName] = useState('');

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, user_id, users(full_name, email)')
        .order('created_at');
      if (error) throw error;
      return data as unknown as TeacherRow[];
    },
  });

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['teacher-subjects', activeGrade],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_subjects')
        .select('id, teacher_id, grade, subject_name, teachers(users(full_name))')
        .eq('grade', activeGrade)
        .order('subject_name');
      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return data as unknown as TeacherSubjectRow[];
    },
    enabled: !!activeGrade,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!teacherId || !subjectName) throw new Error('اختر المعلم والمادة');
      const { error } = await supabase.from('teacher_subjects').insert({
        teacher_id: teacherId,
        grade: activeGrade,
        subject_name: subjectName,
        academic_year: new Date().getFullYear().toString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-subjects'] });
      setSubjectName('');
      toast.success('تم ربط المعلم بالمادة');
    },
    onError: (e: Error) => toast.error(e.message.includes('unique') ? 'الربط موجود مسبقاً' : e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('teacher_subjects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-subjects'] });
      toast.success('تم إلغاء الربط');
    },
  });

  const tableMissing = !isLoading && assignments.length === 0 && teachers.length > 0;

  return (
    <div className="bg-navy-900/50 border border-white/8 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <UserCheck className="w-5 h-5 text-cyan-400" />
        <h2 className="text-white font-semibold text-sm">ربط المعلمين بالمواد — {activeGrade}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
        >
          <option value="">اختر المعلم</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.users?.full_name ?? t.users?.email ?? t.id}
            </option>
          ))}
        </select>
        <select
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
        >
          <option value="">اختر المادة</option>
          {subjects.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => addMutation.mutate()}
          disabled={addMutation.isPending || !teacherId || !subjectName}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 rounded-xl text-sm font-medium disabled:opacity-40"
        >
          <Plus className="w-4 h-4" /> ربط
        </button>
      </div>

      {assignments.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-4">
          {tableMissing ? 'لا توجد إسنادات — طبّق migration 025 إن لزم' : 'لا يوجد معلمون مربوطون بهذا الصف'}
        </p>
      ) : (
        <div className="divide-y divide-white/5 rounded-xl border border-white/5 overflow-hidden">
          {assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/2">
              <div>
                <p className="text-white text-sm">{a.teachers?.users?.full_name ?? 'معلم'}</p>
                <p className="text-white/40 text-xs">{a.subject_name}</p>
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(a.id)}
                className="p-2 text-red-400/60 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
