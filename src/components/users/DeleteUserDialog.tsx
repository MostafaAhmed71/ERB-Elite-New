import { AlertTriangle, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { DbUser } from '../../types';
import { ROLE_LABELS } from '../../types';
import clsx from 'clsx';

interface DeleteUserDialogProps {
  user?: DbUser;
  users?: DbUser[];
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteUserDialog({ user, users, loading, onClose, onConfirm }: DeleteUserDialogProps) {
  const bulkList = users?.length ? users : null;
  const isBulk = Boolean(bulkList && bulkList.length > 0);
  const target = !isBulk ? user : null;

  if (!isBulk && !target) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      dir="rtl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-navy-900 border border-red-500/20 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            {isBulk ? `حذف ${bulkList!.length} مستخدم` : 'حذف المستخدم'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {isBulk ? (
            <>
              <p className="text-white/70 text-sm leading-relaxed">
                هل أنت متأكد من حذف{' '}
                <span className="text-white font-semibold">{bulkList!.length}</span> مستخدم محدد؟
              </p>
              <ul className="p-3 bg-white/5 border border-white/10 rounded-xl text-sm space-y-2 max-h-48 overflow-y-auto">
                {bulkList!.slice(0, 20).map((u) => (
                  <li key={u.id} className="flex justify-between gap-2 text-white/70">
                    <span className="truncate">{u.full_name}</span>
                    <span className="text-white/40 shrink-0 text-xs">{ROLE_LABELS[u.role]}</span>
                  </li>
                ))}
                {bulkList!.length > 20 && (
                  <li className="text-white/40 text-xs">… و{bulkList!.length - 20} آخرين</li>
                )}
              </ul>
            </>
          ) : (
            <>
              <p className="text-white/70 text-sm leading-relaxed">
                هل أنت متأكد من حذف المستخدم{' '}
                <span className="text-white font-semibold">{target!.full_name}</span>؟
              </p>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-sm space-y-1">
                <p className="text-white/50">{target!.email}</p>
                <p className="text-white/40">{ROLE_LABELS[target!.role]}</p>
              </div>
            </>
          )}
          <p className="text-red-300/80 text-xs">
            هذا الإجراء نهائي ولا يمكن التراجع عنه. سيتم حذف الحسابات وبياناتها من النظام.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-sm font-medium transition-all disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={clsx(
                'flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all',
                'bg-red-500/90 hover:bg-red-500 text-white',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            >
              {loading
                ? 'جاري الحذف...'
                : isBulk
                  ? `نعم، احذف (${bulkList!.length})`
                  : 'نعم، احذف المستخدم'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
