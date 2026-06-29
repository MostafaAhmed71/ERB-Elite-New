import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type AttendanceRow = {
  date: string;
  status: string;
};

type Props = {
  records: AttendanceRow[];
};

export function AttendanceMonthlyChart({ records }: Props) {
  const data = useMemo(() => {
    const byMonth = new Map<string, { month: string; present: number; absent: number; late: number }>();

    for (const r of records) {
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' });
      if (!byMonth.has(key)) byMonth.set(key, { month: label, present: 0, absent: 0, late: 0 });
      const bucket = byMonth.get(key)!;
      if (r.status === 'present') bucket.present += 1;
      else if (r.status === 'absent') bucket.absent += 1;
      else if (r.status === 'late') bucket.late += 1;
    }

    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, v]) => v);
  }, [records]);

  if (data.length === 0) return null;

  return (
    <div className="glass-card p-5" dir="rtl">
      <h3 className="text-white font-semibold text-sm mb-4">رسم الحضور الشهري</h3>
      <div className="h-48 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#0f1729', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="present" name="حاضر" fill="#34d399" radius={[4, 4, 0, 0]} />
            <Bar dataKey="late" name="متأخر" fill="#fbbf24" radius={[4, 4, 0, 0]} />
            <Bar dataKey="absent" name="غائب" fill="#f87171" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
