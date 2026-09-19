import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  KeyRound,
  RefreshCw,
  Download,
  Pencil,
  Eye,
  EyeOff,
  User,
  Users,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';
import {
  adminUpdateUserCredentials,
  fetchManagedCredentials,
  type ManagedCredential,
} from '../../lib/managedAccounts';
import { deleteBulkGeneratedAccounts, deleteAllBulkGeneratedAccounts } from '../../lib/bulkAccounts';
import { exportRowsToExcel } from '../../lib/exportExcel';
import { SearchInput } from '../ui/SearchInput';
import { BarsLoader } from '../ui/BarsLoader';
import { Button } from '../ui/Button';
import { useGradeClassCatalog } from '../../hooks/useGradeClassCatalog';


function CredentialEditModal({
  row,
  onClose,
  onSaved,
}: {
  row: ManagedCredential;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState(row.email);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailChanged = email.trim().toLowerCase() !== row.email.toLowerCase();
    const passwordChanged = password.trim().length > 0;

    if (!emailChanged && !passwordChanged) {
      setError('لم يتم تغيير البريد أو كلمة المرور');
      return;
    }

    setLoading(true);
    try {
      await adminUpdateUserCredentials({
        user_id: row.user_id,
        ...(emailChanged ? { email: email.trim().toLowerCase() } : {}),
        ...(passwordChanged ? { password: password.trim() } : {}),
      });
      toast.success('تم تحديث بيانات الدخول');
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التحديث');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111c44] p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-1">تعديل بيانات الدخول</h3>
        <p className="text-[#A3AED0] text-sm mb-4">
          {row.student_name} — {row.account_type === 'student' ? 'طالب' : 'ولي أمر'}
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-[#EE5D50]/30 bg-[#EE5D50]/10 px-3 py-2 text-sm text-[#EE5D50]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-[#A3AED0] mb-1 block">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
              dir="ltr"
              required
            />
          </div>
          <div>
            <label className="text-xs text-[#A3AED0] mb-1 block">كلمة مرور جديدة (اختياري)</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="اتركه فارغاً للإبقاء على الحالية"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm pl-10"
                dir="ltr"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={loading} className="flex-1">
              حفظ
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              إلغاء
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** مودال تأكيد حذف حساب الطالب وولي الأمر */
function DeleteConfirmModal({
  row,
  pairedParentRow,
  onClose,
  onConfirm,
  loading,
}: {
  row: ManagedCredential;
  pairedParentRow?: ManagedCredential | null;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-md rounded-2xl border border-[#EE5D50]/30 bg-[#111c44] p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#EE5D50]/10 border border-[#EE5D50]/20 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-[#EE5D50]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">حذف الحساب بالكامل</h3>
            <p className="text-[#A3AED0] text-sm">{row.student_name}</p>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 mb-5 space-y-2 text-sm">
          <p className="text-[#A3AED0]">سيتم حذف الحسابات التالية نهائياً:</p>
          <div className="flex items-center gap-2 text-blue-300">
            <User className="w-4 h-4" />
            <span>حساب الطالب: <span className="font-mono" dir="ltr">{row.account_type === 'student' ? row.email : (pairedParentRow?.email ?? '—')}</span></span>
          </div>
          {pairedParentRow && (
            <div className="flex items-center gap-2 text-amber-300">
              <Users className="w-4 h-4" />
              <span>حساب ولي الأمر: <span className="font-mono" dir="ltr">{pairedParentRow.email}</span></span>
            </div>
          )}
          <p className="text-[#EE5D50] text-xs mt-2">
            ⚠️ هذا الإجراء لا يمكن التراجع عنه. سيتم حذف حسابات الدخول من النظام.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            إلغاء
          </Button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#EE5D50] hover:bg-[#EE5D50]/90 text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            تأكيد الحذف
          </button>
        </div>
      </div>
    </div>
  );
}

export function ManagedAccountsPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'student' | 'parent'>('all');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [editRow, setEditRow] = useState<ManagedCredential | null>(null);
  const [deleteRow, setDeleteRow] = useState<ManagedCredential | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);


  const { data: catalog } = useGradeClassCatalog(true);

  const { data: rows = [], isLoading, error, refetch } = useQuery({
    queryKey: ['managed-account-credentials'],
    queryFn: fetchManagedCredentials,
  });

  const grades = useMemo(() => {
    const fromRows = [...new Set(rows.map((r) => r.grade).filter(Boolean))] as string[];
    return [...new Set([...(catalog?.grades ?? []), ...fromRows])].sort();
  }, [rows, catalog?.grades]);

  const classes = useMemo(() => {
    if (!gradeFilter) return [];
    const fromRows = rows
      .filter((r) => r.grade === gradeFilter && r.class_name)
      .map((r) => r.class_name as string);
    const fromCatalog = catalog?.classesByGrade?.[gradeFilter] ?? [];
    return [...new Set([...fromCatalog, ...fromRows])].sort();
  }, [rows, gradeFilter, catalog?.classesByGrade]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (gradeFilter && r.grade !== gradeFilter) return false;
      if (classFilter && r.class_name !== classFilter) return false;
      if (typeFilter !== 'all' && r.account_type !== typeFilter) return false;
      if (!q) return true;
      return (
        r.student_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.admission_number.toLowerCase().includes(q)
      );
    });
  }, [rows, search, gradeFilter, classFilter, typeFilter]);

  const togglePassword = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = () => {
    if (filtered.length === 0) return;
    exportRowsToExcel(
      filtered.map((r) => ({
        'اسم الطالب': r.student_name,
        'رقم القيد': r.admission_number,
        النوع: r.account_type === 'student' ? 'طالب' : 'ولي أمر',
        الصف: r.grade ?? '',
        الفصل: r.class_name ?? '',
        'البريد الإلكتروني': r.email,
        'كلمة المرور': r.display_password,
      })),
      'الحسابات',
      `حسابات-مولدة-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    toast.success('تم تصدير الحسابات');
  };

  /** إيجاد الصف المرتبط بنفس الطالب ورقم القيد (ولي أمر أو طالب) */
  const findPairedRow = (row: ManagedCredential): ManagedCredential | null => {
    const targetType = row.account_type === 'student' ? 'parent' : 'student';
    return rows.find(
      (r) => r.admission_number === row.admission_number && r.account_type === targetType
    ) ?? null;
  };

  const handleDeleteConfirm = async () => {
    if (!deleteRow) return;
    setDeleting(true);

    const pairedRow = findPairedRow(deleteRow);

    // تحديد حساب الطالب وولي الأمر
    const studentRow = deleteRow.account_type === 'student' ? deleteRow : pairedRow;
    const parentRow = deleteRow.account_type === 'parent' ? deleteRow : pairedRow;

    if (!studentRow) {
      toast.error('لم يتم العثور على حساب الطالب لحذفه');
      setDeleting(false);
      return;
    }

    try {
      await deleteBulkGeneratedAccounts({
        studentUserId: studentRow.user_id,
        parentUserId: parentRow?.user_id ?? null,
      });
      toast.success(`تم حذف حسابات ${deleteRow.student_name} بنجاح`);
      setDeleteRow(null);
      queryClient.invalidateQueries({ queryKey: ['managed-account-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحذف');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const userIds = filtered.map((r) => r.user_id);
      const { deleted, failed } = await deleteAllBulkGeneratedAccounts(userIds);
      toast.success(`تم حذف ${deleted} حساب${failed > 0 ? ` (فشل ${failed})` : ''}`);
      setDeleteAllConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['managed-account-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحذف');
    } finally {
      setDeletingAll(false);
    }
  };


  if (error) {
    return (
      <div className="rounded-2xl border border-[#EE5D50]/30 bg-[#EE5D50]/10 p-6 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-[#EE5D50] mx-auto" />
        <p className="text-[#EE5D50] text-sm">{error instanceof Error ? error.message : 'تعذّر التحميل'}</p>
        <p className="text-[#A3AED0] text-xs">
          شغّل الملف <code className="text-white">supabase/migrations/036_managed_account_credentials.sql</code> في SQL
          Editor
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
        <KeyRound className="w-4 h-4 inline ml-1.5 -mt-0.5" />
        تُحفظ هنا كلمات المرور الحالية (عند التوليد، أو عندما يغيّر المستخدم كلمة المرور، أو عند إعادة
        التعيين من رائد النشاط). يمكنك تعديل البريد أو كلمة المرور من زر «تعديل».
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="بحث بالاسم أو البريد أو رقم القيد..."
          className="min-w-[220px] flex-1"
        />
        <select
          value={gradeFilter}
          onChange={(e) => {
            setGradeFilter(e.target.value);
            setClassFilter('');
          }}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
        >
          <option value="" className="bg-navy-900">
            كل الصفوف
          </option>
          {grades.map((g) => (
            <option key={g} value={g} className="bg-navy-900">
              {g}
            </option>
          ))}
        </select>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          disabled={!gradeFilter}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm disabled:opacity-40"
        >
          <option value="" className="bg-navy-900">
            كل الفصول
          </option>
          {classes.map((c) => (
            <option key={c} value={c} className="bg-navy-900">
              {c}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | 'student' | 'parent')}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
        >
          <option value="all" className="bg-navy-900">
            الكل
          </option>
          <option value="student" className="bg-navy-900">
            طلاب
          </option>
          <option value="parent" className="bg-navy-900">
            أولياء أمور
          </option>
        </select>
        <button
          type="button"
          onClick={() => refetch()}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white"
          aria-label="تحديث"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleExport}
          disabled={filtered.length === 0}
        >
          <Download className="w-4 h-4" />
          تصدير Excel
        </Button>
        {filtered.length > 0 && (
          <button
            type="button"
            onClick={() => setDeleteAllConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm font-semibold transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            حذف الكل ({filtered.length})
          </button>
        )}
      </div>

      {isLoading ? (
        <BarsLoader label="جاري تحميل الحسابات..." />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/50 text-sm">لا توجد حسابات محفوظة بعد</p>
          <p className="text-white/30 text-xs mt-1">ستظهر هنا بعد توليد حسابات الفصل من التبويب المجاور</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.04] text-[#A3AED0]">
                <th className="px-3 py-2.5 text-right font-semibold">الطالب</th>
                <th className="px-3 py-2.5 text-right font-semibold">رقم القيد</th>
                <th className="px-3 py-2.5 text-right font-semibold">الصف / الفصل</th>
                <th className="px-3 py-2.5 text-right font-semibold">النوع</th>
                <th className="px-3 py-2.5 text-right font-semibold">البريد</th>
                <th className="px-3 py-2.5 text-right font-semibold">كلمة المرور</th>
                <th className="px-3 py-2.5 text-center font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const showPw = visiblePasswords.has(row.id);
                return (
                  <tr key={row.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-3 py-2.5 text-white font-medium">{row.student_name}</td>
                    <td className="px-3 py-2.5 text-[#A3AED0] font-mono text-xs">{row.admission_number}</td>
                    <td className="px-3 py-2.5 text-[#A3AED0] text-xs">
                      {row.grade ?? '—'} / {row.class_name ?? '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={clsx(
                          'text-xs px-2 py-0.5 rounded-full border',
                          row.account_type === 'student'
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                        )}
                      >
                        {row.account_type === 'student' ? (
                          <>
                            <User className="w-3 h-3 inline ml-0.5" />
                            طالب
                          </>
                        ) : (
                          'ولي أمر'
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[#A3AED0] font-mono text-xs" dir="ltr">
                      {row.email}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[#f0b429] font-mono text-xs" dir="ltr">
                          {showPw ? row.display_password || '—' : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePassword(row.id)}
                          className="text-white/30 hover:text-white/70"
                        >
                          {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditRow(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#422AFB]/20 text-[#a78bfa] hover:bg-[#422AFB]/30 text-xs font-semibold"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteRow(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#EE5D50]/10 text-[#EE5D50] hover:bg-[#EE5D50]/20 text-xs font-semibold"
                          title="حذف الحساب"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editRow && (
        <CredentialEditModal
          row={editRow}
          onClose={() => setEditRow(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['managed-account-credentials'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
          }}
        />
      )}

      {deleteRow && (
        <DeleteConfirmModal
          row={deleteRow}
          pairedParentRow={findPairedRow(deleteRow)}
          onClose={() => setDeleteRow(null)}
          onConfirm={() => void handleDeleteConfirm()}
          loading={deleting}
        />
      )}

      {deleteAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#111c44] p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">حذف جميع الحسابات المعروضة</h3>
                <p className="text-[#A3AED0] text-sm">{filtered.length} حساب سيتم حذفه</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 mb-5 text-sm text-[#A3AED0]">
              <p className="mb-2">سيتم حذف جميع الحسابات المعروضة حالياً (بحسب الفلتر المطبّق):</p>
              <ul className="space-y-1 text-xs">
                {gradeFilter && <li>• الصف: {gradeFilter}</li>}
                {classFilter && <li>• الفصل: {classFilter}</li>}
                {typeFilter !== 'all' && <li>• النوع: {typeFilter === 'student' ? 'طلاب' : 'أولياء أمور'}</li>}
                {search && <li>• بحث: {search}</li>}
                {!gradeFilter && !classFilter && typeFilter === 'all' && !search && (
                  <li className="text-red-300">⚠️ لا يوجد فلتر — سيُحذف الكل</li>
                )}
              </ul>
              <p className="text-red-400 text-xs mt-3">⚠️ هذا الإجراء لا يمكن التراجع عنه.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDeleteAllConfirm(false)} disabled={deletingAll} className="flex-1">
                إلغاء
              </Button>
              <button
                onClick={() => void handleDeleteAll()}
                disabled={deletingAll}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {deletingAll ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                تأكيد حذف {filtered.length} حساب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
