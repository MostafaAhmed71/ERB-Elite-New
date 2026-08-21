import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { HorizonCard } from '../dashboard/horizon/HorizonDashboard';
import { aiCreditsService } from '../../lib/ai/aiAssistantService';

/** H+ — ملخص استخدام AI للمدير (ليس عمق /dev) */
export function PrincipalAiUsageSummaryCard() {
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['principal', 'ai-usage-summary'],
    queryFn: () => aiCreditsService.usageStats(from),
    refetchInterval: 120_000,
    retry: false,
  });

  if (isError) return null;

  const total = (data?.success_count ?? 0) + (data?.failed_count ?? 0);
  const rate = total ? Math.round(((data?.success_count ?? 0) / total) * 100) : null;

  return (
    <HorizonCard className="border border-violet-500/20">
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-violet-300 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">ملخص AI (30 يوماً)</p>
          <p className="text-xs text-surface-muted mt-1">
            {isLoading
              ? 'جاري التحميل…'
              : `نجاح ${data?.success_count ?? 0} · فشل ${data?.failed_count ?? 0}${
                  rate != null ? ` · معدل ${rate}%` : ''
                } · رصيد مستهلك ≈ ${data?.total_credits ?? 0}`}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link
              to="/principal/ai-settings"
              className="text-[11px] text-violet-300 hover:underline"
            >
              إعدادات AI للمعلمين
            </Link>
          </div>
        </div>
      </div>
    </HorizonCard>
  );
}
