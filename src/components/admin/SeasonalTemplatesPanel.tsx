import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import {
  SEASONAL_ACTIVITY_TEMPLATES,
  applySeasonalActivityTemplate,
  type SeasonalActivityTemplateId,
} from '../../lib/seasonalActivityTemplates';
import { getActivityIcon, getActivityColorClasses } from '../../lib/activityMeta';
import { showSuccess, showError } from '../../lib/toast';

export function SeasonalTemplatesPanel() {
  const queryClient = useQueryClient();

  const applyMutation = useMutation({
    mutationFn: (id: SeasonalActivityTemplateId) => applySeasonalActivityTemplate(id),
    onSuccess: (result) => {
      const msg =
        result.created > 0
          ? `تم إنشاء ${result.created} نشاط من باقة «${result.template.name}»`
          : `جميع أنشطة «${result.template.name}» موجودة مسبقاً`;
      if (result.skipped > 0 && result.created > 0) {
        showSuccess(`${msg} (تخطّي ${result.skipped} مكرر)`);
      } else {
        showSuccess(msg);
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: (e: Error) => showError(e),
  });

  return (
    <div className="glass-card p-5 border border-white/5 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <div>
          <h2 className="text-white font-bold text-base">قوالب فعاليات موسمية</h2>
          <p className="text-white/40 text-xs mt-0.5">إطلاق باقة أنشطة جاهزة بنقرة واحدة — AL5</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SEASONAL_ACTIVITY_TEMPLATES.map((template) => {
          const Icon = getActivityIcon(template.icon);
          const colors = getActivityColorClasses(template.color);
          const isPending =
            applyMutation.isPending && applyMutation.variables === template.id;

          return (
            <div
              key={template.id}
              className={clsx(
                'rounded-xl border p-4 flex flex-col gap-3',
                colors.bg,
                colors.border,
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={clsx(
                    'w-10 h-10 rounded-lg flex items-center justify-center border',
                    colors.bg,
                    colors.border,
                  )}
                >
                  <Icon className={clsx('w-5 h-5', colors.text)} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-semibold text-sm">{template.name}</h3>
                  <p className="text-white/40 text-[11px] mt-0.5 leading-relaxed">{template.description}</p>
                </div>
              </div>

              <ul className="text-white/50 text-[10px] space-y-1">
                {template.activities.map((a) => (
                  <li key={a.name}>• {a.name} (+{a.default_points})</li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => applyMutation.mutate(template.id)}
                disabled={applyMutation.isPending}
                className={clsx(
                  'w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2',
                  'bg-white/10 hover:bg-white/15 text-white border border-white/10',
                )}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  'تطبيق الباقة'
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
