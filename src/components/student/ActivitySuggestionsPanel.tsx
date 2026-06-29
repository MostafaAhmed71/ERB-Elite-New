import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lightbulb, ThumbsUp, Plus } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/Button';
import { showSuccess, showError } from '../../lib/toast';
import { ACTIVITY_SUGGESTIONS_STAFF_KEY } from '../../lib/activitySuggestions';

const SUGGESTION_STATUS_LABELS: Record<string, string> = {
  pending: 'بانتظار المراجعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
  implemented: 'تم التنفيذ',
};

export function ActivitySuggestionsPanel() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['student', 'profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('id').eq('user_id', user!.id).single();
      if (error) throw error;
      return data as { id: string };
    },
    enabled: !!user,
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['activity-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_suggestions')
        .select('*, students(full_name)')
        .in('status', ['pending', 'approved'])
        .order('votes', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const { data: mySuggestions = [] } = useQuery({
    queryKey: ['student', 'my-suggestions', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_suggestions')
        .select('*')
        .eq('student_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`my-suggestions-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'activity_suggestions', filter: `student_id=eq.${profile.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['student', 'my-suggestions'] });
          queryClient.invalidateQueries({ queryKey: ['activity-suggestions'] });
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('ملف طالب غير موجود');
      const { error } = await supabase.from('activity_suggestions').insert({
        student_id: profile.id,
        title: title.trim(),
        description: description.trim() || null,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('تم إرسال اقتراحك!');
      setTitle('');
      setDescription('');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['activity-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['student', 'my-suggestions'] });
      queryClient.invalidateQueries({ queryKey: [...ACTIVITY_SUGGESTIONS_STAFF_KEY] });
    },
    onError: (e: Error) => showError(e),
  });

  const voteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('vote_activity_suggestion', { p_suggestion_id: id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activity-suggestions'] }),
    onError: (e: Error) => showError(e),
  });

  return (
    <div className="glass-card p-5 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          اقترح نشاطاً
        </h3>
        <Button variant="secondary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowForm(!showForm)}>
          اقتراح جديد
        </Button>
      </div>

      {mySuggestions.length > 0 && (
        <div className="space-y-2 p-3 bg-white/3 rounded-xl border border-white/10">
          <p className="text-white/50 text-[10px]">اقتراحاتك</p>
          {mySuggestions.map((s) => (
            <div key={s.id as string} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-white truncate">{s.title as string}</span>
              <span className={clsx(
                'shrink-0 px-2 py-0.5 rounded-full border text-[10px]',
                s.status === 'approved' || s.status === 'implemented'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  : s.status === 'rejected'
                    ? 'bg-red-500/10 text-red-300 border-red-500/20'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
              )}>
                {SUGGESTION_STATUS_LABELS[s.status as string] ?? s.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="space-y-2 p-3 bg-white/3 rounded-xl border border-white/10">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان النشاط المقترح..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="وصف مختصر (اختياري)"
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm resize-none"
          />
          <Button size="sm" onClick={() => submitMutation.mutate()} disabled={!title.trim() || submitMutation.isPending}>
            إرسال الاقتراح
          </Button>
        </div>
      )}

      <div className="space-y-2 max-h-56 overflow-y-auto">
        {suggestions.length === 0 ? (
          <p className="text-white/30 text-xs text-center py-4">لا توجد اقتراحات بعد — كن الأول!</p>
        ) : (
          suggestions.map((s) => (
            <div key={s.id as string} className="flex items-center justify-between gap-3 p-3 bg-white/3 rounded-xl text-sm">
              <div className="min-w-0">
                <p className="text-white font-medium">{s.title as string}</p>
                <p className="text-white/40 text-xs">{(s.students as unknown as { full_name: string })?.full_name}</p>
              </div>
              <button
                type="button"
                onClick={() => voteMutation.mutate(s.id as string)}
                className="flex items-center gap-2 min-w-[4.5rem] min-h-[2.75rem] px-4 py-2.5 rounded-xl bg-amber-500/15 text-amber-200 border border-amber-500/25 text-sm font-medium active:scale-95 transition-transform"
              >
                <ThumbsUp className="w-4 h-4" />
                {s.votes as number}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
