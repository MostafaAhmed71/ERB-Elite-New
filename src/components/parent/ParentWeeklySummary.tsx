import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CalendarCheck, Award, ClipboardList, Mail, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { showSuccess, showError } from '../../lib/toast';

const WEEKLY_EMAIL_PREF_KEY = 'parent-weekly-email-pref';

type Props = {
  studentId: string;
};

function readWeeklyEmailPref(): boolean {
  try {
    return localStorage.getItem(WEEKLY_EMAIL_PREF_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeWeeklyEmailPref(value: boolean) {
  try {
    localStorage.setItem(WEEKLY_EMAIL_PREF_KEY, String(value));
  } catch {
    /* ignore */
  }
}

export function ParentWeeklySummary({ studentId }: Props) {
  const { user } = useAuthStore();
  const [emailOptIn, setEmailOptIn] = useState(readWeeklyEmailPref);

  const { data: dbOptIn } = useQuery({
    queryKey: ['parent', 'weekly-email-opt-in', user?.id],
    queryFn: async () => {
      if (!user) return readWeeklyEmailPref();
      const { data, error } = await supabase
        .from('users')
        .select('weekly_email_opt_in')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return Boolean(data?.weekly_email_opt_in);
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (dbOptIn !== undefined) {
      setEmailOptIn(dbOptIn);
      writeWeeklyEmailPref(dbOptIn);
    }
  }, [dbOptIn]);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const since = weekAgo.toISOString().slice(0, 10);

  const { data: summary } = useQuery({
    queryKey: ['parent', 'weekly-summary', studentId, since],
    queryFn: async () => {
      const [pointsRes, attRes, examRes] = await Promise.all([
        supabase
          .from('points_ledger')
          .select('points')
          .eq('student_id', studentId)
          .eq('status', 'approved')
          .gte('created_at', weekAgo.toISOString()),
        supabase
          .from('attendance')
          .select('status')
          .eq('student_id', studentId)
          .gte('date', since),
        supabase
          .from('exam_results')
          .select('score, max_score')
          .eq('student_id', studentId)
          .gte('submitted_at', weekAgo.toISOString()),
      ]);

      const pointsSum = (pointsRes.data ?? []).reduce((s, r) => s + Number(r.points), 0);
      const att = attRes.data ?? [];
      const present = att.filter((a) => a.status === 'present' || a.status === 'late').length;
      const absent = att.filter((a) => a.status === 'absent').length;
      const exams = examRes.data ?? [];

      return { pointsSum, present, absent, examCount: exams.length };
    },
    enabled: !!studentId,
  });

  const saveOptInMutation = useMutation({
    mutationFn: async (next: boolean) => {
      writeWeeklyEmailPref(next);
      if (!user) return;
      const { error } = await supabase
        .from('users')
        .update({ weekly_email_opt_in: next, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
    },
    onError: (e: Error) => showError(e, 'فشل حفظ تفضيل البريد'),
  });

  const testEmailMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('weekly-parent-digest', {
        body: { test: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      return data as { message?: string; sent?: number };
    },
    onSuccess: (data) => {
      showSuccess(data?.message ?? 'تم إرسال البريد التجريبي');
    },
    onError: (e: Error) => showError(e, 'فشل الإرسال التجريبي'),
  });

  const handleEmailToggle = () => {
    const next = !emailOptIn;
    setEmailOptIn(next);
    saveOptInMutation.mutate(next);
  };

  if (!summary) return null;

  return (
    <div className="glass-card p-5 space-y-3" dir="rtl">
      <h3 className="text-white font-semibold text-sm">ملخص الأسبوع الأخير</h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-xl bg-gold-500/10 border border-gold-500/20">
          <Award className="w-4 h-4 text-gold-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-gold-400 tabular-nums">{summary.pointsSum}</p>
          <p className="text-[10px] text-white/40">نقطة معتمدة</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <CalendarCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-emerald-400 tabular-nums">{summary.present}</p>
          <p className="text-[10px] text-white/40">حضور · {summary.absent} غياب</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <ClipboardList className="w-4 h-4 text-purple-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-purple-400 tabular-nums">{summary.examCount}</p>
          <p className="text-[10px] text-white/40">اختبار</p>
        </div>
      </div>

      <label className="flex items-start gap-2 pt-2 border-t border-white/5 cursor-pointer group">
        <input
          type="checkbox"
          checked={emailOptIn}
          onChange={handleEmailToggle}
          disabled={saveOptInMutation.isPending}
          className="mt-0.5 rounded border-white/20 bg-white/5 text-gold-500 focus:ring-gold-500/30"
        />
        <span className="text-[11px] text-white/50 group-hover:text-white/70 transition-colors">
          <Mail className="w-3 h-3 inline ml-1 text-gold-400" />
          أرسل ملخصاً أسبوعياً لبريدي
        </span>
      </label>
      {emailOptIn && (
        <div className="space-y-2 pr-6">
          <p className="text-[10px] text-emerald-300/80">
            تم حفظ تفضيلك. سيُرسل الملخص أسبوعياً إلى بريدك المسجّل عند تفعيل خادم البريد.
          </p>
          <button
            type="button"
            onClick={() => testEmailMutation.mutate()}
            disabled={testEmailMutation.isPending}
            className="inline-flex items-center gap-1.5 text-[11px] text-gold-400 hover:text-gold-300 transition-colors disabled:opacity-50"
          >
            <Send className="w-3 h-3" />
            {testEmailMutation.isPending ? 'جاري الإرسال...' : 'إرسال تجريبي الآن'}
          </button>
        </div>
      )}
    </div>
  );
}
