import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, Download, Filter, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { DataTable } from '../../components/ui/DataTable';
import { exportRowsToCsv } from '../../lib/exportExcel';
import { createComplianceAuditExport, downloadComplianceBundle } from '../../lib/complianceAudit';
import { showSuccess, showError } from '../../lib/toast';
import type { DbAuditLog } from '../../types';
import clsx from 'clsx';

type AuditLogRow = DbAuditLog & {
  users: { full_name: string; email: string; role: string } | null;
};

export function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit_logs', startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          users (
            full_name,
            email,
            role
          )
        `)
        .order('timestamp', { ascending: false });

      if (startDate) query = query.gte('timestamp', `${startDate}T00:00:00Z`);
      if (endDate) query = query.lte('timestamp', `${endDate}T23:59:59Z`);

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLogRow[];
    },
  });

  const entities = useMemo(() => [...new Set(logs.map((l) => l.entity))].sort(), [logs]);
  const actions = useMemo(() => [...new Set(logs.map((l) => l.action))].sort(), [logs]);
  const users = useMemo(() => {
    const map = new Map<string, string>();
    for (const log of logs) {
      if (log.user_id && log.users?.full_name) {
        map.set(log.user_id, log.users.full_name);
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'ar'));
  }, [logs]);

  const filteredLogs = useMemo(() => logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entity.toLowerCase().includes(search.toLowerCase()) ||
      (log.users?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.users?.email || '').toLowerCase().includes(search.toLowerCase());

    const matchesEntity = entityFilter === '' || log.entity === entityFilter;
    const matchesAction = actionFilter === '' || log.action === actionFilter;
    const matchesUser = userFilter === '' || log.user_id === userFilter;

    return matchesSearch && matchesEntity && matchesAction && matchesUser;
  }), [logs, search, entityFilter, actionFilter, userFilter]);

  const handleExportCsv = () => {
    exportRowsToCsv(
      filteredLogs.map((log) => ({
        المستخدم: log.users?.full_name ?? 'النظام',
        البريد: log.users?.email ?? '',
        الإجراء: log.action,
        الجدول: log.entity,
        معرف_السجل: log.entity_id ?? '',
        الوقت: new Date(log.timestamp).toLocaleString('ar-EG'),
        IP: log.ip_address ?? '',
      })),
      `سجل_الأحداث_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const handleComplianceExport = async () => {
    try {
      const result = await createComplianceAuditExport(startDate || undefined, endDate || undefined);
      downloadComplianceBundle(result);
      showSuccess(`تم إنشاء تصدير امتثال ${result.export_code} — SHA-256`);
    } catch (e) {
      showError(e instanceof Error ? e : new Error('تعذّر إنشاء تصدير الامتثال'));
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        icon={ScrollText}
        title="سجل الأحداث"
        subtitle="عرض ومراقبة سجل نشاط النظام بالكامل"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button icon={<Download className="w-4 h-4" />} onClick={handleExportCsv} disabled={filteredLogs.length === 0}>
              تصدير CSV
            </Button>
            <Button
              variant="secondary"
              icon={<ShieldCheck className="w-4 h-4" />}
              onClick={() => void handleComplianceExport()}
            >
              تصدير امتثال P7
            </Button>
          </div>
        }
      />

      <div className="glass-card p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث في الإجراءات والمستخدمين..." />
        <div className="space-y-1">
          <label className="text-white/50 text-xs flex items-center gap-1">
            <Filter className="w-3 h-3" /> نوع العملية
          </label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
          >
            <option value="" className="bg-navy-900">كل الإجراءات</option>
            {actions.map((a) => (
              <option key={a} value={a} className="bg-navy-900">{a}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-white/50 text-xs">الجدول</label>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
          >
            <option value="" className="bg-navy-900">كل الجداول</option>
            {entities.map((e) => (
              <option key={e} value={e} className="bg-navy-900">{e}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-white/50 text-xs">المستخدم</label>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
          >
            <option value="" className="bg-navy-900">كل المستخدمين</option>
            {users.map(([id, name]) => (
              <option key={id} value={id} className="bg-navy-900">{name}</option>
            ))}
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DataTable
          loading={isLoading}
          empty={!isLoading && filteredLogs.length === 0}
          emptyTitle="لا توجد سجلات مطابقة"
          className="lg:col-span-2"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-white/5 border-b border-white/5 text-white/40">
                <tr>
                  <th className="px-5 py-3">المستخدم</th>
                  <th className="px-5 py-3">الإجراء</th>
                  <th className="px-5 py-3">الجدول</th>
                  <th className="px-5 py-3">الوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/70">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={clsx(
                      'hover:bg-white/3 cursor-pointer transition-colors',
                      selectedLog?.id === log.id && 'bg-gold-500/10'
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <p className="text-white font-medium">{log.users?.full_name ?? 'النظام'}</p>
                      <p className="text-white/30 text-xs">{log.users?.email ?? ''}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gold-400">{log.action}</td>
                    <td className="px-5 py-3.5 text-xs text-white/40">{log.entity}</td>
                    <td className="px-5 py-3.5 text-xs text-white/40">
                      {new Date(log.timestamp).toLocaleString('ar-EG')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataTable>

        <div className="glass-card p-6 space-y-4">
          <h2 className="text-white font-semibold text-base border-b border-white/5 pb-3">
            تفاصيل السجل
          </h2>
          {selectedLog ? (
            <div className="space-y-4 text-sm text-white/70">
              <div>
                <p className="text-white/40 text-xs">معرف السجل</p>
                <p className="font-mono text-xs mt-1 text-white/60 select-all">{selectedLog.id}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/40 text-xs">الجدول المعني</p>
                  <p className="mt-1 text-white font-medium">{selectedLog.entity}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">معرف السجل بالجدول</p>
                  <p className="font-mono text-xs mt-1 text-white/60 truncate">{selectedLog.entity_id ?? '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-white/40 text-xs">عنوان IP</p>
                <p className="font-mono text-xs mt-1 text-white/60">{selectedLog.ip_address ?? '—'}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs mb-2">بيانات الحدث (JSON)</p>
                <pre className="bg-navy-950 p-4 border border-white/5 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto max-h-60 dir-ltr text-left">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-white/20 text-center text-sm">
              اختر سجلاً من الجدول لعرض تفاصيله
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
