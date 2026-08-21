import type { AcademicHomework, AcademicWeeklyPlan, AcademicEducationLevel, AcademicSemester } from './types';
import {
  DEFAULT_EXPORT_TEMPLATE_LAYOUT,
  type AcademicExportTemplateLayout,
} from './exportTemplateConfig';
import {
  ACADEMIC_LEVEL_LABELS,
  DAYS_AR,
} from './constants';
import { formatHomeworkPageNumbers, normalizeHomeworkPageNumbers } from './homeworkHelpers';
export const TEMPLATE_PAGE_WIDTH = 794;
export const TEMPLATE_PAGE_HEIGHT = 1123;

export const HOMEWORK_TEMPLATE_URL = '/templates/homework-temp.jpeg';
export const WEEKLY_PLAN_TEMPLATE_URL = '/templates/plane-temp.jpeg';

export interface HomeworkGroup {
  key: string;
  education_level: AcademicEducationLevel;
  grade: number;
  section: string;
  date: string;
  homeworks: AcademicHomework[];
}

export interface WeeklyPlanGroup {
  key: string;
  education_level: AcademicEducationLevel;
  grade: number;
  section: string;
  semester: AcademicSemester;
  week_number: number;
  plans: AcademicWeeklyPlan[];
}

const PERIOD_AR = ['', 'الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة'] as const;
const GRADE_SHORT: Record<number, string> = { 1: 'أول', 2: 'ثاني', 3: 'ثالث' };
const HW_CARD_THEMES = [
  { bar: '#2e7d32', light: '#e8f5e9' },
  { bar: '#e65100', light: '#fff3e0' },
  { bar: '#6a1b9a', light: '#f3e5f5' },
  { bar: '#00695c', light: '#e0f2f1' },
  { bar: '#1565c0', light: '#e3f2fd' },
  { bar: '#c62828', light: '#ffebee' },
];

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPeriodAr(period: number): string {
  return PERIOD_AR[period] ?? String(period);
}

function formatWeekArabic(week: number): string {
  const ones = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'];
  const teens = ['', 'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر'];
  if (week >= 1 && week <= 10) return `الأسبوع ${ones[week]}`;
  if (week >= 11 && week <= 19) return `الأسبوع ${teens[week - 10]}`;
  if (week === 20) return 'الأسبوع العشرون';
  if (week === 21) return 'الأسبوع الحادي والعشرون';
  if (week === 22) return 'الأسبوع الثاني والعشرون';
  return `الأسبوع ${week}`;
}

function gradeShortLabel(level: AcademicEducationLevel, grade: number, section: string): string {
  return `${GRADE_SHORT[grade] ?? grade} ${ACADEMIC_LEVEL_LABELS[level]} (${section})`;
}

function formatHomeworkDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar-SA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatPlanClassLine(level: AcademicEducationLevel, grade: number, section: string): string {
  return `الخطة الدراسية صف ${GRADE_SHORT[grade] ?? grade} ${ACADEMIC_LEVEL_LABELS[level]} / ${section}`;
}

export function aggregateHomeworks(homeworks: AcademicHomework[], date?: string): HomeworkGroup[] {
  const filtered = date ? homeworks.filter((h) => h.date === date) : homeworks;
  const map = new Map<string, HomeworkGroup>();

  for (const hw of filtered) {
    for (const section of hw.sections) {
      const key = `${hw.education_level}_${hw.grade}_${section}_${hw.date}`;
      const existing = map.get(key);
      if (existing) existing.homeworks.push(hw);
      else map.set(key, { key, education_level: hw.education_level, grade: hw.grade, section, date: hw.date, homeworks: [hw] });
    }
  }

  return Array.from(map.values())
    .map(normalizeHomeworkGroup)
    .sort(
      (a, b) =>
        a.education_level.localeCompare(b.education_level) ||
        a.grade - b.grade ||
        a.section.localeCompare(b.section),
    );
}

export function normalizeHomeworkGroup(group: HomeworkGroup): HomeworkGroup {
  const bySubject = new Map<string, AcademicHomework>();
  for (const hw of group.homeworks) {
    bySubject.set(hw.subject, hw);
  }
  return { ...group, homeworks: Array.from(bySubject.values()).slice(0, 6) };
}

