import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Star, Pencil, Trash2, RefreshCw, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAction } from '../../lib/auth';
import type { DbActivity } from '../../types';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

import { containerVariants, itemVariants, modalOverlayVariants, modalContentVariants } from '../../lib/motionVariants';
import { BarsLoader } from '../../components/ui/BarsLoader';

const CATEGORIES = ['أكاديمي', 'رياضي', 'ثقافي', 'اجتماعي', 'ديني', 'أخرى'];

interface ActivityModalProps {
  activity: DbActivity | null;
  onClose: () => void;
  onSuccess: () => void;
}

function ActivityModal({ activity, onClose, onSuccess }: ActivityModalProps) {
  const isEdit = !!activity;
  const [form, setForm] = useState({
    name: activity?.name ?? '',
    category: activity?.category ?? CATEGORIES[0],
    default_points: activity?.default_points ?? 10,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        const { error } = await supabase.from('activities').update(form).eq('id', activity!.id);
        if (error) throw error;
        await logAction('ACTIVITY_UPDATED', 'activities', activity!.id, form);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('activities').insert({ ...form, created_by: user!.id });
        if (error) throw error;
        await logAction('ACTIVITY_CREATED', 'activities', undefined, form);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'تم تحديث النشاط' : 'تم إنشاء النشاط');
      onSuccess();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <motion.div
      variants={modalOverlayVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <motion.div
        variants={modalContentVariants}
        initial="hidden"
        animate="show"
        exit="exit"
        className="glass-card w-full max-w-md shadow-2xl overflow-hidden border-white/10"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-gold-400" />
            {isEdit ? 'تعديل النشاط' : 'إضافة نشاط جديد'}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">✕</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-white/60 text-sm">اسم النشاط</label>
            <input
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              required placeholder="مثال: قراءة كتاب"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-white/60 text-sm">التصنيف</label>
            <select
              value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none"
            >
              {CATEGORIES.map(c => <option key={c} value={c} className="bg-navy-900">{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-white/60 text-sm">النقاط الافتراضية</label>
            <input
              type="number" min={1} max={1000}
              value={form.default_points} onChange={(e) => setForm({ ...form, default_points: Number(e.target.value) })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-400/50 text-sm"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white text-sm transition-all">إلغاء</button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 font-semibold text-sm disabled:opacity-60">
              {mutation.isPending ? 'جاري الحفظ...' : isEdit ? 'حفظ' : 'إنشاء'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export function ActivitiesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editActivity, setEditActivity] = useState<DbActivity | null>(null);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('activities').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbActivity[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('activities').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activities'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) throw error;
      await logAction('ACTIVITY_DELETED', 'activities', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('تم حذف النشاط');
    },
    onError: () => toast.error('لا يمكن حذف نشاط مرتبط بنقاط'),
  });

  const CATEGORY_COLORS: Record<string, string> = {
    'أكاديمي': 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    'رياضي': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    'ثقافي': 'bg-purple-500/15 text-purple-300 border-purple-500/25',
    'اجتماعي': 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25',
    'ديني': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
    'أخرى': 'bg-white/10 text-white/60 border-white/15',
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
      dir="rtl"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Star className="w-6 h-6 text-gold-400" /> إدارة الأنشطة
          </h1>
          <p className="text-white/40 text-sm mt-1">{activities.length} نشاط مسجل</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setEditActivity(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-gold-500/20 transition-all"
        >
          <Plus className="w-4 h-4" /> إضافة نشاط
        </motion.button>
      </div>

      {isLoading ? (
        <BarsLoader label="جاري تحميل الأنشطة..." fullScreen />
      ) : (
        <motion.div
          layout
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {activities.map((act) => (
              <motion.div
                key={act.id}
                layout
                variants={itemVariants}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, scale: 0.9, y: 15, transition: { duration: 0.15 } }}
                whileHover={{ y: -4, scale: 1.02 }}
                className={clsx(
                  'bg-navy-900/50 border rounded-2xl p-5 transition-all cursor-pointer',
                  act.is_active ? 'border-white/8' : 'border-white/4 opacity-60'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={clsx('px-2.5 py-1 rounded-full text-xs border', CATEGORY_COLORS[act.category] ?? CATEGORY_COLORS['أخرى'])}>
                    <Tag className="w-3 h-3 inline ml-1" />{act.category}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditActivity(act); setShowModal(true); }}
                      className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteMutation.mutate(act.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="text-white font-semibold mb-1">{act.name}</h3>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-gold-400 font-bold text-lg">{act.default_points} <span className="text-white/40 text-sm font-normal">نقطة</span></span>
                  <button onClick={() => toggleMutation.mutate({ id: act.id, is_active: !act.is_active })}
                    className={clsx('px-3 py-1 rounded-full text-xs border transition-all',
                      act.is_active ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' : 'bg-white/5 text-white/40 border-white/10'
                    )}>
                    {act.is_active ? 'نشط' : 'معطل'}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {showModal && (
          <ActivityModal
            activity={editActivity}
            onClose={() => { setShowModal(false); setEditActivity(null); }}
            onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['activities'] }); setShowModal(false); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
