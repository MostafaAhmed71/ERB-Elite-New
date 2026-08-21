import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lightbulb, Check, X, ArrowRightCircle, ThumbsUp, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { showSuccess, showError } from '../../lib/toast';
import { ResponsiveBar } from '@nivo/bar';
import { adminChartTheme, CHART_COLORS } from '../../components/admin/charts/adminChartTheme';
import { useAuthStore } from '../../stores/authStore';
import { useActivitySuggestionsStaff, ACTIVITY_SUGGESTIONS_STAFF_KEY } from '../../hooks/useActivitySuggestionsStaff';
import type { ActivitySuggestionRow } from '../../lib/activitySuggestions';
import clsx from 'clsx';

type SuggestionRow = ActivitySuggestionRow;

const STATUS_LABELS: Record<string, string> = {
  pending: 'معلّق',
  approved: 'موافق',
  rejected: 'مرفوض',
  implemented: 'مُنفَّذ',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-300 border-red-500/20',
  implemented: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
};

export function ActivitySuggestionsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: suggestions = [], isLoading, isError, error } = useActivitySuggestionsStaff();

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('activity_suggestions')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('تم تحديث حالة الاقتراح');
      queryClient.invalidateQueries({ queryKey: [...ACTIVITY_SUGGESTIONS_STAFF_KEY] });
    },
    onError: (e: Error) => showError(e),
  });

  const convertMutation = useMutation({
    mutationFn: async (suggestion: SuggestionRow) => {
      const { data: activity, error: actErr } = await supabase
        .from('activities')
        .insert({
          name: suggestion.title,
          category: 'activity',
          default_points: 15,
          is_active: true,
          icon: 'star',
          color: 'gold',
          is_seasonal: false,
          season_label: null,
          academic_term: 'all',
          lifecycle_stage: 'approved',
          learning_objective: suggestion.description,
          scheduled_at: null,
          location: null,
          created_by: user?.id ?? null,
        })
        .select('id')
        .single();
      if (actErr) throw actErr;

      const { error: sugErr } = await supabase
        .from('activity_suggestions')
        .update({ status: 'implemented' })
        .eq('id', suggestion.id);
      if (sugErr) throw sugErr;

      return activity;
    },
    onSuccess: () => {
      showSuccess('تم تحويل الاقتراح إلى نشاط رسمي');
      queryClient.invalidateQueries({ queryKey: [...ACTIVITY_SUGGESTIONS_STAFF_KEY] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: (e: Error) => showError(e),
  });

  const pending = suggestions.filter((s) => s.status === 'pending');
  const topVotes = suggestions.slice(0, 6).map((s) => ({
    title: s.title.length > 18 ? s.title.slice(0, 18) + '…' : s.title,
    أصوات: s.votes,
  }));

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="اقتراحات الأنشطة"
        subtitle="مراجعة اقتراحات الطلاب وتحويلها لأنشطة رسمية"
        icon={Lightbulb}
        badge={pending.length > 0 ? `${pending.length} معلّق` : undefined}
        guidePath="/admin/suggestions"
      />

      {topVotes.length > 0 && (
        <Panel className="p-5">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-gold-400" />
            أكثر الاقتراحات تصويتاً
          </h3>
          <div style={{ height: 200 }} dir="ltr">
            <ResponsiveBar
              data={topVotes}
              keys={['أصوات']}
              indexBy="title"
              margin={{ top: 8, right: 16, bottom: 56, left: 40 }}
              padding={0.4}
              colors={[CHART_COLORS.gold]}
              theme={adminChartTheme}
              borderRadius={6}
              axisTop={null}
              axisRight={null}
              axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: -25 }}
              axisLeft={{ tickSize: 0, tickPadding: 8 }}
              enableLabel={false}
              animate
            />
          </div>
        </Panel>
      )}

      {isLoading ? (
        <TapHandLoader label="جاري التحميل..." />
      ) : isError ? (
        <Panel className="p-6 border border-red-500/20 bg-red-500/5">
          <p className="text-red-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            تعذّر تحميل الاقتراحات: {(error as Error)?.message ?? 'خطأ غير معروف'}
          </p>
          <p className="text-white/40 text-xs mt-2">
            تأكد من تطبيق migration 045 على Supabase إن كان الجدول غير موجود.
          </p>
        </Panel>
      ) : suggestions.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="لا توجد اقتراحات بعد"
          description="سيظهر هنا اقتراحات الطلاب عند إرسالها"
        />
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => (
            <Panel key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-white font-semibold">{s.title}</h3>
                    <span
                      className={clsx(
                        'text-[10px] px-2 py-0.5 rounded-full border',
                        STATUS_COLORS[s.status] ?? STATUS_COLORS.pending
                      )}
                    >
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">
                      {s.votes} صوت
                    </span>
                  </div>
                  {s.description && (
                    <p className="text-white/50 text-sm">{s.description}</p>
                  )}
                  <p className="text-white/30 text-xs mt-1">
                    {s.students?.full_name} — {s.students?.grade} فصل {s.students?.class_name}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {s.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Check className="w-3.5 h-3.5" />}
                        onClick={() => reviewMutation.mutate({ id: s.id, status: 'approved' })}
                      >
                        موافقة
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<X className="w-3.5 h-3.5" />}
                        onClick={() => reviewMutation.mutate({ id: s.id, status: 'rejected' })}
                      >
                        رفض
                      </Button>
                    </>
                  )}
                  {(s.status === 'pending' || s.status === 'approved') && (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<ArrowRightCircle className="w-3.5 h-3.5" />}
                      onClick={() => convertMutation.mutate(s)}
                      disabled={convertMutation.isPending}
                    >
                      تحويل لنشاط
                    </Button>
                  )}
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
