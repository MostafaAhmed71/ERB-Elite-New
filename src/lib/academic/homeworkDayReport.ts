import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';
import type {
  AcademicHomework,
  AcademicHomeworkDayMonitoring,
  AcademicEducationLevel,
  HomeworkClassUploadRow,
} from './types';
import { formatGradeLabel, formatGradeSection } from './constants';
import { WEEKLY_PLAN_TEMPLATE_URL, TEMPLATE_PAGE_WIDTH, TEMPLATE_PAGE_HEIGHT } from './exportTemplates';
import { formatRiyadhTime } from '../competition/time';
import { escapeHtml } from '../exportPdf';

export interface HomeworkClassGroup {
  class_label: string;
  items: HomeworkClassUploadRow[];
}

const PAGE_W = TEMPLATE_PAGE_WIDTH;
const PAGE_H = TEMPLATE_PAGE_HEIGHT;
const CONTENT_TOP = 198;
const CONTENT_BOTTOM = 118;
const CONTENT_SIDE = 58;
const NAVY = '#0d5c80';
const GOLD = '#e6b325';

function classSortKey(row: HomeworkClassUploadRow): string {
  const level = row.education_level === 'middle' ? '1' : '2';
  return `${level}-${String(row.grade).padStart(2, '0')}-${row.section}`;
}

export function groupUploadsByClass(rows: HomeworkClassUploadRow[]): HomeworkClassGroup[] {
  const map = new Map<string, HomeworkClassUploadRow[]>();
  for (const row of rows) {
    const list = map.get(row.class_label) ?? [];
    list.push(row);
    map.set(row.class_label, list);
  }

  const groups: HomeworkClassGroup[] = [...map.entries()].map(([class_label, items]) => ({
    class_label,
    items: [...items].sort((a, b) => {
      const ta = a.uploaded_at ?? '';
      const tb = b.uploaded_at ?? '';
      if (ta !== tb) return ta.localeCompare(tb);
      return a.teacher_name.localeCompare(b.teacher_name, 'ar');
    }),
  }));

  groups.sort((a, b) => classSortKey(a.items[0]).localeCompare(classSortKey(b.items[0]), 'ar'));
  return groups;
}

export function homeworkRowsFromList(homeworks: AcademicHomework[]): HomeworkClassUploadRow[] {
  const rows: HomeworkClassUploadRow[] = [];
  for (const hw of homeworks) {
    const sections = (hw.sections ?? []).map((s) => String(s).trim()).filter(Boolean);
    const secs = sections.length ? sections : ['—'];
    for (const section of secs) {
      rows.push({
        education_level: hw.education_level as AcademicEducationLevel,
        grade: hw.grade,
        section,
        class_label: section === '—'
          ? formatGradeLabel(hw.education_level, hw.grade)
          : formatGradeSection(hw.education_level, hw.grade, section),
        teacher_id: hw.teacher_id,
        teacher_name: hw.teacher_name,
        subject: hw.subject,
        uploaded_at: hw.created_at ?? null,
      });
    }
  }
  return rows;
}