export function aggregateWeeklyPlans(
  plans: AcademicWeeklyPlan[],
  filter?: { semester: AcademicSemester; week_number: number },
): WeeklyPlanGroup[] {
  const filtered = filter
    ? plans.filter((p) => (p.semester ?? 1) === filter.semester && p.week_number === filter.week_number)
    : plans;
  const map = new Map<string, WeeklyPlanGroup>();

  for (const plan of filtered) {
    const semester = (plan.semester ?? 1) as AcademicSemester;
    const key = `${plan.education_level}_${plan.grade}_${plan.section}_${semester}_${plan.week_number}`;
    const existing = map.get(key);
    if (existing) existing.plans.push(plan);
    else {
      map.set(key, {
        key,
        education_level: plan.education_level,
        grade: plan.grade,
        section: plan.section,
        semester,
        week_number: plan.week_number,
        plans: [plan],
      });
    }
  }

  return Array.from(map.values());
}

function basePageStyles(): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 0; }
    body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; background: #fff; direction: rtl; }
    .page {
      width: ${TEMPLATE_PAGE_WIDTH}px;
      height: ${TEMPLATE_PAGE_HEIGHT}px;
      position: relative;
      overflow: hidden;
    }
    .page-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: fill;
      z-index: 0;
    }
    .overlay {
      position: absolute;
      z-index: 1;
    }
  `;
}

function pageShell(bgUrl: string, innerHtml: string, extraStyles: string): string {
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet"/>
  <style>${basePageStyles()}${extraStyles}</style></head>
  <body><div class="page">
    <img class="page-bg" src="${bgUrl}" alt="" crossorigin="anonymous" />
    ${innerHtml}
  </div></body></html>`;
}

function homeworkCard(hw: AcademicHomework | null, index: number): string {
  const theme = HW_CARD_THEMES[index % HW_CARD_THEMES.length];
  if (!hw) {
    return `
      <div class="hw-card hw-empty">
        <div class="hw-card-body"><span class="hw-empty-text">—</span></div>
      </div>`;
  }
  const pageLine = formatHomeworkPageNumbers(normalizeHomeworkPageNumbers(hw));
  const hwText = hw.homework_text?.trim() || '—';

  return `
    <div class="hw-card" style="--bar:${theme.bar};--light:${theme.light}">
      <div class="hw-head">
        <span class="hw-head-no">${index + 1}</span>
        <span class="hw-head-subject">${esc(hw.subject)}</span>
        <span class="hw-head-page">${esc(pageLine)}</span>
      </div>
      <div class="hw-card-body">
        <div class="hw-topic">${esc(hw.lesson_topic)}</div>
        <div class="hw-homework">
          <span class="hw-homework-label">الواجب</span>
          <span class="hw-homework-text">${esc(hwText)}</span>
        </div>
      </div>
      <div class="hw-foot">
        <span class="hw-foot-label">المعلم</span>
        <span class="hw-foot-text">${esc(hw.teacher_name)}</span>
      </div>
    </div>`;
}

function rectCss(r: { top: number; left: number; right: number; bottom?: number }): string {
  const parts = [`top: ${r.top}px`, `left: ${r.left}px`, `right: ${r.right}px`];
  if (r.bottom != null) parts.push(`bottom: ${r.bottom}px`);
  return parts.join('; ');
}

