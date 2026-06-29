import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Gift, Plus, Trash2, ToggleLeft, ToggleRight, Check, X } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { supabase } from '../../lib/supabase';
import {
  fetchAllRewards,
  fetchPendingRedemptions,
  fetchRewardsStoreConfig,
  processRedemption,
  saveRewardsStoreConfig,
  type RewardItem,
} from '../../lib/rewardsStore';
import { showSuccess, showError } from '../../lib/toast';
import clsx from 'clsx';

export function RewardsManagementPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '', points_cost: 50, stock: '' });

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['rewards-store-config'],
    queryFn: fetchRewardsStoreConfig,
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['rewards-items-all'],
    queryFn: fetchAllRewards,
  });

  const { data: pending = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['rewards-pending'],
    queryFn: fetchPendingRedemptions,
    refetchInterval: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => saveRewardsStoreConfig(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards-store-config'] });
      showSuccess('تم تحديث حالة المتجر');
    },
    onError: (e: Error) => showError(e),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('reward_items').insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        points_cost: form.points_cost,
        stock: form.stock === '' ? null : Number(form.stock),
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ name: '', description: '', points_cost: 50, stock: '' });
      queryClient.invalidateQueries({ queryKey: ['rewards-items-all'] });
      queryClient.invalidateQueries({ queryKey: ['rewards-items-active'] });
      showSuccess('تمت إضافة المكافأة');
    },
    onError: (e: Error) => showError(e),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reward_items').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards-items-all'] });
      showSuccess('تم إخفاء المكافأة');
    },
    onError: (e: Error) => showError(e),
  });

  const processMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      processRedemption(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards-pending'] });
      queryClient.invalidateQueries({ queryKey: ['student-metrics'] });
      showSuccess('تمت معالجة الطلب');
    },
    onError: (e: Error) => showError(e),
  });

  if (configLoading || itemsLoading || pendingLoading) {
    return <TapHandLoader label="جاري تحميل إدارة المتجر..." fullScreen />;
  }

  const activeItems = items.filter((i: RewardItem) => i.is_active);

  return (
    <div className="space-y-6 text-white" dir="rtl">
      <PageHeader
        title="متجر المكافآت — G4"
        subtitle="تفعيل المتجر · إضافة مكافآت · اعتماد طلبات الاستبدال"
        icon={Gift}
      />

      <div className="glass-card p-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-white font-semibold text-sm">حالة المتجر</p>
          <p className="text-white/40 text-xs mt-0.5">
            {config?.enabled ? 'مفعّل — الطلاب يمكنهم طلب الاستبدال' : 'معطّل — قرار إداري مطلوب للتفعيل'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toggleMutation.mutate(!config?.enabled)}
          disabled={toggleMutation.isPending}
          className={clsx(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors',
            config?.enabled
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-white/5 text-white/50 border-white/10',
          )}
        >
          {config?.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          {config?.enabled ? 'مفعّل' : 'معطّل'}
        </button>
      </div>

      {pending.length > 0 && (
        <div className="glass-card p-5 space-y-3">
          <h3 className="text-white font-semibold text-sm">طلبات استبدال معلّقة ({pending.length})</h3>
          {pending.map((r) => {
            const reward = r.reward_items as { name: string } | null;
            const student = r.students as { full_name: string; grade: string; class_name: string } | null;
            return (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/3 border border-white/5 text-xs flex-wrap"
              >
                <div>
                  <p className="text-white font-medium">{student?.full_name ?? 'طالب'}</p>
                  <p className="text-white/40">
                    {reward?.name ?? 'مكافأة'} — {r.points_cost} نقطة
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => processMutation.mutate({ id: r.id, action: 'approve' })}
                    className="p-2 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                    aria-label="اعتماد"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => processMutation.mutate({ id: r.id, action: 'reject' })}
                    className="p-2 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25"
                    aria-label="رفض"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="glass-card p-5 space-y-4">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-gold-400" />
          إضافة مكافأة
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="اسم المكافأة"
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
          />
          <input
            type="number"
            min={1}
            value={form.points_cost}
            onChange={(e) => setForm((f) => ({ ...f, points_cost: Number(e.target.value) }))}
            placeholder="التكلفة بالنقاط"
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
          />
          <input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="وصف (اختياري)"
            className="sm:col-span-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
          />
          <input
            value={form.stock}
            onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
            placeholder="المخزون (فارغ = غير محدود)"
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
          />
        </div>
        <Button
          size="sm"
          disabled={!form.name.trim() || addMutation.isPending}
          onClick={() => addMutation.mutate()}
        >
          إضافة
        </Button>
      </div>

      <div className="glass-card p-5 space-y-3">
        <h3 className="text-white font-semibold text-sm">المكافآت النشطة ({activeItems.length})</h3>
        {activeItems.length === 0 ? (
          <p className="text-white/30 text-sm">لا توجد مكافآت بعد</p>
        ) : (
          activeItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/3 border border-white/5 text-xs"
            >
              <div>
                <p className="text-white font-medium">{item.name}</p>
                <p className="text-gold-400 font-mono">{item.points_cost} نقطة</p>
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(item.id)}
                className="p-2 text-red-400/60 hover:text-red-400"
                aria-label="إخفاء"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
