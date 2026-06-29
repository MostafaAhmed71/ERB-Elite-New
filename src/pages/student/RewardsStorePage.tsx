import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Gift, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useStudentMetrics } from '../../hooks/useStudentMetrics';
import {
  fetchActiveRewards,
  fetchRewardsStoreConfig,
  redeemReward,
} from '../../lib/rewardsStore';
import { showSuccess, showError } from '../../lib/toast';
import { PageHeader, TapHandLoader } from '../../components/ui';
import { Button } from '../../components/ui/Button';

type Props = {
  studentId: string;
  studentName: string;
};

export function RewardsStorePage({ studentId, studentName }: Props) {
  const queryClient = useQueryClient();
  const metrics = useStudentMetrics(studentId);

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['rewards-store-config'],
    queryFn: fetchRewardsStoreConfig,
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['rewards-items-active'],
    queryFn: fetchActiveRewards,
    enabled: config?.enabled === true,
  });

  const redeemMutation = useMutation({
    mutationFn: redeemReward,
    onSuccess: () => {
      showSuccess('تم إرسال طلب الاستبدال — بانتظار اعتماد رائد النشاط');
      queryClient.invalidateQueries({ queryKey: ['student-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['rewards-items-active'] });
    },
    onError: (e: Error) => showError(e),
  });

  const isLoading = configLoading || itemsLoading || metrics.isLoading;
  const balance = metrics.totalPoints;

  if (isLoading) {
    return <TapHandLoader label="جاري تحميل المتجر..." fullScreen />;
  }

  return (
    <div className="space-y-6 text-white" dir="rtl">
      <PageHeader
        title="متجر المكافآت"
        subtitle={`مرحباً ${studentName} — استبدل نقاطك بمكافآت حقيقية`}
        icon={ShoppingBag}
      />

      {!config?.enabled ? (
        <div className="glass-card p-8 text-center space-y-2">
          <Gift className="w-10 h-10 text-white/20 mx-auto" />
          <p className="text-white font-semibold">المتجر غير مفعّل حالياً</p>
          <p className="text-white/40 text-sm">سيتم تفعيله بقرار من إدارة المدرسة قريباً — G4</p>
          <Link to="/student" className="text-gold-400 text-sm hover:underline inline-block mt-2">
            العودة للوحة
          </Link>
        </div>
      ) : (
        <>
          <div className="glass-card p-4 flex items-center justify-between">
            <span className="text-white/50 text-sm">رصيدك المتاح</span>
            <span className="text-gold-400 font-black text-2xl font-mono">{balance} نقطة</span>
          </div>

          {items.length === 0 ? (
            <p className="text-white/30 text-center py-12">لا توجد مكافآت معروضة حالياً</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => {
                const canAfford = balance >= item.points_cost;
                const inStock = item.stock === null || item.stock > 0;
                return (
                  <div key={item.id} className="glass-card p-5 space-y-3 flex flex-col">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
                        <Gift className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-white font-bold text-sm">{item.name}</h3>
                        {item.description && (
                          <p className="text-white/40 text-xs mt-1 line-clamp-2">{item.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <span className="text-gold-400 font-bold font-mono">{item.points_cost} ن</span>
                      {item.stock != null && (
                        <span className="text-white/30 text-[10px]">متبقي: {item.stock}</span>
                      )}
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      disabled={!canAfford || !inStock || redeemMutation.isPending}
                      onClick={() => redeemMutation.mutate(item.id)}
                    >
                      {!inStock ? 'نفد المخزون' : canAfford ? 'طلب استبدال' : 'رصيد غير كافٍ'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
