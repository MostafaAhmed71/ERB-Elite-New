import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { embedOne } from '../../lib/supabaseEmbeds';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { exportRowsToExcel } from '../../lib/exportExcel';

type TeacherStats = {
  teacherId: string;
  userId: string;
  name: string;
  subject: string | null;
  budgetRemaining: number;
  weeklyLimit: number;
  weeklyUsed: number;
  weeklyRemaining: number;
  totalGranted: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
};

function weekStartIso(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  now.setDate(now.getDate() - diff);
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

export function TeachersReportPage() {
  const weekStart = weekStartIso();

  const { data: report, isLoading } = useQuery({
    queryKey: ['admin', 'teachers-report', weekStart],
    queryFn: async () => {
      const [{ data: teachers, error: tErr }, { data: ledger, error: lErr }] = await Promise.all([
        supabase
          .from('teachers')
          .select('id, user_id, subject, points_budget, weekly_points_limit, users(full_name)'),
        supabase
          .from('points_ledger')
          .select('granted_by, points, status, created_at, source')
          .neq('source', 'exam'),
      ]);
      if (tErr) throw tErr;
      if (lErr) throw lErr;

      const statsMap = new Map<string, TeacherStats>();

      for (const t of teachers ?? []) {
        const user = embedOne<{ full_name: string }>(t.users);
        if (!user) continue;
        const weeklyLimit = t.weekly_points_limit ?? 100;
        statsMap.set(t.user_id, {
          teacherId: t.id,
          userId: t.user_id,
          name: user.full_name,
          subject: t.subject,
          budgetRemaining: t.points_budget,
          weeklyLimit,
          weeklyUsed: 0,
          weeklyRemaining: weeklyLimit,
          totalGranted: 0,
          approvedCount: 0,
          rejectedCount: 0,
          pendingCount: 0,
        });
      }

      for (const entry of ledger ?? []) {
        const stat = statsMap.get(entry.granted_by);
        if (!stat) continue;

        const isPositive = entry.points > 0;
        const countsTowardWeekly =
          isPositive &&
          (entry.status === 'pending' || entry.status === 'approved') &&
          entry.created_at >= weekStart;

        if (countsTowardWeekly) {
          stat.weeklyUsed += entry.points;
        }

        if (entry.status === 'pending' || entry.status === 'approved') {
          stat.totalGranted += entry.points;
        }
        if (entry.status === 'approved') stat.approvedCount += 1;
        else if (entry.status === 'rejected') stat.rejectedCount += 1;
        else if (entry.status === 'pending') stat.pendingCount += 1;
      }

      for (const stat of statsMap.values()) {
        stat.weeklyRemaining = Math.max(0, stat.weeklyLimit - stat.weeklyUsed);
      }

      return [...statsMap.values()].sort((a, b) => b.weeklyUsed - a.weeklyUsed);
    },
  });

  const chartData = useMemo(
    () =>
      (report ?? [])
        .slice(0, 10)
        .map((t) => ({ name: t.name.split(' ')[0], استهلاك: t.weeklyUsed, حد: t.weeklyLimit })),
    [report]
  );

  const handleExport = () => {
    if (!report) return;
    exportRowsToExcel(
      report.map((t) => ({
        المعلم: t.name,
        المادة: t.subject ?? '',
        الحد_الأسبوعي: t.weeklyLimit,
        المستخدم_هذا_الأسبوع: t.weeklyUsed,
        المتبقي_أسبوعياً: t.weeklyRemaining,
        إجمالي_المنح: t.totalGranted,
        معتمد: t.approvedCount,
        مرفوض: t.rejectedCount,
        معلق: t.pendingCount,
        الرصيد_المتبقي: t.budgetRemaining,
      })),
      'تقرير المعلمين',
      'تقرير_المعلمين.xlsx'
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        icon={Users}
        title="تقرير أداء المعلمين"
        subtitle="استهلاك الحد الأسبوعي وإحصائيات المنح — يُضبط الحد لكل معلم من إعدادات البرنامج"
        guidePath="/admin/teachers-report"
        actions={
          <Button icon={<Download className="w-4 h-4" />} onClick={handleExport} disabled={!report?.length}>
            تصدير Excel
          </Button>
        }
      />

      {chartData.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-white font-semibold text-sm mb-4">استهلاك الحد الأسبوعي (أعلى 10)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#122548', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                labelStyle={{ color: '#fbbf24' }}
              />
              <Bar dataKey="استهلاك" fill="#e6aa32" radius={[6, 6, 0, 0]} />
              <Bar dataKey="حد" fill="#4481EB" radius={[6, 6, 0, 0]} opacity={0.35} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <DataTable loading={isLoading} empty={!isLoading && !report?.length} emptyTitle="لا يوجد معلمون">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-white/5 border-b border-white/5 text-white/40">
              <tr>
                <th className="px-4 py-3">المعلم</th>
                <th className="px-4 py-3">المادة</th>
                <th className="px-4 py-3">الأسبوع (مستخدم/حد)</th>
                <th className="px-4 py-3">المتبقي أسبوعياً</th>
                <th className="px-4 py-3">إجمالي المنح</th>
                <th className="px-4 py-3">معتمد</th>
                <th className="px-4 py-3">مرفوض</th>
                <th className="px-4 py-3">معلق</th>
                <th className="px-4 py-3">الرصيد المتبقي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/70">
              {(report ?? []).map((t) => {
                const weeklyPct = t.weeklyLimit > 0 ? (t.weeklyUsed / t.weeklyLimit) * 100 : 0;
                const weeklyTone =
                  weeklyPct >= 100
                    ? 'text-red-400'
                    : weeklyPct >= 80
                      ? 'text-amber-400'
                      : 'text-emerald-400';
                return (
                  <tr key={t.teacherId} className="hover:bg-white/3">
                    <td className="px-4 py-3 text-white font-medium">{t.name}</td>
                    <td className="px-4 py-3 text-white/50">{t.subject ?? '—'}</td>
                    <td className={`px-4 py-3 font-bold tabular-nums ${weeklyTone}`}>
                      {t.weeklyUsed} / {t.weeklyLimit}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gold-400">{t.weeklyRemaining}</td>
                    <td className="px-4 py-3 font-bold text-gold-400 tabular-nums">{t.totalGranted}</td>
                    <td className="px-4 py-3 text-emerald-400 tabular-nums">{t.approvedCount}</td>
                    <td className="px-4 py-3 text-red-400 tabular-nums">{t.rejectedCount}</td>
                    <td className="px-4 py-3 text-amber-400 tabular-nums">{t.pendingCount}</td>
                    <td className="px-4 py-3 tabular-nums">{t.budgetRemaining}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DataTable>
    </div>
  );
}
