import { printHtmlReport } from './exportPdf';
import { PLATFORM_NAME } from './branding';
import type { Achievement } from './achievements';

export type StudentPortfolioData = {
  studentName: string;
  grade: string;
  className: string;
  totalPoints: number;
  levelName: string;
  classRank: number | null;
  achievements: Achievement[];
  topExams: Array<{ title: string; subject: string; scorePct: number; date: string }>;
  axes: { activity: number; behavior: number; achievement: number; initiative: number; attendance: number };
};

export function printStudentPortfolio(data: StudentPortfolioData) {
  const earned = data.achievements.filter((a) => a.earned);
  const badgeRows =
    earned.length > 0
      ? earned.map((a) => `<tr><td>${a.title}</td><td>${a.description}</td></tr>`).join('')
      : '<tr><td colspan="2">ابدأ رحلتك لتحصل على شارات!</td></tr>';

  const examRows =
    data.topExams.length > 0
      ? data.topExams
          .map(
            (e) =>
              `<tr><td>${e.title}</td><td>${e.subject}</td><td>${e.scorePct}%</td><td>${e.date}</td></tr>`,
          )
          .join('')
      : '<tr><td colspan="4">لا نتائج اختبارات بعد</td></tr>';

  printHtmlReport(
    `محفظة إنجازات — ${data.studentName}`,
    `
      <p style="margin-bottom:16px;color:#444;">
        ${data.grade} — ${data.className}
      </p>

      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">إجمالي النقاط</div><div class="kpi-value">${data.totalPoints}</div></div>
        <div class="kpi"><div class="kpi-label">المستوى</div><div class="kpi-value">${data.levelName}</div></div>
        <div class="kpi"><div class="kpi-label">ترتيب الفصل</div><div class="kpi-value">${data.classRank != null ? `#${data.classRank}` : '—'}</div></div>
      </div>

      <h2>شاراتي (${earned.length}/${data.achievements.length})</h2>
      <table>
        <thead><tr><th>الشارة</th><th>الوصف</th></tr></thead>
        <tbody>${badgeRows}</tbody>
      </table>

      <h2>أفضل نتائج الاختبارات</h2>
      <table>
        <thead><tr><th>الاختبار</th><th>المادة</th><th>النتيجة</th><th>التاريخ</th></tr></thead>
        <tbody>${examRows}</tbody>
      </table>

      <h2>رصيد المحاور</h2>
      <table>
        <thead><tr><th>المحور</th><th>النقاط</th></tr></thead>
        <tbody>
          <tr><td>النشاط</td><td>${data.axes.activity}</td></tr>
          <tr><td>السلوك</td><td>${data.axes.behavior}</td></tr>
          <tr><td>الإنجاز</td><td>${data.axes.achievement}</td></tr>
          <tr><td>المبادرة</td><td>${data.axes.initiative}</td></tr>
          <tr><td>الحضور</td><td>${data.axes.attendance}</td></tr>
        </tbody>
      </table>

      <p style="margin-top:24px;font-size:11px;color:#888;">
        ${PLATFORM_NAME} — محفظة إنجازات رقمية — فخرك المدرسي
      </p>
    `,
  );
}
