import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { mergeGradeLists } from '../../lib/schoolClasses';
import { useGradeClassCatalog } from '../../hooks/useGradeClassCatalog';
import { Panel } from '../ui/Card';
import { TapHandLoader } from '../ui/TapHandLoader';
import { summarizeAttendance } from '../../lib/attendanceScore';
import { ClassAttendanceChart } from './charts/ClassAttendanceChart';
import {
  ATTENDANCE_QUERY_KEYS,
  localDateString,
} from '../../lib/attendanceQueries';
import type { AttendanceStatus } from '../../types';
import clsx from 'clsx';

type AttendanceRow = {
  student_id: string;
  status: AttendanceStatus;
  date: string;
};

type StudentInfo = {
  full_name: string;
  grade: string;
  class_name: string;
  admission_number: string;
};

export function AttendanceReportTab() {
  const [gradeFilter, setGradeFilter] = useState('');
  const [days, setDays] = useState(30);
  const { data: catalog } = useGradeClassCatalog();

  const since = useMemo(() => localDateString(days), [days]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ATTENDANCE_QUERY_KEYS.report(since, gradeFilter),
    queryFn: async () => {
      const { data: attendance, error: attErr } = await supabase
        .from('attendance')
        .select('student_id, status, date')
        .gte('date', since)
        .order('date', { ascending: false });

      if (attErr) throw attErr;

      const rows = (attendance ?? []) as AttendanceRow[];

      const studentIds = [...new Set(rows.map((r) => r.student_id))];
      const studentMap = new Map<string, StudentInfo>();

      if (studentIds.length > 0) {
        const { data: students, error: stuErr } = await supabase
          .from('students')
          .select('id, full_name, grade, class_name, admission_number')
          .in('id', studentIds);

        if (stuErr) throw stuErr;

        for (const s of students ?? []) {
          studentMap.set(s.id, {
            full_name: s.full_name,
            grade: s.grade,
            class_name: s.class_name,
            admission_number: s.admission_number,
          });
        }
      }

      type EnrichedRow = AttendanceRow & { students: StudentInfo | null };

      const enriched: EnrichedRow[] = rows.map((row) => ({
        ...row,
        students: studentMap.get(row.student_id) ?? null,
      }));

      const filtered = gradeFilter
        ? enriched.filter((r) => r.students?.grade === gradeFilter)
        : enriched;

      const byStudent = new Map<
        string,
        { name: string; grade: string; class_name: string; records: EnrichedRow[] }
      >();

      for (const row of filtered) {
        if (!row.students) continue;
        if (!byStudent.has(row.student_id)) {
          byStudent.set(row.student_id, {
            name: row.students.full_name,
            grade: row.students.grade,
            class_name: row.students.class_name,
            records: [],
          });
        }
        byStudent.get(row.student_id)!.records.push(row);
      }

      const studentStats = [...byStudent.entries()].map(([id, s]) => ({
        id,
        ...s,
        summary: summarizeAttendance(s.records),
      }));

      const byClass = new Map<string, { label: string; records: EnrichedRow[] }>();
      for (const row of filtered) {
        if (!row.students) continue;
        const key = `${row.students.grade}__${row.students.class_name}`;
        const label = `${row.students.grade} — ${row.students.class_name}`;
        if (!byClass.has(key)) byClass.set(key, { label, records: [] });
        byClass.get(key)!.records.push(row);
      }

      const classStats = [...byClass.entries()].map(([key, c]) => {
        const [grade, class_name] = key.split('__');
        return {
          key,
          label: c.label,
          grade,
          class_name,
          ...summarizeAttendance(c.records),
        };
      });

      const grades = [
        ...new Set(
          enriched.map((r) => r.students?.grade).filter((g): g is string => Boolean(g))
        ),
      ].sort();

      const overall = summarizeAttendance(filtered);

      let imports: Array<{
        id: string;
        filename: string | null;
        period_type: string;
        rows_success: number;
        rows_failed: number;
        created_at: string;
      }> = [];

      const { data: importRows, error: importErr } = await supabase
        .from('attendance_import_batches')
        .select('id, filename, period_type, rows_success, rows_failed, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!importErr) {
        imports = importRows ?? [];
      }

      return {
        studentStats,
        classStats,
        grades,
        overall,
        imports,
        totalRows: rows.length,
        unmatchedRows: enriched.filter((r) => !r.students).length,
      };
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const gradeOptions = useMemo(
    () => mergeGradeLists(catalog?.grades, data?.grades),
    [catalog?.grades, data?.grades]
  );

  if (isLoading) return <TapHandLoader label="جاري تحميل التقارير..." />;

  if (isError) {
    return (
      <Panel className="p-6 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <p className="text-white font-medium">تعذّر تحميل تقارير الحضور</p>
        <p className="text-white/40 text-sm">{(error as Error).message}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-gold-400 text-sm hover:underline"
        >
          إعادة المحاولة
        </button>
      </Panel>
    );
  }

  const hasData = (data?.overall.total ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="bg-navy-900/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
        >
          <option value={7}>آخر 7 أيام</option>
          <option value={30}>آخر 30 يوماً</option>
          <option value={90}>آخر 3 أشهر</option>
        </select>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="bg-navy-900/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
        >
          <option value="">كل الصفوف</option>
          {(gradeOptions).map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        {isFetching && <span className="text-white/30 text-xs">جاري التحديث...</span>}
      </div>

      {!hasData ? (
        <Panel className="p-8 text-center">
          <p className="text-white/50 text-sm">
            لا توجد سجلات حضور في الفترة المحددة.
            <br />
            سجّل الحضور من تبويب «تسجيل يومي» أو ارفع ملفاً من «رفع ملف».
          </p>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'إجمالي السجلات', value: data?.overall.total ?? 0, color: 'text-white' },
              { label: 'حاضر', value: data?.overall.present ?? 0, color: 'text-emerald-400' },
              { label: 'متأخر', value: data?.overall.late ?? 0, color: 'text-amber-400' },
              { label: 'غائب', value: data?.overall.absent ?? 0, color: 'text-red-400' },
              {
                label: 'نسبة الحضور',
                value: `${data?.overall.ratePct ?? 0}%`,
                color: 'text-gold-400',
              },
            ].map((card) => (
              <Panel key={card.label} className="p-4 text-center">
                <p className="text-white/40 text-xs mb-1">{card.label}</p>
                <p className={clsx('text-2xl font-bold tabular-nums', card.color)}>{card.value}</p>
              </Panel>
            ))}
          </div>

          {(data?.classStats ?? []).length > 0 && (
            <ClassAttendanceChart
              classes={data?.classStats ?? []}
              schoolRatePct={data?.overall.ratePct ?? 0}
            />
          )}

          <Panel className="p-5 overflow-x-auto">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              أداء الطلاب (أقل حضوراً)
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 border-b border-white/5">
                  <th className="py-2 text-right">الطالب</th>
                  <th className="py-2 text-right">الفصل</th>
                  <th className="py-2 text-right">حاضر</th>
                  <th className="py-2 text-right">غائب</th>
                  <th className="py-2 text-right">درجة الحضور</th>
                </tr>
              </thead>
              <tbody>
                {(data?.studentStats ?? [])
                  .sort((a, b) => a.summary.score - b.summary.score)
                  .slice(0, 20)
                  .map((s) => (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="py-2.5 text-white">{s.name}</td>
                      <td className="py-2.5 text-white/50 text-xs">
                        {s.grade} — {s.class_name}
                      </td>
                      <td className="py-2.5 text-emerald-400">{s.summary.present}</td>
                      <td className="py-2.5 text-red-400">{s.summary.absent}</td>
                      <td className="py-2.5">
                        <span
                          className={clsx(
                            'text-xs font-bold px-2 py-0.5 rounded-full',
                            s.summary.score >= 80
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : s.summary.score >= 60
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-red-500/10 text-red-400'
                          )}
                        >
                          {s.summary.score}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Panel>
        </>
      )}

      {(data?.imports ?? []).length > 0 && (
        <Panel className="p-5">
          <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            آخر عمليات الرفع
          </h3>
          <div className="space-y-2">
            {(data?.imports ?? []).map((batch) => (
              <div
                key={batch.id}
                className="flex items-center justify-between text-xs p-3 rounded-xl bg-white/3 border border-white/5"
              >
                <span className="text-white">{batch.filename ?? 'ملف'}</span>
                <span className="text-white/40">
                  {batch.period_type === 'weekly'
                    ? 'أسبوعي'
                    : batch.period_type === 'monthly'
                      ? 'شهري'
                      : 'مخصص'}
                </span>
                <span className="text-emerald-400">{batch.rows_success} نجح</span>
                <span className="text-white/30">
                  {new Date(batch.created_at).toLocaleDateString('ar-SA')}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
