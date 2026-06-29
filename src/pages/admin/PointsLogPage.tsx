import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, Download, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { DataTable } from '../../components/ui/DataTable';
import { exportRowsToExcel } from '../../lib/exportExcel';
import type { PointsStatus } from '../../types';
import clsx from 'clsx';

type LedgerRow = {
  id: string;
  points: number;
  note: string | null;
  rejection_reason: string | null;
  status: PointsStatus;
  created_at: string;
  approved_at: string | null;
  students: { full_name: string; grade: string; class_name: string } | null;
  granted_by_user: { full_name: string } | null;
  activities: { name: string; category: string } | null;
};

const STATUS_LABELS: Record<PointsStatus, string> = {
  pending: 'معلق',
  pending_principal: 'معلّق',
  approved: 'معتمد',
  rejected: 'مرفوض',
};

const STATUS_COLORS: Record<PointsStatus, string> = {
  pending: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  pending_principal: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
  approved: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  rejected: 'bg-red-500/10 border-red-500/20 text-red-400',
};

type PointsLogPageProps = { embedded?: boolean };

export function PointsLogPage({ embedded = false }: PointsLogPageProps) {
  const [statusFilter, setStatusFilter] = useState<PointsStatus | ''>('');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [teacherFilter, setTeacherFilter] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const { data: teachers = [] } = useQuery({
    queryKey: ['users', 'teachers-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'teacher')
        .order('full_name');
      if (error) throw error;
      return data as { id: string; full_name: string }[];
    },
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['points_ledger', 'full-log', statusFilter, startDate, endDate, teacherFilter],
    queryFn: async () => {
      let query = supabase
        .from('points_ledger')
        .select(`
          id,
          points,
          note,
          rejection_reason,
          status,
          created_at,
          approved_at,
          students:student_id(full_name, grade, class_name),
          granted_by_user:granted_by(full_name),
          activities:activity_id(name, category)
        `)
        .gte('created_at', `${startDate}T00:00:00Z`)
        .lte('created_at', `${endDate}T23:59:59Z`)
        .order('created_at', { ascending: false });

      if (statusFilter) query = query.eq('status', statusFilter);
      if (teacherFilter) query = query.eq('granted_by', teacherFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as LedgerRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!studentSearch.trim()) return entries;
    const q = studentSearch.trim().toLowerCase();
    return entries.filter((e) =>
      (e.students?.full_name ?? '').toLowerCase().includes(q) ||
      `${e.students?.grade ?? ''} ${e.students?.class_name ?? ''}`.toLowerCase().includes(q)
    );
  }, [entries, studentSearch]);

  const handleExport = () => {
    const rows = filtered.map((e) => ({
      الطالب: e.students?.full_name ?? '—',
      الصف: e.students?.grade ?? '—',
      الفصل: e.students?.class_name ?? '—',
      المعلم: e.granted_by_user?.full_name ?? '—',
      النشاط: e.activities?.name ?? '—',
      المحور: e.activities?.category ?? '—',
      النقاط: e.points,
      الحالة: STATUS_LABELS[e.status],
      الملاحظة: e.note ?? '',
      سبب_الرفض: e.rejection_reason ?? '',
      تاريخ_المنح: new Date(e.created_at).toLocaleString('ar-EG'),
      تاريخ_الموافقة: e.approved_at ? new Date(e.approved_at).toLocaleString('ar-EG') : '',
    }));
    exportRowsToExcel(rows, 'سجل النقاط', `سجل_النقاط_${startDate}_${endDate}.xlsx`);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {!embedded && (
        <PageHeader
          icon={ScrollText}
          title="سجل عمليات منح النقاط"
          subtitle="عرض كامل لجميع عمليات الرصد مع التبرير والحالة"
          guidePath="/admin/points"
          actions={
            <Button icon={<Download className="w-4 h-4" />} onClick={handleExport} disabled={filtered.length === 0}>
              تصدير Excel
            </Button>
          }
        />
      )}

      <div className="glass-card p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="space-y-1">
          <label className="text-white/50 text-xs flex items-center gap-1">
            <Filter className="w-3 h-3" /> الحالة
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PointsStatus | '')}
            className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
          >
            <option value="" className="bg-navy-900">الكل</option>
            <option value="pending" className="bg-navy-900">معلق</option>
            <option value="approved" className="bg-navy-900">معتمد</option>
            <option value="rejected" className="bg-navy-900">مرفوض</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-white/50 text-xs">من تاريخ</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-white/50 text-xs">إلى تاريخ</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-white/50 text-xs">المعلم</label>
          <select
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
            className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
          >
            <option value="" className="bg-navy-900">كل المعلمين</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id} className="bg-navy-900">{t.full_name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-white/50 text-xs">بحث الطالب</label>
          <SearchInput value={studentSearch} onChange={setStudentSearch} placeholder="اسم أو فصل..." />
        </div>
      </div>

      <DataTable loading={isLoading} empty={!isLoading && filtered.length === 0} emptyTitle="لا توجد عمليات مطابقة">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-white/5 border-b border-white/5 text-white/40">
              <tr>
                <th className="px-4 py-3">الطالب</th>
                <th className="px-4 py-3">المعلم</th>
                <th className="px-4 py-3">النشاط</th>
                <th className="px-4 py-3">النقاط</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">ملاحظة / سبب الرفض</th>
                <th className="px-4 py-3">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/70">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-white/3">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{row.students?.full_name ?? '—'}</p>
                    <p className="text-white/30 text-xs">{row.students?.grade} / {row.students?.class_name}</p>
                  </td>
                  <td className="px-4 py-3">{row.granted_by_user?.full_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <p>{row.activities?.name ?? '—'}</p>
                    <p className="text-white/30 text-xs">{row.activities?.category}</p>
                  </td>
                  <td
                    className={clsx(
                      'px-4 py-3 font-bold tabular-nums',
                      row.points < 0 ? 'text-red-400' : 'text-gold-400'
                    )}
                  >
                    {row.points > 0 ? `+${row.points}` : row.points}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs px-2 py-0.5 rounded border', STATUS_COLORS[row.status])}>
                      {STATUS_LABELS[row.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs max-w-[200px]">
                    {row.status === 'rejected' && row.rejection_reason ? (
                      <span className="text-red-300">{row.rejection_reason}</span>
                    ) : (
                      <span className="text-white/50">{row.note ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-white/40 whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString('ar-EG')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataTable>

      {!isLoading && filtered.length > 0 && (
        <p className="text-white/30 text-xs text-center">{filtered.length} عملية</p>
      )}
    </div>
  );
}
