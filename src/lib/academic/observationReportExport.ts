import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { formatGradeLabel, formatGradeSection } from './constants';
import { formatObservationRating, parseObservationEntry } from './observationHelpers';
import type { AcademicObservationReport, AcademicTeacherObservationEntry } from './types';

const PAGE_WIDTH = 1052;
const PAGE_HEIGHT = 1494;
const TEMPLATE_URL = '/templates/repot.jpeg';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function ratingBadge(label: string): string {
  return `<span class="rating">${escapeHtml(label)}</span>`;
}

function buildEntryHtml(entry: AcademicTeacherObservationEntry, index: number): string {
  const behavior = formatObservationRating(entry.behavioral_rating);
  const academic = formatObservationRating(entry.academic_rating);
  return `
    <section class="observation">
      <div class="observation-head">
        <span class="entry-number">${index + 1}</span>
        <div class="teacher-block">
          <div class="teacher-name">${escapeHtml(entry.teacher)}</div>
          <div class="subject">${escapeHtml(entry.subject || 'المادة غير محددة')}</div>
        </div>
        <div class="ratings">
          <span>سلوكي ${ratingBadge(behavior)}</span>
          <span>أكاديمي ${ratingBadge(academic)}</span>
        </div>
      </div>
      <div class="comments">
        ${entry.behavioral_comment?.trim() ? `<div><b>الملاحظة السلوكية:</b> ${escapeHtml(entry.behavioral_comment.trim())}</div>` : ''}
        ${entry.academic_comment?.trim() ? `<div><b>الملاحظة الأكاديمية:</b> ${escapeHtml(entry.academic_comment.trim())}</div>` : ''}
        ${entry.note?.trim() ? `<div><b>ملاحظة إضافية:</b> ${escapeHtml(entry.note.trim())}</div>` : ''}
        ${!entry.behavioral_comment?.trim() && !entry.academic_comment?.trim() && !entry.note?.trim() ? '<div class="muted">لا توجد ملاحظات نصية إضافية.</div>' : ''}
      </div>
    </section>`;
}

