import type { UserRoleGuide, GuideSection, GuideScreen } from './userGuides';
import { getAllExportableGuides } from './userGuides';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import {
  PLATFORM_NAME,
  PLATFORM_NAME_SHORT,
  PLATFORM_TAGLINE,
  PLATFORM_YEAR,
  USER_GUIDE_LETTERHEAD,
} from './branding';

/** سعة الصفحة — محافظة لتجنّب قصّ النص عند الحد السفلي */
const PAGE_CAPACITY = 92;
const PAGE_SOFT_LIMIT = 82;
const SCREENS_TABLE_ROWS = 8;
const FEATURES_PER_CHUNK = 2;
const SCREEN_SECTIONS_PER_CHUNK = 2;

/** أبعاد A4 بالبكسل (96dpi) — ثابتة لالتقاط PDF دقيق */
const A4_W_PX = 794;
const A4_H_PX = 1123;

const A4_W_MM = 210;
const A4_H_MM = 297;

const PDF_CAPTURE_OPTIONS = {
  pixelRatio: 2,
  cacheBust: false,
  skipFonts: false,
  filter: (node: HTMLElement) => node.tagName?.toUpperCase() !== 'LINK',
};

export type PdfExportProgress = (current: number, total: number) => void;

let cachedTemplateDataUrl: string | null = null;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function resolveLetterheadBackground(): Promise<string> {
  if (cachedTemplateDataUrl) return cachedTemplateDataUrl;

  const origin =
    import.meta.env.VITE_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  const res = await fetch(`${origin}${USER_GUIDE_LETTERHEAD}`);
  if (!res.ok) throw new Error('تعذّر تحميل قالب الدليل — تأكد من وجود public/temp.jpeg');

  const blob = await res.blob();
  cachedTemplateDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('فشل قراءة قالب الدليل'));
    reader.readAsDataURL(blob);
  });

  return cachedTemplateDataUrl;
}

type ContentPiece = { html: string; weight: number };

function packPieces(pieces: ContentPiece[]): string[] {
  const pages: string[] = [];
  let bucket: string[] = [];
  let load = 0;

  const flush = () => {
    if (bucket.length === 0) return;
    pages.push(bucket.join('\n'));
    bucket = [];
    load = 0;
  };

  for (const piece of pieces) {
    if (bucket.length > 0 && (load + piece.weight > PAGE_SOFT_LIMIT || piece.weight >= PAGE_SOFT_LIMIT)) {
      flush();
    }
    if (piece.weight > PAGE_CAPACITY) {
      pages.push(piece.html);
      continue;
    }
    if (load + piece.weight > PAGE_CAPACITY && bucket.length > 0) flush();
    bucket.push(piece.html);
    load += piece.weight;
  }
  flush();
  return pages;
}

function chapterBlock(num: string, title: string, body: string, continued = false): string {
  const label = continued ? `${title} — تابع` : title;
  return `
    <article class="chapter">
      <header class="chapter-head">
        <span class="chapter-num">${num}</span>
        <h2 class="chapter-title">${escapeHtml(label)}</h2>
      </header>
      <div class="chapter-body">${body}</div>
    </article>`;
}

function renderFeatureItem(item: GuideSection['items'][0]): string {
  const steps = item.steps?.length
    ? `<ol class="steps-pro">${item.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>`
    : '';
  return `
    <div class="feature">
      <h3 class="feature-title">${escapeHtml(item.label)}</h3>
      <p class="feature-desc">${escapeHtml(item.description)}</p>
      ${steps}
    </div>`;
}

function renderScreenHeader(screen: GuideScreen): string {
  return `
      <div class="screen-detail-head">
        <h3 class="screen-detail-title">${escapeHtml(screen.label)}</h3>
        <code class="screen-detail-path" dir="ltr">${escapeHtml(screen.path)}</code>
      </div>
      <p class="screen-detail-summary">${escapeHtml(screen.summary)}</p>`;
}

