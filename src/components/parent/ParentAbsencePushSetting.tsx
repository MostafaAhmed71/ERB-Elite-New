import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, ClipboardList } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { showSuccess, showError } from '../../lib/toast';
import clsx from 'clsx';

type PushPref = 'absence_push_opt_in' | 'exam_push_opt_in';

function PushToggle({
  pref,
  label,
  description,
  icon: Icon,
}: {
  pref: PushPref;
  label: string;
  description: string;
  icon: typeof Bell;
}) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: enabled = true, isLoading } = useQuery({
    queryKey: ['parent', pref, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select(pref)
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return Boolean((data as Record<string, boolean | undefined>)[pref] ?? true);
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase
        .from('users')
        .update({ [pref]: next, updated_at: new Date().toISOString() })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: (_v, next) => {
      queryClient.invalidateQueries({ queryKey: ['parent', pref] });
      showSuccess(next ? 'تم التفعيل' : 'تم الإيقاف');
    },
    onError: (e: Error) => showError(e),
  });

  if (isLoading) return null;

  return (
    <div className="glass-card p-4 flex items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-white font-semibold text-sm">{label}</p>
          <p className="text-white/40 text-xs mt-0.5">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => mutation.mutate(!enabled)}
        disabled={mutation.isPending}
        className={clsx(
          'shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
          enabled
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            : 'bg-white/5 text-white/40 border-white/10',
        )}
      >
        {enabled ? 'مفعّل' : 'معطّل'}
      </button>
    </div>
  );
}

/** PA7 + PA7+ — تفضيلات Push لولي الأمر */
export function ParentPushSettings() {
  return (
    <div className="space-y-3" dir="rtl">
      <PushToggle
        pref="absence_push_opt_in"
        icon={Bell}
        label="تنبيه Push عند الغياب — PA7"
        description="إشعار فوري لجوالك عند تسجيل غياب لابنك (يتطلب تفعيل Push)"
      />
      <PushToggle
        pref="exam_push_opt_in"
        icon={ClipboardList}
        label="تنبيه Push عند نتيجة الاختبار — PA7+"
        description="إشعار فوري عند رصد نتيجة اختبار جديدة لابنك"
      />
    </div>
  );
}

/** @deprecated استخدم ParentPushSettings */
export const ParentAbsencePushSetting = ParentPushSettings;