function homeworkStyles(layout: AcademicExportTemplateLayout = DEFAULT_EXPORT_TEMPLATE_LAYOUT): string {
  const hw = layout.homework;
  const topicLines = hw.card.height >= 150 ? 2 : 2;
  const homeworkLines = hw.card.height >= 170 ? 5 : hw.card.height >= 150 ? 4 : 3;
  const teacherLines = 2;
  const pad = hw.card.bodyPadding + 4;
  return `
    .hw-subtitle {
      ${rectCss(hw.subtitle)};
      text-align: center;
      font-size: ${hw.subtitle.fontSize}px;
      font-weight: 700;
      color: #222;
    }
    .hw-content {
      ${rectCss(hw.content)};
    }
    .hw-grid {
      display: grid;
      grid-template-columns: repeat(${hw.grid.columns}, 1fr);
      grid-auto-rows: ${hw.card.height}px;
      row-gap: ${hw.grid.rowGap}px;
      column-gap: ${hw.grid.columnGap}px;
      align-content: start;
    }
    .hw-card {
      border: 1px solid #d5e0ea;
      border-radius: 8px;
      background: #fff;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: ${hw.card.height}px;
      min-height: ${hw.card.height}px;
      max-height: ${hw.card.height}px;
      box-shadow: 0 1px 3px rgba(26,82,118,0.08);
    }
    .hw-empty {
      min-height: ${hw.card.emptyHeight}px;
      max-height: ${hw.card.emptyHeight}px;
      height: ${hw.card.emptyHeight}px;
      border-style: dashed;
      box-shadow: none;
      opacity: 0.5;
    }
    .hw-empty .hw-card-body {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .hw-empty-text { color: #b6c2d0; font-size: 16px; }

    /* رأس البطاقة: رقم الحصة + المادة + الصفحات */
    .hw-head {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--bar);
      color: #fff;
      padding: ${hw.card.barPadding + 1}px ${pad}px;
      flex-shrink: 0;
    }
    .hw-head-no {
      width: ${hw.card.periodSize}px;
      height: ${hw.card.periodSize}px;
      border-radius: 50%;
      background: rgba(255,255,255,0.22);
      color: #fff;
      font-size: ${Math.max(8, hw.card.periodSize * 0.52)}px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .hw-head-subject {
      flex: 1;
      min-width: 0;
      font-size: ${hw.fonts.subject}px;
      font-weight: 800;
      text-align: right;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .hw-head-page {
      font-size: ${Math.max(8, hw.fonts.detail - 0.5)}px;
      font-weight: 700;
      color: rgba(255,255,255,0.92);
      background: rgba(255,255,255,0.16);
      border-radius: 20px;
      padding: 1px 7px;
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* جسم البطاقة: الموضوع + نص الواجب */
    .hw-card-body {
      padding: ${Math.max(3, hw.card.bodyPadding)}px ${pad}px;
      flex: 1;
      overflow: hidden;
      min-height: 0;
    }
    .hw-topic {
      font-size: ${hw.fonts.topic}px;
      font-weight: 800;
      color: #1a2b3c;
      text-align: right;
      line-height: 1.3;
      margin-bottom: 3px;
      display: -webkit-box;
      -webkit-line-clamp: ${topicLines};
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .hw-homework {
      background: var(--light);
      border-radius: 6px;
      padding: ${Math.max(3, hw.card.barPadding)}px ${Math.max(5, hw.card.barPadding + 3)}px;
      border-right: 3px solid var(--bar);
    }
    .hw-homework-label {
      display: block;
      font-size: ${Math.max(8, hw.fonts.detail - 0.5)}px;
      font-weight: 800;
      color: var(--bar);
      margin-bottom: 1px;
      text-align: right;
    }
    .hw-homework-text {
      display: -webkit-box;
      font-size: ${hw.fonts.homeworkText}px;
      font-weight: 700;
      color: #333;
      line-height: 1.35;
      text-align: right;
      -webkit-line-clamp: ${homeworkLines};
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    /* تذييل البطاقة: اسم المعلم */
    .hw-foot {
      display: flex;
      align-items: baseline;
      gap: 4px;
      padding: ${Math.max(2, hw.card.barPadding - 1)}px ${pad}px;
      background: #f6f9fc;
      border-top: 1px solid #e2ebf3;
      flex-shrink: 0;
    }
    .hw-foot-label {
      font-size: ${Math.max(8, hw.fonts.bar - 0.5)}px;
      font-weight: 800;
      color: #7a8a99;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .hw-foot-text {
      flex: 1;
      min-width: 0;
      font-size: ${hw.fonts.teacher}px;
      font-weight: 800;
      color: #1a5276;
      text-align: right;
      display: -webkit-box;
      -webkit-line-clamp: ${teacherLines};
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
    }
  `;
}

function normalizePlanDay(day: string): string {
  const trimmed = day.trim();
  const hit = DAYS_AR.find((d) => d === trimmed || d.replace(/إ/g, 'ا') === trimmed.replace(/إ|أ/g, 'ا'));
  return hit ?? trimmed;
}

function groupWeeklyPlanEntries(group: WeeklyPlanGroup) {
  const entries = group.plans.flatMap((p) =>
    p.entries.map((e) => ({ ...e, day: normalizePlanDay(e.day), teacher: p.teacher_name })),
  );

  const byDay = new Map<string, typeof entries>();
  for (const day of DAYS_AR) byDay.set(day, []);
  for (const e of entries) {
    const list = byDay.get(e.day);
    if (list) list.push(e);
    else byDay.set(e.day, [e]);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.period - b.period);
  }
  return byDay;
}