function renderScreenSubsections(sections: GuideSection[]): string {
  return sections
    .map(
      (sec) => `
      <div class="screen-subsection">
        <h4 class="screen-subsection-title">${escapeHtml(sec.title)}</h4>
        ${sec.items.map(renderFeatureItem).join('')}
      </div>`
    )
    .join('');
}

function screenToContentPieces(screen: GuideScreen, chapterNum: string): ContentPiece[] {
  const sections = screen.sections ?? [];
  const showHowTo = screen.howTo.length > 0 && sections.length === 0;
  const howTo = showHowTo
    ? `<div class="screen-howto">
        <p class="screen-howto-label">خطوات الاستخدام</p>
        <ol class="steps-pro compact">${screen.howTo.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
      </div>`
    : '';

  if (sections.length === 0) {
    return [
      {
        weight: 28,
        html: chapterBlock(
          chapterNum,
          screen.label,
          `<div class="screen-detail">${renderScreenHeader(screen)}${howTo}</div>`
        ),
      },
    ];
  }

  const pieces: ContentPiece[] = [];
  for (let i = 0; i < sections.length; i += SCREEN_SECTIONS_PER_CHUNK) {
    const chunk = sections.slice(i, i + SCREEN_SECTIONS_PER_CHUNK);
    const itemCount = chunk.reduce((n, s) => n + s.items.length, 0);
    const continued = i > 0;
    const header = continued ? '' : renderScreenHeader(screen);
    pieces.push({
      weight: 14 + itemCount * 8 + (continued ? 0 : 10),
      html: chapterBlock(
        chapterNum,
        screen.label,
        `<div class="screen-detail">${header}${renderScreenSubsections(chunk)}</div>`,
        continued
      ),
    });
  }
  return pieces;
}

