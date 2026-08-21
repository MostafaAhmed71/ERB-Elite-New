import { Pencil, ToggleLeft, ToggleRight, Trash2, Users } from 'lucide-react';
import type { DbUser } from '../../types';
import { ROLE_LABELS, ROLE_COLORS } from '../../types';
import { ACADEMIC_LEVEL_LABELS } from '../../lib/academic/constants';
import clsx from 'clsx';
import { DataTable } from '../ui/DataTable';

interface UserTableProps {
  users: DbUser[];
  loading: boolean;
  currentUserId?: string | null;
  lastActivity?: Record<string, string>;
  selected?: Set<string>;
  onSelectChange?: (id: string, checked: boolean) => void;
  onSelectAll?: (checked: boolean) => void;
  onEdit: (user: DbUser) => void;
  onToggleActive: (user: DbUser) => void;
  onDelete: (user: DbUser) => void;
}

export function UserTable({
  users,
  loading,
  currentUserId,
  lastActivity = {},
  selected,
  onSelectChange,
  onSelectAll,
  onEdit,
  onToggleActive,
  onDelete,
}: UserTableProps) {
  const bulkMode = !!selected && !!onSelectChange;
  const allSelected = bulkMode && users.length > 0 && users.every((u) => selected.has(u.id));

  return (
    <DataTable
      loading={loading}
      empty={!loading && users.length === 0}
      emptyTitle="لا يوجد مستخدمون"
      emptyDescription="ابدأ بإضافة معلمين ومشرفين ورائد نشاط لمدرستك"
      emptyIcon={Users}
      emptyAction={{ label: 'إضافة مستخدم', onClick: () => document.getElementById('add-user-btn')?.click() }}
      skeletonRows={5}
      skeletonColumns={bulkMode ? 7 : 6}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5 border-b border-white/5">
            <tr>
              {bulkMode && (
                <th className="px-4 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onSelectAll?.(e.target.checked)}
                    className="rounded border-white/20"
                  />
                </th>
              )}
              <th className="px-6 py-4 text-right text-white/40 font-medium">المستخدم</th>
              <th className="px-6 py-4 text-right text-white/40 font-medium">البريد الإلكتروني</th>
              <th className="px-6 py-4 text-right text-white/40 font-medium hidden lg:table-cell">الجوال</th>
              <th className="px-6 py-4 text-right text-white/40 font-medium">الدور</th>
              <th className="px-6 py-4 text-right text-white/40 font-medium">الحالة</th>
              <th className="px-6 py-4 text-right text-white/40 font-medium">آخر نشاط</th>
              <th className="px-6 py-4 text-right text-white/40 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-white/3 transition-colors group">
                {bulkMode && (
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selected.has(user.id)}
                      onChange={(e) => onSelectChange(user.id, e.target.checked)}
                      disabled={user.id === currentUserId}
                      className="rounded border-white/20"
                    />
                  </td>
                )}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {user.full_name.charAt(0)}
                    </div>
                    <span className="text-white font-medium">{user.full_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-white/50 font-mono text-xs">{user.email}</td>
                <td className="px-6 py-4 text-white/50 font-mono text-xs hidden lg:table-cell" dir="ltr">
                  {user.phone || '—'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col items-start gap-1">
                    <span className={clsx('px-2.5 py-1 rounded-full text-xs border font-medium', ROLE_COLORS[user.role])}>
                      {ROLE_LABELS[user.role]}
                    </span>
                    {user.role === 'deputy' && (
                      <span className="text-[11px] text-white/45">
                        {user.staff_education_level === 'middle' || user.staff_education_level === 'high'
                          ? ACADEMIC_LEVEL_LABELS[user.staff_education_level]
                          : 'بدون مرحلة — عدّل الحساب'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={clsx(
                    'px-2.5 py-1 rounded-full text-xs border font-medium',
                    user.is_active
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                      : 'bg-red-500/15 text-red-300 border-red-500/25'
                  )}>
                    {user.is_active ? 'نشط' : 'معطل'}
                  </span>
                </td>
                <td className="px-6 py-4 text-white/40 text-xs">
                  {lastActivity[user.id]
                    ? new Date(lastActivity[user.id]).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })
                    : '—'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(user)}
                      title="تعديل"
                      className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onToggleActive(user)}
                      title={user.is_active ? 'تعطيل' : 'تفعيل'}
                      className={clsx(
                        'p-1.5 rounded-lg transition-all',
                        user.is_active
                          ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                      )}
                    >
                      {user.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                    </button>
                    {user.id !== currentUserId && (
                      <button
                        onClick={() => onDelete(user)}
                        title="حذف"
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DataTable>
  );
}