function countWeeklyPlanRows(group: WeeklyPlanGroup): number {
  const byDay = groupWeeklyPlanEntries(group);
  let count = 0;
  for (const day of DAYS_AR) count += (byDay.get(day) ?? []).length;
  return count;
}

interface WeeklyPlanTableMetrics {
  rowCount: number;
  rowHeight: number;
  headerHeight: number;
  fontSize: number;
  headerFontSize: number;
  cellPadding: number;
  scale: number;
}

const WEEKLY_PLAN_PREFERRED_FONT = 10.5;

function computeWeeklyPlanTableMetrics(
  layout: AcademicExportTemplateLayout,
  rowCount: number,
): WeeklyPlanTableMetrics {
  const wp = layout.weeklyPlan;
  const bottom = wp.content.bottom ?? 118;
  const available = TEMPLATE_PAGE_HEIGHT - wp.content.top - bottom;
  const rows = Math.max(rowCount, 1);
  const headerHeight = wp.table.headerHeight > 0 ? wp.table.headerHeight : 24;

  const fontSize = wp.table.fontSize;
  const headerFontSize = wp.table.headerFontSize;
  const cellPadding = Math.max(1, wp.table.cellPadding);

  const idealRowHeight = Math.max(18, Math.ceil(fontSize * 2.05));
  const fitRowHeight = Math.floor((available - headerHeight) / rows);
  const rowHeight = wp.table.rowHeight > 0
    ? wp.table.rowHeight
    : Math.max(16, Math.min(idealRowHeight, fitRowHeight));

  const naturalHeight = headerHeight + rows * rowHeight;
  let scale = 1;
  if (naturalHeight > available) {
    scale = Math.max(0.88, available / naturalHeight);
  }

  return { rowCount: rows, rowHeight, headerHeight, fontSize, headerFontSize, cellPadding, scale };
}

function weeklyPlanStyles(
  layout: AcademicExportTemplateLayout = DEFAULT_EXPORT_TEMPLATE_LAYOUT,
  metrics?: WeeklyPlanTableMetrics,
): string {
  const wp = layout.weeklyPlan;
  const rowCount = metrics?.rowCount ?? 20;
  const m = metrics ?? computeWeeklyPlanTableMetrics(layout, rowCount);
  const cols = wp.table;
  return `
    .plan-meta {
      ${rectCss(wp.meta)};
      text-align: center;
    }
    .plan-class-line {
      font-size: ${wp.meta.classFontSize}px;
      font-weight: 700;
      color: #1a5276;
      line-height: 1.35;
    }
    .plan-week-line {
      font-size: ${wp.meta.weekFontSize}px;
      font-weight: 800;
      color: #e65100;
      margin-top: 1px;
    }
    .plan-content {
      ${rectCss(wp.content)};
      overflow: hidden;
    }
    .plan-table-scaler {
      width: 100%;
      height: 100%;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    .plan-table-wrap {
      border: 1.5px solid #1a5276;
      border-radius: 2px;
      overflow: hidden;
      width: ${m.scale < 1 ? `${(100 / m.scale).toFixed(2)}%` : '100%'};
      transform: ${m.scale < 1 ? `scale(${m.scale.toFixed(4)})` : 'none'};
      transform-origin: top center;
    }
    .plan-table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${m.fontSize}px;
      table-layout: fixed;
    }
    .plan-table thead tr {
      height: ${m.headerHeight}px;
    }
    .plan-table thead th {
      background: #1a5276;
      color: #fff;
      padding: 0 ${m.cellPadding}px;
      text-align: center;
      font-weight: 800;
      font-size: ${m.headerFontSize}px;
      line-height: 1.1;
      border-left: 1px solid rgba(255,255,255,0.2);
      vertical-align: middle;
    }
    .plan-table thead th:last-child { border-left: none; }
    .plan-table tbody tr {
      height: ${m.rowHeight}px;
      max-height: ${m.rowHeight}px;
    }
    .plan-table td {
      padding: 0 ${m.cellPadding}px;
      height: ${m.rowHeight}px;
      max-height: ${m.rowHeight}px;
      border-bottom: 1px solid #b8cfe0;
      border-left: 1px solid #b8cfe0;
      text-align: center;
      vertical-align: middle;
      color: #222;
      line-height: 1.2;
      font-size: ${m.fontSize}px;
      font-weight: 700;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .plan-table td:last-child { border-left: none; }
    .plan-table tbody tr:nth-child(even) td { background: #f4f9fc; }
    .plan-table tbody tr:nth-child(odd) td { background: #fff; }
    .day-cell {
      background: #fff !important;
      font-weight: 800;
      color: #1a5276;
      font-size: ${m.headerFontSize}px;
      width: ${cols.dayColWidth}px;
      min-width: ${cols.dayColWidth}px;
      max-width: ${cols.dayColWidth}px;
      white-space: normal;
      line-height: 1.15;
    }
    .period-cell {
      font-weight: 800;
      width: ${cols.periodColWidth}px;
      min-width: ${cols.periodColWidth}px;
      max-width: ${cols.periodColWidth}px;
      font-size: ${Math.max(m.fontSize - 0.5, 9)}px;
    }
    .lesson-cell {
      text-align: right;
      font-weight: 700;
      font-size: ${m.fontSize}px;
    }
    .subject-cell {
      font-weight: 800;
      color: #1a5276;
      font-size: ${m.fontSize}px;
      width: ${cols.subjectColWidth}px;
      min-width: ${cols.subjectColWidth}px;
      max-width: ${cols.subjectColWidth}px;
    }
    .plan-table th:nth-child(1) { width: ${cols.dayColWidth}px; }
    .plan-table th:nth-child(2) { width: ${cols.periodColWidth}px; }
    .plan-table th:nth-child(3) { width: ${cols.subjectColWidth}px; }
  `;
}

