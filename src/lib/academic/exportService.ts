import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  buildHomeworkHtml,
  buildWeeklyPlanHtml,
  TEMPLATE_PAGE_WIDTH,
  TEMPLATE_PAGE_HEIGHT,
  type HomeworkGroup,
  type WeeklyPlanGroup,
} from './exportTemplates';
import type { AcademicExportTemplateLayout } from './exportTemplateConfig';

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
