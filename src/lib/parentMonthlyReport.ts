import { printHtmlReport } from './exportPdf';
import { PLATFORM_NAME } from './branding';

export type ParentMonthlyReportData = {
  studentName: string;
  grade: string;
  className: string;
  monthLabel: string;
  totalPoints: number;
  levelName: string;
  classRank: number | null;
  monthPoints: number;
  present: number;
  absent: number;
  late: number;
  attendanceRatePct: number;
  exams: Array<{ title: string; subject: string; scorePct: number; date: string }>;
  axes: { activity: number; behavior: number; achievement: number; initiative: number };
};

export function monthLabelAr(date = new Date()): string {
  return date.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
}

export function printParentMonthlyReport(data: ParentMonthlyReportData) {
  const examRows =
    data.exams.length > 0
      ? data.exams
          .map(
            (e) =>
              `<tr><td>${e.title}</td><td>${e.subject}</td><td>${e.scorePct}%</td><td>${e.date}</td></tr>`,
          )
          .join('')
      : '<tr><td colspan="4">لا اختبارات هذا الشهر</td></tr>';

  printHtmlReport(
    `تقرير شهري — ${data.studentName}`,
    `
      <p style="margin-bottom:16px;color:#444;">
        ${data.grade} — ${data.className} · ${data.monthLabel}
      </p>

      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">إجمالي النقاط</div><div class="kpi-value">${data.totalPoints}</div></div>
        <div class="kpi"><div class="kpi-label">نقاط الشهر</div><div class="kpi-value">${data.monthPoints}</div></div>
        <div class="kpi"><div class="kpi-label">الحضور</div><div class="kpi-value">${data.attendanceRatePct}%</div></div>
      </div>

      <h2>ملخص الشهر</h2>
      <table>
        <thead><tr><th>المؤشر</th><th>القيمة</th></tr></thead>
        <tbody>
          <tr><td>المستوى الحالي</td><td>${data.levelName}</td></tr>
          <tr><td>الترتيب في الفصل</td><td>${data.classRank != null ? `#${data.classRank}` : '—'}</td></tr>
          <tr><td>حضور</td><td>${data.present}</td></tr>
          <tr><td>غياب</td><td>${data.absent}</td></tr>
          <tr><td>تأخر</td><td>${data.late}</td></tr>
        </tbody>
      </table>

      <h2>النقاط حسب المحور (معتمدة)</h2>
      <table>
        <thead><tr><th>المحور</th><th>النقاط</th></tr></thead>
        <tbody>
          <tr><td>النشاط</td><td>${data.axes.activity}</td></tr>
          <tr><td>السلوك</td><td>${data.axes.behavior}</td></tr>
          <tr><td>الإنجاز</td><td>${data.axes.achievement}</td></tr>
          <tr><td>المبادرة</td><td>${data.axes.initiative}</td></tr>
        </tbody>
      </table>

      <h2>اختبارات الشهر</h2>
      <table>
        <thead><tr><th>الاختبار</th><th>المادة</th><th>النتيجة</th><th>التاريخ</th></tr></thead>
        <tbody>${examRows}</tbody>
      </table>

      <p style="margin-top:24px;font-size:11px;color:#888;">
        ${PLATFORM_NAME} — تقرير شهري لولي الأمر — للمتابعة والنقاش الهادئ مع الابن
      </p>
    `,
  );
}