function buildWeeklyPlanTableRows(group: WeeklyPlanGroup): string {
  const byDay = groupWeeklyPlanEntries(group);

  let rows = '';
  for (const day of DAYS_AR) {
    const dayEntries = byDay.get(day) ?? [];
    if (dayEntries.length === 0) continue;
    dayEntries.forEach((e, i) => {
      rows += '<tr>';
      if (i === 0) {
        rows += `<td class="day-cell" rowspan="${dayEntries.length}">${esc(day)}</td>`;
      }
      rows += `<td class="period-cell">${formatPeriodAr(e.period)}</td>`;
      rows += `<td class="subject-cell">${esc(e.subject)}</td>`;
      rows += `<td class="lesson-cell">${esc(e.lesson_topic)}</td>`;
      rows += '</tr>';
    });
  }

  if (!rows) {
    rows = `<tr><td colspan="4" style="padding:24px;color:#94a3b8;text-align:center">لا توجد حصص مسجّلة لهذا الأسبوع</td></tr>`;
  }

  return rows;
}

export function buildHomeworkHtml(
  group: HomeworkGroup,
  layout: AcademicExportTemplateLayout = DEFAULT_EXPORT_TEMPLATE_LAYOUT,
): string {
  const normalized = normalizeHomeworkGroup(group);
  const slots: (AcademicHomework | null)[] = [...normalized.homeworks];
  while (slots.length < 6) slots.push(null);

  const cards = slots.map((hw, i) => homeworkCard(hw, i)).join('');
  const subtitle = `${gradeShortLabel(group.education_level, group.grade, group.section)} - ${formatHomeworkDate(group.date)}`;

  const inner = `
    <div class="overlay hw-subtitle">${esc(subtitle)}</div>
    <div class="overlay hw-content"><div class="hw-grid">${cards}</div></div>`;

  return pageShell(HOMEWORK_TEMPLATE_URL, inner, homeworkStyles(layout));
}

export function buildWeeklyPlanHtml(
  group: WeeklyPlanGroup,
  layout: AcademicExportTemplateLayout = DEFAULT_EXPORT_TEMPLATE_LAYOUT,
): string {
  const rowCount = countWeeklyPlanRows(group);
  const metrics = computeWeeklyPlanTableMetrics(layout, rowCount);
  const tableRows = buildWeeklyPlanTableRows(group);

  const inner = `
    <div class="overlay plan-meta">
      <div class="plan-class-line">${esc(formatPlanClassLine(group.education_level, group.grade, group.section))}</div>
      <div class="plan-week-line">${esc(formatWeekArabic(group.week_number))}</div>
    </div>
    <div class="overlay plan-content">
      <div class="plan-table-scaler">
        <div class="plan-table-wrap">
          <table class="plan-table">
          <thead>
            <tr>
              <th>اليوم</th>
              <th>الحصة</th>
              <th>المادة</th>
              <th>الدرس</th>
            </tr>
          </thead>
          <tbody>${tableRows}          </tbody>
        </table>
        </div>
      </div>
    </div>`;

  return pageShell(WEEKLY_PLAN_TEMPLATE_URL, inner, weeklyPlanStyles(layout, metrics));
}

