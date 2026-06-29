import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Shield, Mail, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { deleteUser, logAction, toArabicErrorMessage } from '../../lib/auth';
import { useAuthStore } from '../../stores/authStore';
import { AddUserModal } from '../../components/users/AddUserModal';
import { InviteUserModal } from '../../components/users/InviteUserModal';
import { DeleteUserDialog } from '../../components/users/DeleteUserDialog';
import { UserTable } from '../../components/users/UserTable';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui';
import { fetchUserLastActivity } from '../../lib/schoolClasses';
import type { DbUser } from '../../types';
import { showSuccess, showError } from '../../lib/toast';
import { AnimatePresence } from 'framer-motion';

export function UsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editUser, setEditUser] = useState<DbUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DbUser | null>(null);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<DbUser[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbUser[];
    },
  });

  const { data: lastActivity = {} } = useQuery({
    queryKey: ['users', 'last-activity'],
    queryFn: fetchUserLastActivity,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('users').update({ is_active }).eq('id', id);
      if (error) throw error;
      await logAction(is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 'users', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showSuccess('تم تحديث حالة المستخدم');
    },
    onError: (e: Error) => showError(e),
  });

  const bulkToggleMutation = useMutation({
    mutationFn: async ({ ids, is_active }: { ids: string[]; is_active: boolean }) => {
      for (const id of ids) {
        if (id === currentUser?.id) continue;
        const { error } = await supabase.from('users').update({ is_active }).eq('id', id);
        if (error) throw error;
        await logAction(is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 'users', id);
      }
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelected(new Set());
      showSuccess(is_active ? 'تم تفعيل المحددين' : 'تم تعطيل المحددين');
    },
    onError: (e: Error) => showError(e),
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
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteTarget(null);
      showSuccess('تم حذف المستخدم بنجاح');
    },
    onError: (err: unknown) => showError(toArabicErrorMessage(err)),
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
      return { deleted, failed: errors.length };
    },
    onSuccess: ({ deleted, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setBulkDeleteTargets(null);
      setSelected(new Set());
      if (failed > 0) {
        showError(null, `تم حذف ${deleted} — فشل ${failed}`);
      } else {
        showSuccess(`تم حذف ${deleted} مستخدم`);
      }
    },
    onError: (err: unknown) => showError(err),
  });

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const selectedUsers = filtered.filter(
    (u) => selected.has(u.id) && u.id !== currentUser?.id
  );

  const openBulkDelete = () => {
    if (selectedUsers.length === 0) {
      showError(null, 'اختر مستخدمين للحذف (لا يمكن حذف حسابك)');
      return;
    }
    setBulkDeleteTargets(selectedUsers);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="إدارة المستخدمين"
        subtitle={`${users.length} مستخدم مسجل في النظام`}
        icon={Shield}
        badge={users.length > 0 ? `${users.length}` : undefined}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setBulkMode(!bulkMode);
                setSelected(new Set());
              }}
            >
              {bulkMode ? 'إلغاء التحديد' : 'تحديد متعدد'}
            </Button>
            {bulkMode && selected.size > 0 && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ToggleRight className="w-4 h-4" />}
                  onClick={() => bulkToggleMutation.mutate({ ids: [...selected], is_active: true })}
                  disabled={bulkToggleMutation.isPending}
                >
                  تفعيل ({selected.size})
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ToggleLeft className="w-4 h-4" />}
                  onClick={() => bulkToggleMutation.mutate({ ids: [...selected], is_active: false })}
                  disabled={bulkToggleMutation.isPending}
                >
                  تعطيل ({selected.size})
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Trash2 className="w-4 h-4" />}
                  onClick={openBulkDelete}
                  disabled={bulkDeleteMutation.isPending || selectedUsers.length === 0}
                  className="!border-red-500/30 !text-red-300 hover:!bg-red-500/10"
                >
                  حذف المحدد ({selectedUsers.length})
                </Button>
              </>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              icon={<RefreshCw className="w-4 h-4" />}
              aria-label="تحديث"
            />
            <Button
              variant="secondary"
              size="md"
              icon={<Mail className="w-4 h-4" />}
              onClick={() => setShowInviteModal(true)}
            >
              دعوة موظف
            </Button>
            <Button
              id="add-user-btn"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => { setEditUser(null); setShowAddModal(true); }}
            >
              إضافة مستخدم
            </Button>
          </div>
        }
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="بحث بالاسم أو البريد الإلكتروني..."
      />

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
        onEdit={(user) => { setEditUser(user); setShowAddModal(true); }}
        onToggleActive={(user) =>
          toggleActiveMutation.mutate({ id: user.id, is_active: !user.is_active })
        }
        onDelete={(user) => setDeleteTarget(user)}
      />

      <InviteUserModal open={showInviteModal} onClose={() => setShowInviteModal(false)} />

      <AnimatePresence>
        {showAddModal && (
          <AddUserModal
            editUser={editUser}
            onClose={() => { setShowAddModal(false); setEditUser(null); }}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['users'] });
              setShowAddModal(false);
              setEditUser(null);
            }}
          />
        )}
      </AnimatePresence>

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
    </div>
  );
}
