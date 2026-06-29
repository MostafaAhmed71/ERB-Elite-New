import { printHtmlReport } from './exportPdf';
import { PLATFORM_NAME } from './branding';
import { buildWeeklyChallenge, type WeeklyChallengeResult } from './weeklyChallenge';
import { buildClassAxisReport, averagePerStudent } from './classReport';
import { fetchApprovedClassGrants } from './classPoints';
import { supabase } from './supabase';

export type WeeklyAssemblyData = {
  challenge: WeeklyChallengeResult;
  topClasses: Array<{ label: string; weighted: number; rank: number }>;
};

export async function fetchWeeklyAssemblyData(): Promise<WeeklyAssemblyData> {
  const [ledgerRes, classGrants] = await Promise.all([
    supabase
      .from('points_ledger')
      .select('student_id, points, status, activity_id, created_at, activities(category), students(grade, class_name)')
      .eq('status', 'approved'),
    fetchApprovedClassGrants(),
  ]);
  if (ledgerRes.error) throw ledgerRes.error;

  const ledger = (ledgerRes.data ?? []) as unknown as Parameters<typeof buildWeeklyChallenge>[0];
  const challenge = buildWeeklyChallenge(ledger, 'initiative', classGrants);

  const allTimeRows = buildClassAxisReport(
    ledger as Parameters<typeof buildClassAxisReport>[0],
    classGrants,
  );
  const topClasses = [...allTimeRows]
    .sort((a, b) => averagePerStudent(b, 'weighted') - averagePerStudent(a, 'weighted'))
    .slice(0, 5)
    .map((r, i) => ({
      label: r.label,
      weighted: averagePerStudent(r, 'weighted'),
      rank: i + 1,
    }));

  return { challenge, topClasses };
}

export function printWeeklyAssemblyReport(data: WeeklyAssemblyData) {
  const weekLabel = data.challenge.weekLabel;
  const winner = data.challenge.winner;
  const challengeRows = data.challenge.rankings
    .slice(0, 8)
    .map(
      (r) =>
        `<tr><td>${r.rank}</td><td>${r.label}</td><td>${r.score}</td></tr>`,
    )
    .join('');

  const topRows = data.topClasses
    .map((r) => `<tr><td>${r.rank}</td><td>${r.label}</td><td>${r.weighted}</td></tr>`)
    .join('');

  printHtmlReport(
    `تقرير الطابور الأسبوعي — ${weekLabel}`,
    `
      <div class="kpi-grid">
        <div class="kpi">
          <div class="kpi-label">تحدي الأسبوع</div>
          <div class="kpi-value" style="font-size:14px">${data.challenge.axisLabel}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">الفصل الفائز</div>
          <div class="kpi-value" style="font-size:14px">${winner?.label ?? '—'}</div>
        </div>
      </div>

      <h2>ترتيب تحدي الأسبوع — ${data.challenge.axisLabel}</h2>
      <table>
        <thead><tr><th>#</th><th>الفصل</th><th>متوسط النقاط</th></tr></thead>
        <tbody>${challengeRows || '<tr><td colspan="3">لا بيانات هذا الأسبوع</td></tr>'}</tbody>
      </table>

      <h2>أوائل الفصول (موزون تراكمي)</h2>
      <table>
        <thead><tr><th>#</th><th>الفصل</th><th>متوسط موزون</th></tr></thead>
        <tbody>${topRows}</tbody>
      </table>

      <p style="margin-top:24px;font-size:11px;color:#888;">
        ${PLATFORM_NAME} — تقرير أسبوعي للطابور — AL7
      </p>
    `,
  );
}