export function buildObservationReportHtml(report: AcademicObservationReport): string {
  const entries = (Array.isArray(report.teacher_observations) ? report.teacher_observations : [])
    .map(parseObservationEntry)
    .filter((entry): entry is AcademicTeacherObservationEntry => Boolean(entry));
  const pages = [entries];
  const densityClass = entries.length >= 8 ? 'density-tight' : entries.length >= 5 ? 'density-compact' : '';
  const grade = report.section
    ? formatGradeSection(report.education_level, report.grade, report.section)
    : formatGradeLabel(report.education_level, report.grade);
  const createdAt = report.created_at
    ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { dateStyle: 'long' }).format(new Date(report.created_at))
    : new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { dateStyle: 'long' }).format(new Date());

  const pageHtml = pages.map((pageEntries, pageIndex) => {
    const entryOffset = pages.slice(0, pageIndex).reduce((sum, p) => sum + p.length, 0);
    return `
      <article class="report-page ${densityClass}">
        <img class="template" src="${TEMPLATE_URL}" alt="" />
        <main class="report-content">
          <h1>تقرير ملاحظات الطالب</h1>
          <div class="title-rule"></div>

          ${pageIndex === 0 ? `
          <section class="student-card">
            <div class="student-name"><span>اسم الطالب</span><strong>${escapeHtml(report.student_name)}</strong></div>
            <div class="meta-grid">
              <div><span>الصف والفصل</span><b>${escapeHtml(grade)}</b></div>
              <div><span>تاريخ التقرير</span><b>${escapeHtml(createdAt)}</b></div>
            </div>
          </section>` : `
          <section class="continuation">
            <strong>${escapeHtml(report.student_name)}</strong>
            <span>${escapeHtml(grade)} · استكمال إفادات المعلمين</span>
          </section>`}

          <div class="section-heading"><span>إفادات المعلمين</span><small>التقييم السلوكي والأكاديمي</small></div>
          <div class="entries">
            ${pageEntries.length > 0
              ? pageEntries.map((entry, index) => buildEntryHtml(entry, entryOffset + index)).join('')
              : '<div class="empty">لم تُسجل إفادات للمعلمين في هذا التقرير.</div>'}
          </div>
        </main>
      </article>`;
  }).join('');

  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/>
    <style>
      *{box-sizing:border-box}html,body{margin:0;padding:0;background:#e8edf1;font-family:"Tahoma","Arial",sans-serif;color:#173b52}
      .report-page{position:relative;width:${PAGE_WIDTH}px;height:${PAGE_HEIGHT}px;overflow:hidden;background:#fff;page-break-after:always}
      .report-page:last-child{page-break-after:auto}.template{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;z-index:0}
      .report-content{position:absolute;z-index:1;top:250px;right:64px;left:64px;bottom:185px;display:flex;flex-direction:column}
      h1{margin:5px 0 8px;text-align:center;color:#007aa4;font-size:34px;line-height:1.25}.title-rule{width:95px;height:5px;border-radius:9px;background:#f8b900;margin:0 auto 18px}
      .student-card{border:1px solid #c9dce5;border-radius:15px;background:rgba(247,251,253,.94);overflow:hidden;margin-top:48px;margin-bottom:16px}
      .student-name{display:flex;align-items:center;gap:20px;padding:13px 18px;background:#007da6;color:#fff}.student-name span{font-size:15px;opacity:.82}.student-name strong{font-size:24px}
      .meta-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0}.meta-grid>div{padding:12px 16px;min-height:66px}.meta-grid>div:first-child{border-left:1px solid #dce9ee}.meta-grid span{display:block;color:#6b8998;font-size:12px;margin-bottom:4px}.meta-grid b{font-size:16px;color:#173b52}
      .continuation{display:flex;align-items:center;justify-content:space-between;padding:13px 18px;border:1px solid #c9dce5;border-radius:13px;background:rgba(247,251,253,.94);margin-top:48px;margin-bottom:16px}.continuation strong{font-size:22px;color:#007da6}.continuation span{font-size:14px;color:#597887}
      .section-heading{display:flex;align-items:end;justify-content:space-between;border-bottom:2px solid #0080aa;padding:0 3px 8px;margin-bottom:10px}.section-heading span{font-size:20px;font-weight:800;color:#006f96}.section-heading small{font-size:12px;color:#76909c}
      .entries{display:flex;flex-direction:column;gap:10px}.observation{border:1px solid #cedee5;border-radius:13px;overflow:hidden;background:rgba(255,255,255,.96)}
      .observation-head{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:10px;align-items:center;background:#edf6f9;padding:9px 12px;border-bottom:1px solid #d9e8ed}
      .entry-number{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#f8b900;color:#064966;font-weight:900}.teacher-name{font-size:17px;font-weight:800;color:#075f80}.subject{font-size:12px;color:#668592;margin-top:2px}
      .ratings{display:flex;gap:8px;font-size:12px;color:#5f7d89}.ratings>span{white-space:nowrap}.rating{display:inline-block;background:#007da6;color:#fff;border-radius:20px;padding:4px 9px;margin-right:3px;font-weight:800}
      .comments{padding:9px 15px 10px;font-size:14px;line-height:1.65;color:#304f5e}.comments div+div{margin-top:3px}.comments b{color:#007598}.muted,.empty{color:#78909b}.empty{text-align:center;border:1px dashed #bfd1d9;border-radius:14px;padding:34px;background:rgba(255,255,255,.9)}
      .density-compact .entries{gap:7px}.density-compact .observation-head{padding:6px 10px}.density-compact .comments{padding:6px 12px;font-size:12.5px;line-height:1.45}.density-compact .teacher-name{font-size:15px}.density-compact .rating{padding:3px 7px}
      .density-tight .student-card{margin-top:30px;margin-bottom:10px}.density-tight .meta-grid>div{padding:8px 12px;min-height:54px}.density-tight .section-heading{margin-bottom:7px;padding-bottom:5px}.density-tight .entries{gap:5px}.density-tight .observation-head{padding:4px 8px}.density-tight .entry-number{width:24px;height:24px}.density-tight .teacher-name{font-size:13.5px}.density-tight .subject,.density-tight .ratings{font-size:10px}.density-tight .rating{padding:2px 6px}.density-tight .comments{padding:4px 10px;font-size:11px;line-height:1.3}.density-tight .comments div+div{margin-top:1px}
      @media print{html,body{background:#fff}.report-page{break-after:page;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body>${pageHtml}</body></html>`;
}

function preloadImages(doc: Document): Promise<void> {
  return Promise.all(Array.from(doc.images).map((img) => new Promise<void>((resolve) => {
    if (img.complete && img.naturalWidth > 0) resolve();
    else {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    }
  }))).then(() => undefined);
}

function safeFilename(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_').slice(0, 80) || 'student';
}

export async function exportObservationReportPdf(report: AcademicObservationReport): Promise<void> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-12000px';
  iframe.style.top = '0';
  iframe.style.width = `${PAGE_WIDTH}px`;
  iframe.style.height = `${PAGE_HEIGHT}px`;
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error('تعذّر تجهيز صفحة التقرير');
    doc.open();
    doc.write(buildObservationReportHtml(report));
    doc.close();

    await preloadImages(doc);
    if ('fonts' in doc) await doc.fonts.ready;
    await new Promise((resolve) => setTimeout(resolve, 250));

    const pages = Array.from(doc.querySelectorAll<HTMLElement>('.report-page'));
    if (pages.length === 0) throw new Error('لا توجد صفحات قابلة للتصدير');

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [PAGE_WIDTH, PAGE_HEIGHT], compress: true });
    for (let index = 0; index < pages.length; index += 1) {
      const canvas = await toCanvas(pages[index], {
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        pixelRatio: 1.6,
        cacheBust: true,
      });
      if (index > 0) pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT], 'portrait');
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, PAGE_WIDTH, PAGE_HEIGHT, undefined, 'FAST');
    }
    pdf.save(`تقرير_ملاحظات_${safeFilename(report.student_name)}.pdf`);
  } finally {
    iframe.remove();
  }
}
