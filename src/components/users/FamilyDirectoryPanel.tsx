import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Download, MessageCircle, RefreshCw, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import {
  adminRegenerateStudentLinkCode,
  whatsappShareLink,
} from '../../lib/familyOnboarding';
import { exportStudentsRosterExcel } from '../../lib/olympiadMiddleScope';
import type { DbStudent, DbUser } from '../../types';
import clsx from 'clsx';

type FamilyStudent = DbStudent & {
  parent?: Pick<DbUser, 'id' | 'full_name' | 'email' | 'phone' | 'national_id'> | null;
  account?: Pick<DbUser, 'id' | 'email' | 'phone' | 'national_id'> | null;
};

type FamilyParent = DbUser & {
  children: Pick<DbStudent, 'id' | 'full_name' | 'grade' | 'class_name' | 'link_code' | 'phone' | 'national_id'>[];
};

export function FamilyDirectoryPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'students' | 'parents'>('students');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['admin', 'family-students'],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('students')
        .select(
          'id, user_id, parent_id, admission_number, full_name, grade, class_name, phone, national_id, link_code, is_active'
        )
        .eq('is_active', true)
        .not('admission_number', 'like', 'CLASS-%')
        .order('full_name');
      if (error) throw error;

      const list = (rows ?? []) as DbStudent[];
      const parentIds = [...new Set(list.map((s) => s.parent_id).filter(Boolean))] as string[];
      const userIds = [...new Set(list.map((s) => s.user_id).filter(Boolean))] as string[];
      const allIds = [...new Set([...parentIds, ...userIds])];

      let usersMap = new Map<string, Pick<DbUser, 'id' | 'full_name' | 'email' | 'phone' | 'national_id'>>();
      if (allIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, email, phone, national_id')
          .in('id', allIds);
        if (usersError) throw usersError;
        usersMap = new Map((users ?? []).map((u) => [u.id, u]));
      }

      return list.map((s) => ({
        ...s,
        parent: s.parent_id ? usersMap.get(s.parent_id) ?? null : null,
        account: s.user_id ? usersMap.get(s.user_id) ?? null : null,
      })) as FamilyStudent[];
    },
  });

  const { data: parents = [], isLoading: loadingParents } = useQuery({
    queryKey: ['admin', 'family-parents'],
    queryFn: async () => {
      const { data: parentUsers, error } = await supabase
        .from('users')
        .select('id, email, full_name, phone, national_id, is_active, created_at')
        .eq('role', 'parent')
        .order('full_name');
      if (error) throw error;

      const ids = (parentUsers ?? []).map((p) => p.id);
      let children: DbStudent[] = [];
      if (ids.length > 0) {
        const { data: kids, error: kidsError } = await supabase
          .from('students')
          .select('id, parent_id, full_name, grade, class_name, link_code, phone, national_id')
          .in('parent_id', ids)
          .eq('is_active', true);
        if (kidsError) throw kidsError;
        children = (kids ?? []) as DbStudent[];
      }

      return (parentUsers ?? []).map((p) => ({
        ...(p as DbUser),
        children: children.filter((c) => c.parent_id === p.id),
      })) as FamilyParent[];
    },
  });

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.full_name, s.link_code, s.national_id, s.phone, s.grade, s.class_name, s.parent?.full_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [students, search]);

  const filteredParents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter((p) =>
      [p.full_name, p.email, p.phone, p.national_id, ...p.children.map((c) => c.full_name)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [parents, search]);

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`تم نسخ ${label}`);
    } catch {
      toast.error('تعذّر النسخ');
    }
  };

  const regenerate = async (studentId: string) => {
    setBusyId(studentId);
    try {
      const code = await adminRegenerateStudentLinkCode(studentId);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'family-students'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'family-parents'] });
      toast.success(`الكود الجديد: ${code}`);
      await navigator.clipboard.writeText(code).catch(() => undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل توليد الكود');
    } finally {
      setBusyId(null);
    }
  };

  const handleExportStudents = () => {
    const source = search.trim() ? filteredStudents : students;
    if (source.length === 0) {
      toast.error('لا يوجد طلاب للتصدير');
      return;
    }
    try {
      const count = exportStudentsRosterExcel(source);
      toast.success(`تم تصدير ${count} طالباً إلى Excel`);
    } catch {
      toast.error('فشل تصدير الملف');
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('students')}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-semibold',
              tab === 'students' ? 'bg-gold-500 text-navy-950' : 'bg-white/5 text-white/70'
            )}
          >
            الطلاب ({students.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('parents')}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-semibold',
              tab === 'parents' ? 'bg-gold-500 text-navy-950' : 'bg-white/5 text-white/70'
            )}
          >
            أولياء الأمور ({parents.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-1 justify-end min-w-[220px]">
          {tab === 'students' && (
            <button
              type="button"
              onClick={handleExportStudents}
              disabled={students.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-40 transition-colors"
            >
              <Download className="w-4 h-4" />
              تصدير Excel
              {search.trim() ? ` (${filteredStudents.length})` : ''}
            </button>
          )}
          <div className="relative flex-1 max-w-md min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الكود أو الهوية..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-3 py-2.5 text-sm text-white"
            />
          </div>
        </div>
      </div>

      {tab === 'students' && (
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-white/40">
                <tr>
                  <th className="px-4 py-3 text-right">الطالب</th>
                  <th className="px-4 py-3 text-right">الصف / الفصل</th>
                  <th className="px-4 py-3 text-right">الهوية</th>
                  <th className="px-4 py-3 text-right">الجوال</th>
                  <th className="px-4 py-3 text-right">كود الربط</th>
                  <th className="px-4 py-3 text-right">ولي الأمر</th>
                  <th className="px-4 py-3 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loadingStudents && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                      جاري التحميل...
                    </td>
                  </tr>
                )}
                {!loadingStudents && filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                      لا توجد بيانات
                    </td>
                  </tr>
                )}
                {filteredStudents.map((s) => {
                  const code = s.link_code || '—';
                  const shareText = `كود ربط الطالب ${s.full_name} في منصة النخبة: ${s.link_code ?? ''}`;
                  const wa = whatsappShareLink(s.phone || s.account?.phone, shareText);
                  return (
                    <tr key={s.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3 text-white font-medium">{s.full_name}</td>
                      <td className="px-4 py-3 text-white/60">
                        {s.grade} — {s.class_name}
                      </td>
                      <td className="px-4 py-3 text-white/60 font-mono text-xs" dir="ltr">
                        {s.national_id || '—'}
                      </td>
                      <td className="px-4 py-3 text-white/60 font-mono text-xs" dir="ltr">
                        {s.phone || s.account?.phone || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-gold-400 tracking-wider" dir="ltr">
                          {code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/60 text-xs">
                        {s.parent ? (
                          <div>
                            <div>{s.parent.full_name}</div>
                            <div className="text-white/35" dir="ltr">
                              {s.parent.phone || s.parent.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-amber-300/80">غير مرتبط</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {s.link_code && (
                            <button
                              type="button"
                              title="نسخ الكود"
                              onClick={() => void copyText(s.link_code!, 'الكود')}
                              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {wa && (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noreferrer"
                              title="إرسال عبر واتساب"
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            title="إعادة توليد الكود"
                            disabled={busyId === s.id}
                            onClick={() => void regenerate(s.id)}
                            className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-50"
                          >
                            <RefreshCw className={clsx('w-3.5 h-3.5', busyId === s.id && 'animate-spin')} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'parents' && (
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-white/40">
                <tr>
                  <th className="px-4 py-3 text-right">ولي الأمر</th>
                  <th className="px-4 py-3 text-right">الجوال</th>
                  <th className="px-4 py-3 text-right">الهوية</th>
                  <th className="px-4 py-3 text-right">البريد</th>
                  <th className="px-4 py-3 text-right">الأبناء المرتبطون</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loadingParents && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                      جاري التحميل...
                    </td>
                  </tr>
                )}
                {!loadingParents && filteredParents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                      لا توجد بيانات
                    </td>
                  </tr>
                )}
                {filteredParents.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-white font-medium">{p.full_name}</td>
                    <td className="px-4 py-3 text-white/60 font-mono text-xs" dir="ltr">
                      {p.phone || '—'}
                    </td>
                    <td className="px-4 py-3 text-white/60 font-mono text-xs" dir="ltr">
                      {p.national_id || '—'}
                    </td>
                    <td className="px-4 py-3 text-white/50 font-mono text-xs">{p.email}</td>
                    <td className="px-4 py-3 text-white/70 text-xs">
                      {p.children.length === 0 ? (
                        <span className="text-amber-300/80">لا يوجد أبناء مرتبطون</span>
                      ) : (
                        <ul className="space-y-1">
                          {p.children.map((c) => (
                            <li key={c.id}>
                              {c.full_name}{' '}
                              <span className="text-white/35">
                                ({c.grade}/{c.class_name})
                              </span>{' '}
                              <button
                                type="button"
                                className="text-gold-400 font-mono underline-offset-2 hover:underline"
                                dir="ltr"
                                onClick={() => c.link_code && void copyText(c.link_code, 'الكود')}
                              >
                                {c.link_code || '—'}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
