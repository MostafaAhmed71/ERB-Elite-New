import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, RefreshCw, Shield, Mail, Download, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { deleteUser, logAction, toArabicErrorMessage } from '../../lib/auth';
import { useAuthStore } from '../../stores/authStore';
import { AddUserModal } from '../users/AddUserModal';
import { InviteUserModal } from '../users/InviteUserModal';
import { DeleteUserDialog } from '../users/DeleteUserDialog';
import { UserTable } from '../users/UserTable';
import { ScreenGuideButton } from './ScreenGuideButton';
import { exportRowsToExcel } from '../../lib/exportExcel';
import { fetchUserLastActivity } from '../../lib/schoolClasses';
import type { DbUser } from '../../types';
import { ROLE_LABELS } from '../../types';
import { toast } from 'react-hot-toast';

export function UserManagement({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState<DbUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DbUser | null>(null);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<DbUser[] | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  // Form modal state for adding class
  const [showClassModal, setShowClassModal] = useState(false);
  const [newGrade, setNewGrade] = useState('');
  const [newClass, setNewClass] = useState('');

  // Fetch all users
  const { data: users = [], isLoading, error: usersError, refetch } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbUser[];
    },
  });

  useEffect(() => {
    if (usersError) {
      toast.error('تعذّر تحميل قائمة المستخدمين — تحقق من الصلاحيات');
    }
  }, [usersError]);

  const { data: lastActivity = {} } = useQuery({
    queryKey: ['users', 'last-activity'],
    queryFn: fetchUserLastActivity,
  });

  const bulkToggleMutation = useMutation({
    mutationFn: async ({ ids, is_active }: { ids: string[]; is_active: boolean }) => {
      for (const id of ids) {
        if (id === currentUser?.id) continue;
        const { error } = await supabase.from('users').update({ is_active }).eq('id', id);
        if (error) throw error;
        await logAction(is_active ? 'USER_ACTIVATED_ADMIN' : 'USER_DEACTIVATED_ADMIN', 'users', id);
      }
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setSelected(new Set());
      toast.success(is_active ? 'تم تفعيل المحددين' : 'تم تعطيل المحددين');
    },
    onError: () => toast.error('حدث خطأ أثناء التحديث الجماعي'),
  });

  const handleExportUsers = () => {
    const rows = filtered.map((u) => ({
      الاسم: u.full_name,
      'البريد الإلكتروني': u.email,
      الدور: ROLE_LABELS[u.role] ?? u.role,
      الحالة: u.is_active ? 'نشط' : 'معطّل',
      'تاريخ الإنشاء': u.created_at ? new Date(u.created_at).toLocaleDateString('ar-SA') : '',
    }));
    exportRowsToExcel(
      rows,
      'المستخدمون',
      `قائمة-المستخدمين-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    toast.success('تم تصدير قائمة المستخدمين');
  };

  const addClassMutation = useMutation({
    mutationFn: async () => {
      if (!newGrade || !newClass) throw new Error('جميع الحقول مطلوبة');
      // In this setup, grades/classes are saved dynamically inside student profile strings.
      // We can insert a stub student, or save it to a config table if existed.
      // Since classes are fetched dynamically from distinct(grade, class_name) in student table:
      // Let's create a template student profile row for that class to register it in the DB catalog.
      const { error } = await supabase.from('students').insert([{
        admission_number: `CLASS-${Date.now()}`,
        full_name: `قالب ${newGrade} - ${newClass}`,
        grade: newGrade,
        class_name: newClass,
        is_active: false, // Inactive so it behaves just as a catalog placeholder
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تمت إضافة الصف والفصل بنجاح');
      setShowClassModal(false);
      setNewGrade('');
      setNewClass('');
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Toggle user active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('users')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
      await logAction(is_active ? 'USER_ACTIVATED_ADMIN' : 'USER_DEACTIVATED_ADMIN', 'users', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('تم تحديث حالة الحساب');
    },
    onError: () => toast.error('حدث خطأ أثناء تعديل حالة الحساب'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (user: DbUser) => {
      await deleteUser(user.id);
      await logAction('USER_DELETED', 'users', user.id, {
        email: user.email,
        role: user.role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setDeleteTarget(null);
      toast.success('تم حذف المستخدم بنجاح');
    },
    onError: (err: unknown) => toast.error(toArabicErrorMessage(err)),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (targets: DbUser[]) => {
      let deleted = 0;
      const errors: string[] = [];
      for (const user of targets) {
        if (user.id === currentUser?.id) continue;
        try {
          await deleteUser(user.id);
          await logAction('USER_DELETED', 'users', user.id, {
            email: user.email,
            role: user.role,
            via: 'bulk',
          });
          deleted += 1;
        } catch (err) {
          errors.push(`${user.full_name}: ${toArabicErrorMessage(err)}`);
        }
      }
      if (deleted === 0 && errors.length > 0) {
        throw new Error(errors[0]);
      }
      return { deleted, failed: errors.length, errors };
    },
    onSuccess: ({ deleted, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setBulkDeleteTargets(null);
      setSelected(new Set());
      if (failed > 0) {
        toast.error(`تم حذف ${deleted} — فشل ${failed}`);
      } else {
        toast.success(`تم حذف ${deleted} مستخدم`);
      }
    },
    onError: (err: unknown) => toast.error(toArabicErrorMessage(err)),
  });

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole =
      roleFilter === 'all' ||
      u.role === roleFilter ||
      (roleFilter === 'admin' && u.role === 'activity_leader');
    return matchesSearch && matchesRole;
  });

  const selectedUsers = filtered.filter(
    (u) => selected.has(u.id) && u.id !== currentUser?.id
  );

  const openBulkDelete = () => {
    if (selectedUsers.length === 0) {
      toast.error('اختر مستخدمين للحذف (لا يمكن حذف حسابك)');
      return;
    }
    setBulkDeleteTargets(selectedUsers);
  };

  return (
    <div className="space-y-6 text-white" dir="rtl">
      {!embedded && (
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-gold-400" />
              إدارة المستخدمين والفصول
            </h1>
            <p className="text-white/40 text-sm mt-1">
              تعديل صلاحيات المعلمين، الأخصائيين، والطلاب وإدارة فصول المدرسة
            </p>
          </div>
          <ScreenGuideButton path="/admin/users" />
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        {!embedded && (
          <p className="text-white/40 text-sm">{users.length} مستخدم مسجّل</p>
        )}
        <div className="flex items-center gap-3 flex-wrap ms-auto">
          <button
            type="button"
            onClick={() => {
              setBulkMode(!bulkMode);
              setSelected(new Set());
            }}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-sm transition-all"
          >
            {bulkMode ? 'إلغاء التحديد' : 'تحديد متعدد'}
          </button>
          {bulkMode && selected.size > 0 && (
            <>
              <button
                type="button"
                onClick={() => bulkToggleMutation.mutate({ ids: [...selected], is_active: true })}
                disabled={bulkToggleMutation.isPending}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm"
              >
                <ToggleRight className="w-4 h-4" />
                تفعيل ({selected.size})
              </button>
              <button
                type="button"
                onClick={() => bulkToggleMutation.mutate({ ids: [...selected], is_active: false })}
                disabled={bulkToggleMutation.isPending}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm"
              >
                <ToggleLeft className="w-4 h-4" />
                تعطيل ({selected.size})
              </button>
              <button
                type="button"
                onClick={openBulkDelete}
                disabled={bulkDeleteMutation.isPending || selectedUsers.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 rounded-xl text-sm disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
                حذف المحدد ({selectedUsers.length})
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all"
            aria-label="تحديث"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleExportUsers}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            تصدير Excel
          </button>
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-sm transition-all"
          >
            <Mail className="w-4 h-4" />
            دعوة موظف
          </button>
          <button
            type="button"
            onClick={() => setShowClassModal(true)}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-sm transition-all"
          >
            إضافة فصل دراسي
          </button>
          <button
            type="button"
            onClick={() => {
              setEditUser(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-gold-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            إضافة مستخدم
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex gap-4 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute top-1/2 -translate-y-1/2 right-4 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو البريد الإلكتروني..."
            className="w-full bg-navy-900/50 border border-white/10 rounded-xl px-4 pr-11 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/40 text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="bg-navy-900/50 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none"
        >
          <option value="all" className="bg-navy-950">كل الصلاحيات</option>
          <option value="admin" className="bg-navy-950">رائد النشاط</option>
          <option value="activity_leader" className="bg-navy-950">رائد النشاط (قديم)</option>
          <option value="principal" className="bg-navy-950">مدير المدرسة</option>
          <option value="teacher" className="bg-navy-950">المعلم</option>
          <option value="student" className="bg-navy-950">الطالب</option>
          <option value="parent" className="bg-navy-950">ولي الأمر</option>
          <option value="supervisor" className="bg-navy-950">المشرف التربوي</option>
        </select>
      </div>

      {/* Table */}
      <UserTable
        users={filtered}
        loading={isLoading}
        currentUserId={currentUser?.id}
        lastActivity={lastActivity}
        selected={bulkMode ? selected : undefined}
        onSelectChange={(id, checked) => {
          setSelected((prev) => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
          });
        }}
        onSelectAll={(checked) => {
          setSelected(checked ? new Set(filtered.map((u) => u.id)) : new Set());
        }}
        onEdit={(user) => {
          setEditUser(user);
          setShowAddModal(true);
        }}
        onToggleActive={(user) =>
          toggleActiveMutation.mutate({ id: user.id, is_active: !user.is_active })
        }
        onDelete={(user) => setDeleteTarget(user)}
      />

      <InviteUserModal open={showInviteModal} onClose={() => setShowInviteModal(false)} />

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          editUser={editUser}
          onClose={() => { setShowAddModal(false); setEditUser(null); }}
          onSuccess={async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            await refetch();
            setShowAddModal(false);
            setEditUser(null);
            setRoleFilter('all');
            setSearch('');
          }}
        />
      )}

      <AnimatePresence>
        {deleteTarget && (
          <DeleteUserDialog
            user={deleteTarget}
            loading={deleteMutation.isPending}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => deleteMutation.mutate(deleteTarget)}
          />
        )}
        {bulkDeleteTargets && (
          <DeleteUserDialog
            users={bulkDeleteTargets}
            loading={bulkDeleteMutation.isPending}
            onClose={() => setBulkDeleteTargets(null)}
            onConfirm={() => bulkDeleteMutation.mutate(bulkDeleteTargets)}
          />
        )}
      </AnimatePresence>

      {/* Add Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-white font-bold text-base flex items-center gap-2">
                إضافة فصل دراسي جديد
              </h2>
              <button onClick={() => setShowClassModal(false)} className="text-white/40 hover:text-white/80">✕</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); addClassMutation.mutate(); }} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-white/60 text-xs">الصف الدراسي</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الصف الأول الثانوي"
                  value={newGrade}
                  onChange={e => setNewGrade(e.target.value)}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-400/50 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-white/60 text-xs">اسم الفصل / الشعبة</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 1/أ"
                  value={newClass}
                  onChange={e => setNewClass(e.target.value)}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-400/50 text-sm"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={addClassMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 font-bold text-xs hover:shadow-lg disabled:opacity-50"
                >
                  {addClassMutation.isPending ? 'جاري الإضافة...' : 'حفظ الفصل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