function renderScreensTable(screens: GuideScreen[]): string {
  const rows = screens
    .map(
      (s) => `
      <tr>
        <td class="col-name">${escapeHtml(s.label)}</td>
        <td class="col-path" dir="ltr">${escapeHtml(s.path)}</td>
        <td class="col-desc">${escapeHtml(s.summary)}</td>
      </tr>`
    )
    .join('');
  return `
    <div class="table-wrap">
      <table class="route-table">
        <thead>
          <tr><th class="col-name">الشاشة</th><th class="col-path">المسار</th><th class="col-desc">الوصف</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderFaqBlock(guide: UserRoleGuide): string {
  return guide.faq
    .map(
      (f) => `
      <div class="faq-row">
        <p class="faq-q">${escapeHtml(f.question)}</p>
        <p class="faq-a">${escapeHtml(f.answer)}</p>
      </div>`
    )
    .join('');
}

function buildContentPieces(guide: UserRoleGuide): ContentPiece[] {
  const pieces: ContentPiece[] = [];
  let chapterIndex = 1;
  const ch = () => String(chapterIndex++).padStart(2, '0');

  pieces.push({
    weight: 22,
    html: chapterBlock(
      ch(),
      'مقدمة الدليل',
      `
      <p class="lead">${escapeHtml(guide.introduction)}</p>
      <div class="callout callout--info">
        <strong>البدء السريع</strong>
        <ol class="steps-pro compact">${guide.gettingStarted.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
      </div>`
    ),
  });

  for (const section of guide.sections) {
    const groups: GuideSection['items'][] = [];
    for (let i = 0; i < section.items.length; i += FEATURES_PER_CHUNK) {
      groups.push(section.items.slice(i, i + FEATURES_PER_CHUNK));
    }
    groups.forEach((group, idx) => {
      const body = group.map(renderFeatureItem).join('');
      pieces.push({
        weight: 12 + group.length * 8,
        html: chapterBlock(ch(), section.title, body, idx > 0),
      });
    });
  }

  if (guide.screens.length > 0) {
    const screenChapter = ch();

    for (let i = 0; i < guide.screens.length; i += SCREENS_TABLE_ROWS) {
      const slice = guide.screens.slice(i, i + SCREENS_TABLE_ROWS);
      pieces.push({
        weight: 16 + slice.length * 3,
        html: chapterBlock(screenChapter, 'فهرس الشاشات', renderScreensTable(slice), i > 0),
      });
    }

    for (const screen of guide.screens) {
      pieces.push(...screenToContentPieces(screen, screenChapter));
    }
  }

  if (guide.faq.length > 0) {
    pieces.push({
      weight: 12 + guide.faq.length * 7,
      html: chapterBlock(ch(), 'أسئلة شائعة', renderFaqBlock(guide)),
    });
  }

  if (guide.tips.length > 0) {
    pieces.push({
      weight: 10 + guide.tips.length * 4,
      html: chapterBlock(
        ch(),
        'نصائح للاستخدام الأمثل',
        `<ul class="tips-pro">${guide.tips.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`
      ),
    });
  }

  return pieces;
}

function renderToc(guide: UserRoleGuide): string {
  const items = [
    'مقدمة الدليل',
    ...guide.sections.map((s) => s.title),
    ...(guide.screens.length ? ['فهرس الشاشات', 'شرح الشاشات التفصيلي'] : []),
    ...(guide.faq.length ? ['أسئلة شائعة'] : []),
    ...(guide.tips.length ? ['نصائح للاستخدام الأمثل'] : []),
  ];
  return `
    <div class="toc-page">
      <h1 class="toc-heading">فهرس المحتويات</h1>
      <p class="toc-sub">${escapeHtml(guide.title)} · ${escapeHtml(guide.roleLabel)}</p>
      <ol class="toc-list">
        ${items.map((t, i) => `<li><span class="toc-idx">${i + 1}.</span><span class="toc-label">${escapeHtml(t)}</span></li>`).join('')}
      </ol>
    </div>`;
}

function manualPage(
  template: string,
  inner: string,
  opts: {
    variant: 'cover' | 'content';
    pageNum?: number;
    totalPages?: number;
    runningTitle?: string;
  }
): string {
  const running =
    opts.variant === 'content' && opts.runningTitle
      ? `<header class="running-head"><span>${escapeHtml(PLATFORM_NAME_SHORT)}</span><span class="sep">|</span><span>${escapeHtml(opts.runningTitle)}</span></header>`
      : '';

  const footer =
    opts.pageNum != null
      ? `<footer class="page-foot"><span>${escapeHtml(PLATFORM_YEAR)}</span><span>صفحة ${opts.pageNum} من ${opts.totalPages}</span></footer>`
      : '';

  return `
    <section class="page page--${opts.variant}">
      <img class="page-bg" src="${template}" alt="" />
      <div class="page-safe">
        ${running}
        <main class="page-main page-main--dense">${inner}</main>
        ${footer}
      </div>
    </section>`;
}

function buildPrintStyles(): string {
  return `
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif;
    font-size: 11pt;
    background: #dfe3ea;
    color: #152238;
    direction: rtl;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    overflow-wrap: break-word;
    word-wrap: break-word;
  }
  p, li, td, th, h1, h2, h3, span, div {
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;
  }
  .page {
    position: relative;
    width: ${A4_W_PX}px;
    height: ${A4_H_PX}px;
    max-width: ${A4_W_PX}px;
    margin: 0 auto 14px;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }
  .page:last-child { page-break-after: auto; }
  .page-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: fill;
    z-index: 0;
  }
  .page-safe {
    position: absolute;
    top: 42mm;
    right: 22mm;
    bottom: 44mm;
    left: 20mm;
    z-index: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: visible;
    padding-inline: 2mm;
  }
  .page--cover .page-safe {
    top: 44mm;
    bottom: 46mm;
    right: 20mm;
    left: 20mm;
    justify-content: center;
    align-items: center;
    text-align: center;
  }
  .running-head {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 2mm;
    font-size: 8pt;
    font-weight: 700;
    color: #1a365d;
    padding-bottom: 2.5mm;
    margin-bottom: 3mm;
    border-bottom: 0.4mm solid #c9a227;
    min-width: 0;
    max-width: 100%;
  }
  .running-head span:last-child {
    flex: 1;
    min-width: 0;
    overflow-wrap: break-word;
  }
  .running-head .sep { color: #c9a227; font-weight: 400; }
  .page-main {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 0;
    min-width: 0;
    min-height: 0;
    max-width: 100%;
    overflow: visible;
  }
  .page-main--dense .chapter { margin-bottom: 3mm; }
  .chapter-body {
    min-width: 0;
    max-width: 100%;
  }
  .page-foot {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    font-size: 8pt;
    font-weight: 600;
    color: #3d4f6a;
    padding-top: 2mm;
    margin-top: 2mm;
    border-top: 0.3mm solid rgba(26, 54, 93, 0.2);
  }

  /* ── الغلاف ── */
  .cover-badge {
    display: inline-block;
    font-size: 8.5pt;
    font-weight: 800;
    color: #fff;
    background: linear-gradient(135deg, #1a365d, #2c5282);
    padding: 1.5mm 5mm;
    border-radius: 1mm;
    margin-bottom: 5mm;
    letter-spacing: 0.03em;
  }
  .cover-eyebrow {
    font-size: 10pt;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #8b6914;
    margin-bottom: 4mm;
  }
  .cover-title {
    font-size: 26pt;
    font-weight: 800;
    color: #122540;
    line-height: 1.35;
    margin-bottom: 3mm;
  }
  .cover-sub {
    font-size: 13pt;
    font-weight: 600;
    color: #1a365d;
    margin-bottom: 6mm;
  }
  .cover-meta {
    font-size: 10pt;
    color: #3d4f6a;
    line-height: 1.9;
  }
  .cover-line {
    width: 22mm;
    height: 0.8mm;
    background: linear-gradient(90deg, #c9a227, #8b6914);
    margin: 5mm auto;
  }

  /* ── الفهرس ── */
  .toc-heading {
    font-size: 18pt;
    font-weight: 800;
    color: #122540;
    margin-bottom: 2mm;
  }
  .toc-sub { font-size: 9pt; color: #5a6b82; margin-bottom: 6mm; }
  .toc-list { list-style: none; padding: 0; }
  .toc-list li {
    display: flex;
    align-items: baseline;
    gap: 3mm;
    font-size: 11pt;
    padding: 2.2mm 0;
    border-bottom: 0.2mm dotted rgba(26, 54, 93, 0.12);
    min-width: 0;
  }
  .toc-idx { font-weight: 800; color: #c9a227; min-width: 6mm; flex-shrink: 0; }
  .toc-label { font-weight: 600; color: #1a365d; flex: 1; min-width: 0; }

  /* ── الفصول ── */
  .chapter { margin-bottom: 4mm; }
  .chapter-head {
    display: flex;
    align-items: flex-start;
    gap: 3mm;
    margin-bottom: 3mm;
    padding-bottom: 1.5mm;
    border-bottom: 0.45mm solid #1a365d;
    min-width: 0;
    max-width: 100%;
  }
  .chapter-num {
    font-size: 18pt;
    font-weight: 800;
    color: #c9a227;
    line-height: 1;
    min-width: 10mm;
    flex-shrink: 0;
  }
  .chapter-title {
    font-size: 14pt;
    font-weight: 800;
    color: #122540;
    line-height: 1.35;
    flex: 1;
    min-width: 0;
    overflow-wrap: break-word;
  }
  .lead {
    font-size: 11pt;
    line-height: 1.85;
    color: #1e2f47;
    margin-bottom: 4mm;
    font-weight: 500;
    max-width: 100%;
  }
  .callout {
    padding: 3mm 3mm 3mm 4mm;
    border-inline-start: 1mm solid #c9a227;
    margin-bottom: 3mm;
    max-width: 100%;
  }
  .callout strong {
    display: block;
    font-size: 10.5pt;
    color: #1a365d;
    margin-bottom: 2mm;
  }
  .steps-pro {
    padding-inline-start: 5mm;
    padding-inline-end: 0;
    font-size: 10pt;
    line-height: 1.75;
    color: #243652;
    max-width: 100%;
  }
  .steps-pro.compact li { margin-bottom: 1mm; }
  .steps-pro li { margin-bottom: 1.5mm; }

  .feature {
    margin-bottom: 3mm;
    padding: 2.5mm 2mm 2.5mm 3mm;
    border-inline-start: 0.6mm solid rgba(201, 162, 39, 0.55);
    border-bottom: none;
    background: rgba(255, 255, 255, 0.22);
    max-width: 100%;
    min-width: 0;
  }
  .feature:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 2.5mm; }
  .feature-title {
    font-size: 11pt;
    font-weight: 800;
    color: #1a365d;
    margin-bottom: 1mm;
    overflow-wrap: break-word;
  }
  .feature-desc {
    font-size: 10pt;
    line-height: 1.75;
    color: #2e4059;
    margin-bottom: 1.5mm;
    overflow-wrap: break-word;
  }

  .table-wrap {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
  }
  .route-table {
    width: 100%;
    max-width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    font-size: 9pt;
    line-height: 1.55;
  }
  .route-table th {
    background: #1a365d;
    color: #fff;
    font-weight: 700;
    padding: 2mm 2mm;
    text-align: right;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  .route-table td {
    padding: 2mm 2mm;
    vertical-align: top;
    border-bottom: 0.2mm solid #d5dbe5;
    color: #243652;
    overflow-wrap: break-word;
    word-break: break-word;
    hyphens: auto;
  }
  .route-table tr:nth-child(even) td { background: rgba(26, 54, 93, 0.04); }
  .col-name { font-weight: 700; width: 24%; color: #1a365d; }
  .col-path {
    font-family: Consolas, 'Courier New', monospace;
    font-size: 8pt;
    width: 26%;
    color: #6b4f12;
    word-break: break-all;
    overflow-wrap: anywhere;
    text-align: left;
    direction: ltr;
  }
  .col-desc { width: 50%; }

  .screen-detail {
    margin-bottom: 5mm;
    padding-bottom: 4mm;
    border-bottom: 0.3mm solid rgba(26, 54, 93, 0.15);
    max-width: 100%;
    min-width: 0;
  }
  .screen-detail:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
  .screen-detail-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2mm 4mm;
    margin-bottom: 2mm;
  }
  .screen-detail-title {
    font-size: 12pt;
    font-weight: 800;
    color: #1a365d;
    flex: 1;
    min-width: 0;
  }
  .screen-detail-path {
    font-family: Consolas, 'Courier New', monospace;
    font-size: 8pt;
    color: #6b4f12;
    background: rgba(26, 54, 93, 0.06);
    padding: 1mm 2mm;
    border-radius: 1mm;
    word-break: break-all;
  }
  .screen-detail-summary {
    font-size: 10pt;
    line-height: 1.75;
    color: #2e4059;
    margin-bottom: 2.5mm;
  }
  .screen-howto { margin-bottom: 2.5mm; }
  .screen-howto-label {
    font-size: 9.5pt;
    font-weight: 800;
    color: #8b6914;
    margin-bottom: 1mm;
  }
  .screen-subsection { margin-bottom: 2.5mm; }
  .screen-subsection-title {
    font-size: 10.5pt;
    font-weight: 800;
    color: #122540;
    margin-bottom: 1.5mm;
    padding-bottom: 1mm;
    border-bottom: 0.2mm solid rgba(201, 162, 39, 0.4);
  }
  .screen-subsection .feature {
    padding: 2mm 2mm 2mm 2.5mm;
    margin-bottom: 2mm;
  }

  .faq-row {
    margin-bottom: 3.5mm;
    padding-bottom: 3mm;
    border-bottom: 0.2mm dashed rgba(26, 54, 93, 0.15);
  }
  .faq-q {
    font-size: 10.5pt;
    font-weight: 800;
    color: #1a365d;
    margin-bottom: 1mm;
  }
  .faq-q::before { content: '؟ '; color: #c9a227; }
  .faq-a {
    font-size: 10pt;
    line-height: 1.7;
    color: #2e4059;
  }

  .tips-pro {
    padding-inline-start: 5mm;
    padding-inline-end: 0;
    font-size: 10pt;
    line-height: 1.8;
    color: #243652;
  }
  .tips-pro li { margin-bottom: 2mm; }
  .tips-pro li::marker { color: #c9a227; }

  @media print {
    html, body { background: #fff; width: ${A4_W_MM}mm; }
    .page { margin: 0; box-shadow: none; width: ${A4_W_MM}mm; height: ${A4_H_MM}mm; }
  }
  @media screen {
    .page { box-shadow: 0 6px 28px rgba(0,0,0,0.14); width: ${A4_W_PX}px; height: ${A4_H_PX}px; }
  }
`;
}

function buildGuideSheets(guide: UserRoleGuide, template: string): string[] {
  const contentHtmlPages = packPieces(buildContentPieces(guide));
  const totalPages = 2 + contentHtmlPages.length;

  const sheets: string[] = [];

  sheets.push(
    manualPage(
      template,
      `
      <span class="cover-badge">دليل المستخدم الرسمي</span>
      <p class="cover-eyebrow">${escapeHtml(guide.roleLabel)}</p>
      <div class="cover-line"></div>
      <h1 class="cover-title">${escapeHtml(guide.title)}</h1>
      <p class="cover-sub">${escapeHtml(guide.subtitle)}</p>
      <div class="cover-line"></div>
      <p class="cover-meta">
        ${escapeHtml(PLATFORM_NAME)}<br/>
        ${escapeHtml(PLATFORM_TAGLINE)}<br/>
        ${escapeHtml(PLATFORM_YEAR)}
      </p>`,
      { variant: 'cover' }
    )
  );

  sheets.push(
    manualPage(template, renderToc(guide), {
      variant: 'content',
      pageNum: 2,
      totalPages,
      runningTitle: guide.title,
    })
  );

  contentHtmlPages.forEach((html, i) => {
    sheets.push(
      manualPage(template, html, {
        variant: 'content',
        pageNum: i + 3,
        totalPages,
        runningTitle: guide.title,
      })
    );
  });

  return sheets;
}

function buildFullHtml(title: string, sheets: string[]): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=794, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>${buildPrintStyles()}</style>
</head>
<body>${sheets.join('')}</body>
</html>`;
}

export async function buildUserGuideHtml(guide: UserRoleGuide): Promise<string> {
  const template = await resolveLetterheadBackground();
  return buildFullHtml(guide.title, buildGuideSheets(guide, template));
}

export async function buildAllUserGuidesHtml(): Promise<string> {
  const template = await resolveLetterheadBackground();
  const guides = getAllExportableGuides();
  const allSheets: string[] = [];

  allSheets.push(
    manualPage(
      template,
      `
      <h1 class="cover-title">دليل المستخدم الشامل</h1>
      <p class="cover-sub">جميع فئات المستخدمين</p>
      <div class="cover-line"></div>
      <p class="cover-meta">${escapeHtml(PLATFORM_NAME)}<br/>${escapeHtml(PLATFORM_YEAR)}</p>`,
      { variant: 'cover' }
    )
  );

  const tocItems = guides
    .map((g, i) => `<li><span class="toc-idx">${i + 1}.</span><span class="toc-label">${escapeHtml(g.title)} — ${escapeHtml(g.roleLabel)}</span></li>`)
    .join('');

  allSheets.push(
    manualPage(
      template,
      `<div class="toc-page"><h1 class="toc-heading">فهرس الأدلة</h1><ol class="toc-list">${tocItems}</ol></div>`,
      { variant: 'content', pageNum: 2, totalPages: 0, runningTitle: 'الدليل الشامل' }
    )
  );

  for (const guide of guides) {
    allSheets.push(...buildGuideSheets(guide, template).slice(1));
  }

  return buildFullHtml('دليل المستخدم الشامل', allSheets);
}

export async function printUserGuide(guide: UserRoleGuide) {
  await openPrintWindow(await buildUserGuideHtml(guide), guide.title);
}

export async function printAllUserGuides() {
  await openPrintWindow(await buildAllUserGuidesHtml(), 'دليل المستخدم الشامل');
}

export async function downloadUserGuideHtml(guide: UserRoleGuide) {
  downloadHtmlFile(await buildUserGuideHtml(guide), `دليل-${guide.role}.html`);
}

export async function downloadAllUserGuidesHtml() {
  downloadHtmlFile(await buildAllUserGuidesHtml(), 'دليل-المستخدم-الشامل.html');
}

async function mountGuideDocument(html: string): Promise<{
  pages: HTMLElement[];
  cleanup: () => void;
}> {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText =
    `position:fixed;left:-20000px;top:0;width:${A4_W_PX}px;height:auto;overflow:hidden;pointer-events:none;opacity:0;`;
  document.body.appendChild(host);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = `width:${A4_W_PX}px;height:${A4_H_PX}px;border:0;`;
  host.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    host.remove();
    throw new Error('تعذّر إعداد مستند التصدير');
  }

  doc.open();
  doc.write(html);
  doc.close();

  await new Promise<void>((resolve) => {
    if (doc.readyState === 'complete') resolve();
    else iframe.onload = () => resolve();
  });

  if (doc.fonts?.ready) await doc.fonts.ready;
  await new Promise((r) => setTimeout(r, 400));

  const images = Array.from(doc.images);
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        })
    )
  );

  const pages = Array.from(doc.querySelectorAll<HTMLElement>('.page'));
  if (pages.length === 0) {
    host.remove();
    throw new Error('لا توجد صفحات للتصدير');
  }

  return {
    pages,
    cleanup: () => host.remove(),
  };
}

async function capturePagesToPdf(
  pages: HTMLElement[],
  onProgress?: PdfExportProgress
): Promise<Blob> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  for (let i = 0; i < pages.length; i++) {
    onProgress?.(i + 1, pages.length);

    const pageEl = pages[i];
    const dataUrl = await toPng(pageEl, {
      ...PDF_CAPTURE_OPTIONS,
      width: A4_W_PX,
      height: A4_H_PX,
      backgroundColor: '#ffffff',
    });

    if (i > 0) pdf.addPage();
    pdf.addImage(dataUrl, 'PNG', 0, 0, A4_W_MM, A4_H_MM, undefined, 'FAST');
  }

  return pdf.output('blob');
}

async function exportHtmlToPdf(
  html: string,
  filename: string,
  onProgress?: PdfExportProgress
): Promise<void> {
  const { pages, cleanup } = await mountGuideDocument(html);
  try {
    const blob = await capturePagesToPdf(pages, onProgress);
    downloadBlobFile(blob, filename);
  } finally {
    cleanup();
  }
}

function downloadBlobFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadUserGuidePdf(
  guide: UserRoleGuide,
  onProgress?: PdfExportProgress
) {
  const html = await buildUserGuideHtml(guide);
  await exportHtmlToPdf(html, `دليل-${guide.role}.pdf`, onProgress);
}

export async function downloadAllUserGuidesPdf(onProgress?: PdfExportProgress) {
  const html = await buildAllUserGuidesHtml();
  await exportHtmlToPdf(html, 'دليل-المستخدم-الشامل.pdf', onProgress);
}

async function openPrintWindow(html: string, title: string) {
  const win = window.open('', '_blank', 'width=840,height=900');
  if (!win) throw new Error('تعذّر فتح نافذة الطباعة — اسمح بالنوافذ المنبثقة');

  win.document.write(html);
  win.document.close();
  win.document.title = title;

  await new Promise<void>((resolve) => {
    const go = () => {
      win.focus();
      win.print();
      resolve();
    };
    const wait = () => {
      if (win.document.fonts?.ready) void win.document.fonts.ready.then(() => setTimeout(go, 500));
      else setTimeout(go, 1000);
    };
    if (win.document.readyState === 'complete') wait();
    else win.onload = wait;
  });
}

function downloadHtmlFile(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
