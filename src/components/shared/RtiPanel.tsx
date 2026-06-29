import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

type Intervention = {
  id: string;
  student_id: string;
  status: string;
  note: string | null;
  plan: string | null;
  weekly_follow_up: string | null;
  outcome: string | null;
  success_rating: number | null;
  created_at: string;
};

type Checkin = {
  id: string;
  intervention_id: string;
  week_note: string;
  progress_rating: number | null;
  created_at: string;
};

type Props = {
  studentId: string;
  studentName: string;
};

export function RtiPanel({ studentId, studentName }: Props) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [plan, setPlan] = useState('');
  const [weekNote, setWeekNote] = useState('');
  const [outcome, setOutcome] = useState('');
  const [successRating, setSuccessRating] = useState<number | ''>('');

  const { data: intervention, isLoading } = useQuery({
    queryKey: ['intervention', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_interventions')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .maybeSingle();
      if (error) {
        if (error.code === '42P01') return null;
        throw error;
      }
      return data as Intervention | null;
    },
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ['intervention_checkins', intervention?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intervention_checkins')
        .select('*')
        .eq('intervention_id', intervention!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Checkin[];
    },
    enabled: !!intervention?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('student_interventions').insert({
        student_id: studentId,
        created_by: user!.id,
        note: note.trim() || null,
        plan: plan.trim() || null,
        status: 'active',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intervention', studentId] });
      setNote('');
      setPlan('');
      toast.success('تم فتح ملف التدخل');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const checkinMutation = useMutation({
    mutationFn: async () => {
      if (!intervention) return;
      const { error } = await supabase.from('intervention_checkins').insert({
        intervention_id: intervention.id,
        week_note: weekNote.trim(),
        progress_rating: successRating === '' ? null : Number(successRating),
        created_by: user!.id,
      });
      if (error) throw error;
      await supabase
        .from('student_interventions')
        .update({ weekly_follow_up: weekNote.trim(), updated_at: new Date().toISOString() })
        .eq('id', intervention.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intervention_checkins', intervention?.id] });
      setWeekNote('');
      toast.success('تم تسجيل المتابعة الأسبوعية');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!intervention) return;
      const { error } = await supabase
        .from('student_interventions')
        .update({
          status: 'completed',
          outcome: outcome.trim() || null,
          success_rating: successRating === '' ? null : Number(successRating),
          updated_at: new Date().toISOString(),
        })
        .eq('id', intervention.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intervention', studentId] });
      toast.success('تم إغلاق ملف التدخل');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-white/30 text-xs">جاري تحميل ملف التدخل...</p>;

  if (!intervention) {
    return (
      <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/15 space-y-3">
        <p className="text-orange-300 text-sm font-medium flex items-center gap-2">
          <Shield className="w-4 h-4" /> ملف تدخل تربوي — {studentName}
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="ملاحظة الرصد..."
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs resize-none"
        />
        <textarea
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          placeholder="خطة التدخل (جلسات، أنشطة...)"
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs resize-none"
        />
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500/15 border border-orange-500/30 text-orange-300 rounded-xl text-xs font-semibold disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" /> فتح ملف تدخل
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/15 space-y-3">
      <p className="text-orange-300 text-sm font-medium flex items-center gap-2">
        <Shield className="w-4 h-4" /> ملف تدخل نشط
      </p>
      {intervention.note && <p className="text-white/60 text-xs">{intervention.note}</p>}
      {intervention.plan && (
        <p className="text-white/50 text-xs">
          <span className="text-white/70">الخطة: </span>
          {intervention.plan}
        </p>
      )}

      <div className="space-y-2 pt-2 border-t border-white/5">
        <p className="text-white/50 text-xs font-medium">متابعة أسبوعية</p>
        <textarea
          value={weekNote}
          onChange={(e) => setWeekNote(e.target.value)}
          placeholder="ماذا تم هذا الأسبوع؟"
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs resize-none"
        />
        <div className="flex gap-2 items-center">
          <select
            value={successRating}
            onChange={(e) => setSuccessRating(e.target.value === '' ? '' : Number(e.target.value))}
            className="bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-white text-xs"
          >
            <option value="">تقييم التقدم</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}/5
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => checkinMutation.mutate()}
            disabled={checkinMutation.isPending || !weekNote.trim()}
            className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/70 rounded-xl text-xs disabled:opacity-50"
          >
            تسجيل
          </button>
        </div>
        {checkins.length > 0 && (
          <ul className="space-y-1 max-h-24 overflow-y-auto">
            {checkins.map((c) => (
              <li key={c.id} className="text-white/40 text-[10px]">
                {new Date(c.created_at).toLocaleDateString('ar-SA')} — {c.week_note}
                {c.progress_rating ? ` (${c.progress_rating}/5)` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 pt-2 border-t border-white/5">
        <p className="text-white/50 text-xs font-medium">إغلاق التدخل</p>
        <textarea
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          placeholder="تقييم نجاح التدخل..."
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs resize-none"
        />
        <button
          type="button"
          onClick={() => completeMutation.mutate()}
          disabled={completeMutation.isPending}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border',
            'bg-emerald-500/10 border-emerald-500/25 text-emerald-300 disabled:opacity-50',
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> إنهاء التدخل
        </button>
      </div>
    </div>
  );
}
