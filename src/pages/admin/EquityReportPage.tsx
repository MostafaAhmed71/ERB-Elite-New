import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Scale, AlertTriangle, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { exportRowsToExcel } from '../../lib/exportExcel';
import { buildClassEquityIndex, type ClassEquityRow } from '../../lib/equityIndex';
import clsx from 'clsx';

export function EquityReportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'equity-index'],
    queryFn: async () => {
      const { data: ledger, error } = await supabase.from('points_ledger').select(`
          student_id, points, status,
          students (grade, class_name)
        `);
      if (error) throw error;

      const classRows = buildClassEquityIndex((ledger ?? []) as unknown as Parameters<typeof buildClassEquityIndex>[0]);
      const alerts = classRows.filter((r) => r.alert);

      return { classRows, alerts };
    },
  });

  const classRows = data?.classRows ?? [];
  const alerts = data?.alerts ?? [];
  const avgLine = useMemo(() => {
    if (classRows.length === 0) return 0;
    return Math.round(classRows.reduce((s, r) => s + r.avgPerStudent, 0) / classRows.length);
  }, [classRows]);

  const chartData = classRows.map((r) => ({
    name: r.class_name,
    متوسط: r.avgPerStudent,
    fill: r.alert ? '#ef4444' : '#f0b429',
  }));

  const handleExport = () => {
    exportRowsToExcel(
      classRows.map((r) => ({
        الفصل: r.label,
        الطلاب: r.studentCount,
        'إجمالي النقاط': r.totalPoints,
        'متوسط/طالب': r.avgPerStudent,
        'انحراف %': r.deviationPct,
        تنبيه: r.alert ? 'نعم' : 'لا',
      })),
      'العدالة',
      `مؤشر-العدالة-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="مؤشر عدالة التوزيع"
        subtitle="قياس توزيع النقاط بين الفصول — بدون حضور"
        icon={Scale}
        badge={alerts.length > 0 ? `${alerts.length} تنبيه` : undefined}
        guidePath="/admin/equity"
        actions={
          <Button variant="secondary" size="sm" onClick={handleExport} disabled={classRows.length === 0}>
            <Download className="w-4 h-4" /> Excel
          </Button>
        }
      />

      {alerts.length > 0 && (
        <div className="glass-card p-4 border-red-500/25 bg-red-500/5 space-y-2">
          <p className="text-red-300 text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            فصول تحصل على أقل من 60% من المتوسط
          </p>
          {alerts.map((a) => (
            <p key={a.key} className="text-white/50 text-xs">
              {a.label} — متوسط {a.avgPerStudent} ن ({a.deviationPct}%)
            </p>
          ))}
        </div>
      )}

      {isLoading ? (
        <TapHandLoader label="جاري تحميل التقرير..." fullScreen />
      ) : (
        <>
          <div className="glass-card p-5">
            <h3 className="text-white font-semibold text-sm mb-4">متوسط النقاط لكل فصل</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0d1526', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                <ReferenceLine y={avgLine} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'المتوسط', fill: '#94a3b8', fontSize: 10 }} />
                <Bar dataKey="متوسط" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <DataTable
            columns={[
              { key: 'label', header: 'الفصل', render: (r) => r.label },
              { key: 'studentCount', header: 'الطلاب', render: (r) => r.studentCount },
              { key: 'totalPoints', header: 'إجمالي النقاط', render: (r) => r.totalPoints },
              { key: 'avgPerStudent', header: 'متوسط/طالب', render: (r) => (
                <span className={clsx('font-mono font-bold', r.alert ? 'text-red-400' : 'text-gold-400')}>{r.avgPerStudent}</span>
              )},
              { key: 'deviationPct', header: 'انحراف %', render: (r) => (
                <span className={r.deviationPct < 0 ? 'text-red-400' : 'text-emerald-400'}>{r.deviationPct > 0 ? '+' : ''}{r.deviationPct}%</span>
              )},
            ]}
            data={classRows}
            keyExtractor={(r) => r.key}
          />
        </>
      )}
    </div>
  );
}
