import { printHtmlReport } from './exportPdf';
import { signOfficialDocument, buildVerifyUrl } from './documentSignature';
import { PLATFORM_NAME } from './branding';
import type { PendingInsight } from './pointsAnalytics';
import type { ClassRef } from './operationalAlerts';
import { formatClassLabel } from './operationalAlerts';

export type QuarterlyReportData = {
  totalStudents: number;
  examPassRate: number | null;
  totalExams: number;
  warningCount: number;
  pendingInsights: PendingInsight;
  inactiveClasses: ClassRef[];
  inactiveTeachers: Array<{ full_name: string }>;
  gradesChart: Array<{ name: string; count: number }>;
};

function quarterLabel(date = new Date()): string {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `الربع ${q} — ${date.getFullYear()}`;
}

export async function printQuarterlyPrincipalReport(data: QuarterlyReportData) {
  const gradeRows = data.gradesChart
    .map((r) => `<tr><td>${r.name}</td><td>${r.count}</td></tr>`)
    .join('');

  const classRows =
    data.inactiveClasses.length > 0
      ? data.inactiveClasses
          .map((c) => `<tr><td>${formatClassLabel(c)}</td><td>بلا نقاط هذا الأسبوع</td></tr>`)
          .join('')
      : '<tr><td colspan="2">لا فصول خامدة هذا الأسبوع</td></tr>';

  const teacherRows =
    data.inactiveTeachers.length > 0
      ? data.inactiveTeachers
          .map((t) => `<tr><td>${t.full_name}</td><td>لم يمنح هذا الأسبوع</td></tr>`)
          .join('')
      : '<tr><td colspan="2">كل المعلمين نشطون هذا الأسبوع</td></tr>';

  let sigBlock = '';
  try {
    const sig = await signOfficialDocument('quarterly_report', {
      quarter: quarterLabel(),
      students: data.totalStudents,
      exams: data.totalExams,
    });
    sigBlock = `
      <p style="font-size:10px;color:#888;margin-top:16px;border-top:1px dashed #ccc;padding-top:10px;">
        P8 — ${sig.verify_code} · ${buildVerifyUrl(sig.verify_code)}
      </p>`;
  } catch {
    /* optional */
  }

  printHtmlReport(
    `تقرير مؤسسي — ${quarterLabel()}`,
    `
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">الطلاب</div><div class="kpi-value">${data.totalStudents}</div></div>
        <div class="kpi"><div class="kpi-label">نجاح الاختبارات</div><div class="kpi-value">${data.examPassRate ?? '—'}%</div></div>
        <div class="kpi"><div class="kpi-label">طلبات معلّقة</div><div class="kpi-value">${data.pendingInsights.pendingCount}</div></div>
      </div>

      <h2>ملخص تشغيلي</h2>
      <table>
        <thead><tr><th>المؤشر</th><th>القيمة</th></tr></thead>
        <tbody>
          <tr><td>نتائج اختبارات مسجّلة</td><td>${data.totalExams}</td></tr>
          <tr><td>إنذارات أكاديمية مبكرة</td><td>${data.warningCount}</td></tr>
          <tr><td>معتمد اليوم</td><td>${data.pendingInsights.todayApproved}</td></tr>
          <tr><td>فصول بلا نقاط (أسبوع)</td><td>${data.inactiveClasses.length}</td></tr>
          <tr><td>معلمون بلا منح (أسبوع)</td><td>${data.inactiveTeachers.length}</td></tr>
        </tbody>
      </table>

      <h2>توزيع الطلاب حسب الصف</h2>
      <table><thead><tr><th>الصف</th><th>العدد</th></tr></thead><tbody>${gradeRows}</tbody></table>

      <h2>فصول تحتاج متابعة</h2>
      <table><thead><tr><th>الفصل</th><th>الحالة</th></tr></thead><tbody>${classRows}</tbody></table>

      <h2>معلمون يحتاجون تذكيراً</h2>
      <table><thead><tr><th>المعلم</th><th>الحالة</th></tr></thead><tbody>${teacherRows}</tbody></table>

      <p style="margin-top:24px;font-size:11px;color:#888;">
        ${PLATFORM_NAME} — تقرير ربع سنوي للإدارة — للاطلاع والأرشفة
      </p>
      ${sigBlock}
    `,
  );
}
