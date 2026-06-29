import { Link } from 'react-router-dom';
import { Clock, TrendingUp, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';
import type { PendingInsight } from '../../lib/pointsAnalytics';
import clsx from 'clsx';

type Props = {
  insights: PendingInsight;
  onQuickApprove?: () => void;
  isApproving?: boolean;
};

export function PendingSummaryPanel({ insights, onQuickApprove, isApproving }: Props) {
  const cards = [
    {
      label: 'طلبات معلّقة',
      value: insights.pendingCount,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      highlight: insights.pendingCount > 0,
    },
    {
      label: 'أقدم طلب',
      value: insights.oldestDays !== null ? `منذ ${insights.oldestDays} يوم` : '—',
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
      highlight: (insights.oldestDays ?? 0) >= 2,
    },
    {
      label: 'أعلى طلب',
      value:
        insights.highestPoints > 0
          ? `${insights.highestPoints} ن — ${insights.highestTeacher ?? '—'}`
          : '—',
      icon: TrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
      highlight: false,
    },
    {
      label: 'معتمد اليوم',
      value: insights.todayApproved,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      highlight: false,
    },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={clsx(
                'rounded-2xl border p-4 transition-all',
                card.bg,
                card.highlight && 'ring-1 ring-amber-500/30'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={clsx('w-4 h-4', card.color)} />
                <span className="text-white/50 text-xs">{card.label}</span>
              </div>
              <p className={clsx('text-lg font-bold tabular-nums', card.color)}>{card.value}</p>
            </div>
          );
        })}
      </div>

      {insights.pendingCount > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/points"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-500/15 text-gold-400 border border-gold-500/25 text-sm font-semibold hover:bg-gold-500/25 transition-colors"
          >
            مراجعة الطلبات
            <ArrowLeft className="w-4 h-4" />
          </Link>
          {onQuickApprove && insights.pendingCount > 0 && (
            <button
              type="button"
              onClick={onQuickApprove}
              disabled={isApproving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-sm font-semibold hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {isApproving ? 'جاري الموافقة...' : 'موافقة سريعة على الكل'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