export function sampleHomeworkGroup(): HomeworkGroup {
  const education_level = 'middle' as AcademicEducationLevel;
  const grade = 1;
  const section = 'أ';
  const date = new Date().toISOString().slice(0, 10);
  const shared = {
    education_level,
    grade,
    section: 'أ',
    date,
    sections: ['أ'],
    type: 'grammar' as const,
    created_at: '',
    updated_at: '',
  };

  const homeworks: AcademicHomework[] = [
    {
      ...shared,
      id: 'sample-hw-1',
      teacher_id: 't1',
      teacher_name: 'أ. فاطمة العتيبي',
      subject: 'لغتي',
      lesson_topic: 'الجملة الاسمية والفعلية',
      homework_text: 'حل تمارين الكتاب ص 45 — القواعد 1 إلى 5',
      page_numbers: [45],
    },
    {
      ...shared,
      id: 'sample-hw-2',
      teacher_id: 't2',
      teacher_name: 'أ. محمد الشهري',
      subject: 'رياضيات',
      lesson_topic: 'الأعداد الصحيحة — جمع وطرح',
      homework_text: 'أوراق العمل ص 12-14 — تمارين 1-8',
      page_numbers: [12, 13, 14],
    },
    {
      ...shared,
      id: 'sample-hw-3',
      teacher_id: 't3',
      teacher_name: 'أ. سارة القحطاني',
      subject: 'علوم',
      lesson_topic: 'تركيب الخلية — الغشاء والنواة',
      homework_text: 'رسم الخلية وتسمية الأجزاء + أسئلة المراجعة',
      page_numbers: [8],
    },
    {
      ...shared,
      id: 'sample-hw-4',
      teacher_id: 't4',
      teacher_name: 'أ. عبدالله الدوسري',
      subject: 'تربية إسلامية',
      lesson_topic: 'آداب التعامل — حسن الخلق',
      homework_text: 'مراجعة الدرس + حل أسئلة الكتاب ص 22',
      page_numbers: [22],
    },
    {
      ...shared,
      id: 'sample-hw-5',
      teacher_id: 't5',
      teacher_name: 'أ. نورة الحربي',
      subject: 'لغة إنجليزية',
      lesson_topic: 'Greetings and Introductions',
      homework_text: 'Workbook page 18 — exercises 2 to 4',
      page_numbers: [18],
    },
    {
      ...shared,
      id: 'sample-hw-6',
      teacher_id: 't6',
      teacher_name: 'أ. خالد الزهراني',
      subject: 'اجتماعيات',
      lesson_topic: 'الحضارة الإسلامية — المسجد النبوي',
      homework_text: 'بحث قصير (نصف صفحة) عن أهمية المسجد النبوي',
      page_numbers: [],
    },
  ];

  return normalizeHomeworkGroup({
    key: 'sample-homework',
    education_level,
    grade,
    section,
    date,
    homeworks,
  });
}

