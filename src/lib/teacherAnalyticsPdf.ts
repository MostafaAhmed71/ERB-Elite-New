import { printHtmlReport } from './exportPdf';
import type { TeacherAnalyticsSnapshot } from './teacherAnalytics';

/** S6 — PDF تحليلات المعلم */
export function printTeacherAnalyticsPdf(
  teacherName: string,
  snapshot: TeacherAnalyticsSnapshot,
) {
  const weaknessRows =
    snapshot.weaknesses.length === 0
      ? '<p style="color:#888;">لا توجد مهارات ضعيفة مسجّلة بعد — شجّع الطلاب على حل الاختبارات.</p>'
      : `<table>
          <thead><tr><th>المهارة</th><th>الإتقان</th><th>أخطاء</th></tr></thead>
          <tbody>
            ${snapshot.weaknesses
              .map(
                (w) =>
                  `<tr><td>${w.skill_name}</td><td>${w.mastery_pct}%</td><td>${w.wrong}/${w.total}</td></tr>`,
              )
              .join('')}
          </tbody>
        </table>`;

  const stats = snapshot.classStats;

  printHtmlReport(
    `تحليل ${snapshot.subjectName} — ${snapshot.grade}`,
    `
      <p><strong>المعلم:</strong> ${teacherName}</p>
      <p><strong>الفصول:</strong> ${snapshot.classLabel} · <strong>الطلاب:</strong> ${snapshot.studentCount}</p>
      <p style="font-size:11px;color:#666;">S6/S7 — تحليل مادتك فقط</p>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">متوسط الفصل</div><div class="kpi-value">${snapshot.avgPct ?? '—'}%</div></div>
        <div class="kpi"><div class="kpi-label">اختبارات مُنجَزة</div><div class="kpi-value">${snapshot.examsTaken}</div></div>
        <div class="kpi"><div class="kpi-label">نسبة النجاح (60%+)</div><div class="kpi-value">${stats?.passRate ?? '—'}%</div></div>
      </div>
      <h2 style="font-size:16px;margin:24px 0 8px;">أضعف المهارات — ركّز عليها في الحصة</h2>
      ${weaknessRows}
      ${
        snapshot.weaknesses[0]
          ? `<p style="margin-top:16px;padding:12px;background:#fff8e1;border-radius:8px;font-size:13px;">
              <strong>توصية:</strong> فصلك يحتاج دعماً في «${snapshot.weaknesses[0].skill_name}» (إتقان ${snapshot.weaknesses[0].mastery_pct}%)
            </p>`
          : ''
      }
    `,
  );
}