function classBlockHtml(group: HomeworkClassGroup): string {
  const rows = group.items.map((item, i) => `
    <tr class="${i % 2 === 0 ? 'odd' : 'even'}">
      <td class="col-name">${escapeHtml(item.teacher_name)}</td>
      <td class="col-subject">${escapeHtml(item.subject)}</td>
      <td class="col-time">${escapeHtml(item.uploaded_at ? formatRiyadhTime(item.uploaded_at) : '—')}</td>
    </tr>
  `).join('');

  return `
    <section class="class-block">
      <div class="class-head">
        <span class="class-mark"></span>
        <h2>${escapeHtml(group.class_label)}</h2>
        <span class="class-count">${group.items.length} واجب</span>
      </div>
      <table>
        <thead>
          <tr>
            <th class="col-name">المعلم</th>
            <th class="col-subject">المادة</th>
            <th class="col-time">وقت الرفع</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
}

function classBlockHeight(group: HomeworkClassGroup): number {
  return 36 + 28 + group.items.length * 27 + 12;
}

function packPages(groups: HomeworkClassGroup[]): HomeworkClassGroup[][] {
  const availableFirst = PAGE_H - CONTENT_TOP - CONTENT_BOTTOM - 160;
  const availableNext = PAGE_H - CONTENT_TOP - CONTENT_BOTTOM - 70;
  const pages: HomeworkClassGroup[][] = [];
  let current: HomeworkClassGroup[] = [];
  let used = 0;
  let first = true;

  const flush = () => {
    if (current.length) pages.push(current);
    current = [];
    used = 0;
    first = false;
  };

  for (const group of groups) {
    const h = classBlockHeight(group);
    const cap = first ? availableFirst : availableNext;
    if (current.length && used + h > cap) flush();
    current.push(group);
    used += h;
  }
  flush();
  if (!pages.length) pages.push([]);
  return pages;
}

function buildPagesHtml(opts: {
  dateLabel: string;
  groups: HomeworkClassGroup[];
  missingNames: string[];
  completedCount: number;
}): string {
  const { dateLabel, groups, missingNames, completedCount } = opts;
  const pages = packPages(groups);

  const missingHtml = missingNames.length
    ? `
      <section class="missing-block">
        <div class="class-head missing">
          <span class="class-mark"></span>
          <h2>لم يرفعوا الواجب</h2>
          <span class="class-count">${missingNames.length} معلم</span>
        </div>
        <div class="missing-list">
          ${missingNames.map((n) => `<span class="missing-chip">${escapeHtml(n)}</span>`).join('')}
        </div>
      </section>`
    : '';

  const pageArticles = pages.map((pageGroups, index) => {
    const isFirst = index === 0;
    const isLast = index === pages.length - 1;
    const body = pageGroups.length
      ? pageGroups.map(classBlockHtml).join('')
      : (isFirst ? '<div class="empty">لا توجد واجبات مرفوعة في هذا اليوم</div>' : '');

    return `
      <article class="page">
        <img class="page-bg" src="${WEEKLY_PLAN_TEMPLATE_URL}" alt="" />
        <main class="content">
          ${isFirst ? `
            <div class="title-wrap">
              <h1 class="title">تقرير رفع الواجبات المنزلية</h1>
              <div class="title-rule"></div>
            </div>
            <p class="date-line">${escapeHtml(dateLabel)}</p>
            <div class="kpis">
              <div class="kpi"><div class="kpi-label">عدد الفصول</div><div class="kpi-value">${groups.length}</div></div>
              <div class="kpi"><div class="kpi-label">المعلمون الرافعون</div><div class="kpi-value">${completedCount}</div></div>
              <div class="kpi"><div class="kpi-label">لم يرفعوا</div><div class="kpi-value">${missingNames.length}</div></div>
            </div>
          ` : `
            <p class="date-line">تتمة تقرير الواجبات — ${escapeHtml(dateLabel)}</p>
          `}
          ${body}
          ${isLast ? missingHtml : ''}
        </main>
      </article>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    .page {
      position: relative;
      width: ${PAGE_W}px;
      height: ${PAGE_H}px;
      overflow: hidden;
      background: #fff;
      font-family: Tahoma, "Segoe UI", Arial, sans-serif;
      color: #173b52;
    }
    .page-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: fill;
      z-index: 0;
    }
    .content {
      position: absolute;
      z-index: 1;
      top: ${CONTENT_TOP}px;
      right: ${CONTENT_SIDE}px;
      left: ${CONTENT_SIDE}px;
      bottom: ${CONTENT_BOTTOM}px;
      overflow: hidden;
    }
    .title-wrap { text-align: center; margin-bottom: 10px; }
    .title {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      color: ${NAVY};
      letter-spacing: 0.2px;
    }
    .title-rule {
      width: 72px;
      height: 4px;
      border-radius: 8px;
      background: ${GOLD};
      margin: 8px auto 0;
    }
    .date-line {
      text-align: center;
      font-size: 13px;
      color: #4d6b7a;
      margin: 8px 0 12px;
      font-weight: 700;
    }
    .kpis {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .kpi {
      border: 1px solid #c9dce5;
      border-radius: 10px;
      background: rgba(247,251,253,0.95);
      padding: 8px 10px;
      text-align: center;
    }
    .kpi-label { font-size: 11px; color: #6b8998; }
    .kpi-value { font-size: 20px; font-weight: 800; color: ${NAVY}; margin-top: 2px; }
    .class-block { margin-bottom: 12px; break-inside: avoid; }
    .class-head {
      display: flex;
      align-items: center;
      gap: 8px;
      background: ${NAVY};
      color: #fff;
      padding: 7px 12px;
      border-radius: 8px 8px 0 0;
    }
    .class-head.missing { background: #9a6b12; }
    .class-mark {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${GOLD};
      flex-shrink: 0;
    }
    .class-head h2 {
      margin: 0;
      flex: 1;
      font-size: 13.5px;
      font-weight: 800;
    }
    .class-count {
      font-size: 11px;
      font-weight: 700;
      background: rgba(255,255,255,0.16);
      border-radius: 999px;
      padding: 2px 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }
    th, td {
      padding: 7px 10px;
      text-align: right;
      border: 1px solid #d5e4ec;
    }
    thead th {
      background: #edf6f9;
      color: ${NAVY};
      font-weight: 800;
      font-size: 12px;
    }
    tr.odd td { background: #fff; }
    tr.even td { background: #f7fbfd; }
    .col-name { width: 42%; }
    .col-subject { width: 36%; }
    .col-time { width: 22%; font-variant-numeric: tabular-nums; font-weight: 700; color: #0b6b4a; }
    .missing-block { margin-top: 8px; }
    .missing-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 10px;
      border: 1px solid #ead9b0;
      border-top: 0;
      border-radius: 0 0 8px 8px;
      background: #fffaf0;
    }
    .missing-chip {
      background: #fff;
      border: 1px solid #e6d3a3;
      color: #7a5710;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 700;
    }
    .empty {
      text-align: center;
      color: #78909b;
      border: 1px dashed #bfd1d9;
      border-radius: 12px;
      padding: 36px 16px;
      background: rgba(255,255,255,0.9);
    }
  </style>
</head>
<body>
  ${pageArticles}
</body>
</html>`;
}

function preloadImages(doc: Document): Promise<void> {
  return Promise.all(
    Array.from(doc.images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        }),
    ),
  ).then(() => undefined);
}

async function renderOfficialPdf(html: string, filename: string): Promise<void> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-12000px';
  iframe.style.top = '0';
  iframe.style.width = `${PAGE_W}px`;
  iframe.style.height = `${PAGE_H * 8}px`;
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error('تعذّر تجهيز صفحة التقرير');
    doc.open();
    doc.write(html);
    doc.close();

    await preloadImages(doc);
    if ('fonts' in doc) await doc.fonts.ready;
    await new Promise((resolve) => setTimeout(resolve, 280));

    const pages = Array.from(doc.querySelectorAll<HTMLElement>('.page'));
    if (!pages.length) throw new Error('لا توجد صفحة قابلة للتصدير');

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [PAGE_W, PAGE_H],
      compress: true,
    });
    for (let i = 0; i < pages.length; i += 1) {
      const canvas = await toCanvas(pages[i], {
        width: PAGE_W,
        height: PAGE_H,
        pixelRatio: 2,
        cacheBust: true,
      });
      if (i > 0) pdf.addPage([PAGE_W, PAGE_H], 'portrait');
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, PAGE_W, PAGE_H, undefined, 'FAST');
    }
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } finally {
    iframe.remove();
  }
}

function safeFileDate(label: string): string {
  return label.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_').slice(0, 60) || 'تقرير';
}

export async function exportHomeworkDayMonitoringPdf(
  dateLabel: string,
  monitoring: AcademicHomeworkDayMonitoring,
): Promise<void> {
  const groups = groupUploadsByClass(monitoring.class_uploads ?? []);
  const html = buildPagesHtml({
    dateLabel,
    groups,
    missingNames: monitoring.missing.map((t) => t.teacher_name),
    completedCount: monitoring.completed.length,
  });
  await renderOfficialPdf(html, `تقرير_واجبات_${safeFileDate(dateLabel)}.pdf`);
}

export async function exportHomeworkListPdf(
  dateLabel: string,
  homeworks: AcademicHomework[],
): Promise<void> {
  const groups = groupUploadsByClass(homeworkRowsFromList(homeworks));
  const teacherIds = new Set(homeworks.map((h) => h.teacher_id));
  const html = buildPagesHtml({
    dateLabel,
    groups,
    missingNames: [],
    completedCount: teacherIds.size,
  });
  await renderOfficialPdf(html, `تقرير_واجبات_${safeFileDate(dateLabel)}.pdf`);
}