/** معاينة واجبات وهمية (6 مواد في قالب الفصل) */
export function openSampleHomeworkPreview(layout?: AcademicExportTemplateLayout) {
  const html = buildHomeworkHtml(sampleHomeworkGroup(), layout);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export function sampleWeeklyPlanGroup(): WeeklyPlanGroup {
  const [sun, mon, tue, wed, thu] = DAYS_AR;
  const base = {
    education_level: 'middle' as AcademicEducationLevel,
    grade: 1,
    section: 'أ',
    semester: 1 as AcademicSemester,
    week_number: 5,
  };

  const plan = (
    id: string,
    teacher_id: string,
    teacher_name: string,
    entries: AcademicWeeklyPlan['entries'],
  ): AcademicWeeklyPlan => ({
    id,
    teacher_id,
    teacher_name,
    ...base,
    entries,
    created_at: '',
    updated_at: '',
  });

  return {
    key: 'sample-weekly-plan',
    ...base,
    plans: [
      plan('p1', 't1', 'أ. فاطمة العتيبي', [
        { day: sun, period: 1, subject: 'لغتي', lesson_topic: 'الجملة الاسمية والفعلية' },
        { day: mon, period: 2, subject: 'لغتي', lesson_topic: 'القراءة المركزة — نص الصدق' },
        { day: tue, period: 1, subject: 'لغتي', lesson_topic: 'التنوين والهمزة' },
        { day: wed, period: 3, subject: 'لغتي', lesson_topic: 'التعبير الكتابي — وصف مشهد' },
        { day: thu, period: 2, subject: 'لغتي', lesson_topic: 'مراجعة أسبوعية — قواعد وقراءة' },
      ]),
      plan('p2', 't2', 'أ. محمد الشهري', [
        { day: sun, period: 2, subject: 'رياضيات', lesson_topic: 'الأعداد الصحيحة — مفهوم ومقارنة' },
        { day: mon, period: 1, subject: 'رياضيات', lesson_topic: 'جمع وطرح الأعداد الصحيحة' },
        { day: tue, period: 2, subject: 'رياضيات', lesson_topic: 'ضرب الأعداد الصحيحة' },
        { day: wed, period: 1, subject: 'رياضيات', lesson_topic: 'قسمة الأعداد الصحيحة' },
        { day: thu, period: 1, subject: 'رياضيات', lesson_topic: 'مسائل كلامية على العمليات' },
      ]),
      plan('p3', 't3', 'أ. سارة القحطاني', [
        { day: sun, period: 3, subject: 'علوم', lesson_topic: 'تركيب الخلية — الغشاء والنواة' },
        { day: mon, period: 3, subject: 'علوم', lesson_topic: 'أنواع الخلايا — نباتية وحيوانية' },
        { day: tue, period: 3, subject: 'علوم', lesson_topic: 'النسيج والعضلات' },
        { day: wed, period: 2, subject: 'علوم', lesson_topic: 'الجهاز الهضمي — مسار الهضم' },
        { day: thu, period: 3, subject: 'علوم', lesson_topic: 'تجربة المجهر — رسم الخلية' },
      ]),
      plan('p4', 't4', 'أ. عبدالله الدوسري', [
        { day: sun, period: 4, subject: 'تربية إسلامية', lesson_topic: 'آداب التعامل — حسن الخلق' },
        { day: mon, period: 4, subject: 'تربية إسلامية', lesson_topic: 'الطهارة — الوضوء وأركانه' },
        { day: tue, period: 4, subject: 'تربية إسلامية', lesson_topic: 'سيرة الرسول — الهجرة' },
        { day: wed, period: 4, subject: 'تربية إسلامية', lesson_topic: 'الصدق وبر الوالدين' },
        { day: thu, period: 4, subject: 'تربية إسلامية', lesson_topic: 'مراجعة — أحكام وآداب' },
      ]),
      plan('p5', 't5', 'أ. نورة الحربي', [
        { day: sun, period: 5, subject: 'لغة إنجليزية', lesson_topic: 'Greetings and Introductions' },
        { day: mon, period: 5, subject: 'لغة إنجليزية', lesson_topic: 'Present Simple — daily routines' },
        { day: tue, period: 5, subject: 'لغة إنجليزية', lesson_topic: 'Vocabulary — school and classroom' },
        { day: wed, period: 5, subject: 'لغة إنجليزية', lesson_topic: 'Reading — short dialogue' },
        { day: thu, period: 5, subject: 'لغة إنجليزية', lesson_topic: 'Speaking practice — pair work' },
      ]),
      plan('p6', 't6', 'أ. خالد الزهراني', [
        { day: sun, period: 6, subject: 'اجتماعيات', lesson_topic: 'الحضارة الإسلامية — المسجد النبوي' },
        { day: mon, period: 6, subject: 'اجتماعيات', lesson_topic: 'الخريطة — المملكة العربية السعودية' },
        { day: tue, period: 6, subject: 'حاسب آلي', lesson_topic: 'مقدمة في الحاسب — المكونات الأساسية' },
        { day: wed, period: 6, subject: 'تربية فنية', lesson_topic: 'الرسم الهندسي — الخطوط والأشكال' },
        { day: thu, period: 6, subject: 'بدنية', lesson_topic: 'اللياقة البدنية — تمارين الإحماء' },
      ]),
    ],
  };
}

/** معاينة خطة أسبوعية وهمية (5 أيام × 6 حصص) */
export function openSampleWeeklyPlanPreview(layout?: AcademicExportTemplateLayout) {
  const html = buildWeeklyPlanHtml(sampleWeeklyPlanGroup(), layout);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
