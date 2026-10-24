import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import {
  buildHomeworkHtml,
  buildWeeklyPlanHtml,
  TEMPLATE_PAGE_WIDTH,
  TEMPLATE_PAGE_HEIGHT,
  type HomeworkGroup,
  type WeeklyPlanGroup,
} from './exportTemplates';
import type { AcademicExportTemplateLayout } from './exportTemplateConfig';
import { formatGradeSection, formatSemesterWeek } from './constants';

function preloadImages(doc: Document): Promise<void> {
  const imgs = Array.from(doc.images);
  if (imgs.length === 0) return Promise.resolve();
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        }),
    ),
  ).then(() => undefined);
}

async function renderHtmlToCanvas(html: string): Promise<HTMLCanvasElement> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.width = `${TEMPLATE_PAGE_WIDTH}px`;
  iframe.style.height = `${TEMPLATE_PAGE_HEIGHT}px`;
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) throw new Error('Failed to create iframe');

  doc.open();
  doc.write(html);
  doc.close();

  await new Promise((r) => setTimeout(r, 500));
  await preloadImages(doc);
  await new Promise((r) => setTimeout(r, 600));

  const page = (doc.querySelector('.page') ?? doc.body) as HTMLElement;
  const canvas = await toCanvas(page, {
    width: TEMPLATE_PAGE_WIDTH,
    height: TEMPLATE_PAGE_HEIGHT,
    pixelRatio: 2,
    cacheBust: true,
  });

  document.body.removeChild(iframe);
  return canvas;
}

async function downloadCanvas(canvas: HTMLCanvasElement, filename: string, asPdf: boolean) {
  if (asPdf) {
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [TEMPLATE_PAGE_WIDTH, TEMPLATE_PAGE_HEIGHT],
    });
    pdf.addImage(imgData, 'PNG', 0, 0, TEMPLATE_PAGE_WIDTH, TEMPLATE_PAGE_HEIGHT);
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } else {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    a.click();
  }
}

export async function exportHomeworkGroupPdf(group: HomeworkGroup, layout?: AcademicExportTemplateLayout) {
  const canvas = await renderHtmlToCanvas(buildHomeworkHtml(group, layout));
  await downloadCanvas(
    canvas,
    `homework_${group.education_level}_g${group.grade}_${group.section}_${group.date}.pdf`,
    true,
  );
}

export async function exportHomeworkGroupPng(group: HomeworkGroup, layout?: AcademicExportTemplateLayout) {
  const canvas = await renderHtmlToCanvas(buildHomeworkHtml(group, layout));
  await downloadCanvas(
    canvas,
    `homework_${group.education_level}_g${group.grade}_${group.section}_${group.date}.png`,
    false,
  );
}

export async function exportWeeklyPlanGroupPdf(group: WeeklyPlanGroup, layout?: AcademicExportTemplateLayout) {
  const canvas = await renderHtmlToCanvas(buildWeeklyPlanHtml(group, layout));
  await downloadCanvas(
    canvas,
    `plan_s${group.semester}_w${group.week_number}_g${group.grade}_${group.section}.pdf`,
    true,
  );
}

export async function exportWeeklyPlanGroupPng(group: WeeklyPlanGroup, layout?: AcademicExportTemplateLayout) {
  const canvas = await renderHtmlToCanvas(buildWeeklyPlanHtml(group, layout));
  await downloadCanvas(
    canvas,
    `plan_s${group.semester}_w${group.week_number}_g${group.grade}_${group.section}.png`,
    false,
  );
}

function sanitizeFileName(name: string): string {
  return name.replace(/[/\\:*?"<>|\n\r]/g, '_').replace(/\s+/g, ' ').trim() || 'خطة';
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('تعذر إنشاء الصورة'));
    }, 'image/png');
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** كل خطط الأسبوع الظاهرة كصور PNG داخل ملف مضغوط واحد. */
export async function exportWeeklyPlanGroupsPngZip(
  groups: WeeklyPlanGroup[],
  layout?: AcademicExportTemplateLayout,
  onProgress?: (done: number, total: number) => void,
) {
  if (groups.length === 0) throw new Error('لا توجد خطط للتصدير');

  const zip = new JSZip();
  const used = new Map<string, number>();

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    onProgress?.(index + 1, groups.length);
    const canvas = await renderHtmlToCanvas(buildWeeklyPlanHtml(group, layout));
    const blob = await canvasToPngBlob(canvas);
    const label = sanitizeFileName(
      `${formatGradeSection(group.education_level, group.grade, group.section)} — ${formatSemesterWeek(group.semester, group.week_number)}`,
    );
    const count = used.get(label) ?? 0;
    used.set(label, count + 1);
    zip.file(count === 0 ? `${label}.png` : `${label}_${count + 1}.png`, blob);
  }

  const first = groups[0];
  const archive = await zip.generateAsync({ type: 'blob' });
  downloadBlob(
    archive,
    `${sanitizeFileName(`خطط الأسبوع ${formatSemesterWeek(first.semester, first.week_number)}`)}.zip`,
  );
}

export function printHtml(html: string) {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  }
  setTimeout(() => document.body.removeChild(iframe), 1000);
}

export function openHtmlPreview(html: string) {
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export async function openHomeworkPreview(group: HomeworkGroup, layout?: AcademicExportTemplateLayout) {
  openHtmlPreview(buildHomeworkHtml(group, layout));
}

export async function openWeeklyPlanPreview(group: WeeklyPlanGroup, layout?: AcademicExportTemplateLayout) {
  openHtmlPreview(buildWeeklyPlanHtml(group, layout));
}
