import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Lightbulb, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showSuccess, showError } from '../../lib/toast';
import { BarsLoader } from '../ui/BarsLoader';
import { useActivitySuggestionsStaff, ACTIVITY_SUGGESTIONS_STAFF_KEY } from '../../hooks/useActivitySuggestionsStaff';
import clsx from 'clsx';

export function ActivitySuggestionsReview() {
  const queryClient = useQueryClient();
  const { data: suggestions = [], isLoading, isError, error } = useActivitySuggestionsStaff();

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('activity_suggestions').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('تم تحديث حالة الاقتراح');
      queryClient.invalidateQueries({ queryKey: [...ACTIVITY_SUGGESTIONS_STAFF_KEY] });
    },
    onError: (e: Error) => showError(e),
  });

  const pending = suggestions.filter((s) => s.status === 'pending');

  return (
    <div className="glass-card p-5 space-y-4 border border-white/5">
      <h2 className="text-white font-bold text-base flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-amber-400" />
        مراجعة اقتراحات الطلاب
        {pending.length > 0 && (
          <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
            {pending.length} معلّق
          </span>
        )}
      </h2>

      {isLoading ? (
        <div className="py-6 flex justify-center">
          <BarsLoader label="جاري التحميل..." compact />
        </div>
      ) : isError ? (
        <p className="text-red-300/90 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {(error as Error)?.message ?? 'تعذّر تحميل الاقتراحات'}
        </p>
      ) : suggestions.length === 0 ? (
        <p className="text-white/30 text-sm">لا توجد اقتراحات بعد</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {suggestions.map((s) => (
            <div
              key={s.id}
              className="flex items-start justify-between gap-3 p-3 bg-white/3 rounded-xl border border-white/5"
            >
              <div className="min-w-0">
                <p className="text-white text-sm font-medium">{s.title}</p>
                {s.description && <p className="text-white/40 text-xs mt-0.5">{s.description}</p>}
                <p className="text-white/30 text-[10px] mt-1">
                  {s.students?.full_name ?? 'طالب'} · {s.votes} صوت
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span
                  className={clsx(
                    'text-[10px] px-2 py-0.5 rounded-full border',
                    s.status === 'pending' && 'bg-amber-500/10 text-amber-300 border-amber-500/20',
                    s.status === 'approved' && 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
                    s.status === 'rejected' && 'bg-red-500/10 text-red-300 border-red-500/20',
                    s.status === 'implemented' && 'bg-blue-500/10 text-blue-300 border-blue-500/20',
                  )}
                >
                  {s.status === 'pending'
                    ? 'معلّق'
                    : s.status === 'approved'
                      ? 'موافق'
                      : s.status === 'rejected'
                        ? 'مرفوض'
                        : 'مُنفَّذ'}
                </span>
                {s.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => reviewMutation.mutate({ id: s.id, status: 'approved' })}
                      className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      title="موافقة"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewMutation.mutate({ id: s.id, status: 'rejected' })}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      title="رفض"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
