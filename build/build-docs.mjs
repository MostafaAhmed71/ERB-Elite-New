/**
 * build/build-docs.mjs
 * يحوّل knowledge-base/*.md → HTML + PDF + ZIP موحّد
 * تشغيل: npm run build-docs
 * يعمل على Windows / macOS / Linux
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWriteStream } from 'node:fs';

import MarkdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import multimdTable from 'markdown-it-multimd-table';
import puppeteer from 'puppeteer';
import archiver from 'archiver';
import { PDFDocument } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const KB_DIR = path.join(ROOT, 'knowledge-base');
const OUT_HTML = path.join(ROOT, 'dist', 'html');
const OUT_PDF = path.join(ROOT, 'dist', 'pdf');
const ZIP_PATH = path.join(ROOT, 'Olympiad-Knowledge-Base.zip');
const COMBINED_PDF_NAME = 'KnowledgeBase.pdf';
const CSS_PATH = path.join(__dirname, 'docs.css');

/** ترتيب الملف الموحّد */
const COMBINED_ORDER = [
  'README',
  'USER_GUIDE',
  'STUDENT_GUIDE',
  'TEACHER_GUIDE',
  'FAQ',
  'SUBSCRIPTIONS',
  'PLATFORM_FEATURES',
  'SUPPORT',
  'AI_AGENT_CONTEXT',
  'TERMS',
  'PRIVACY',
  'CONTACT',
];

const TITLE_AR = {
  README: 'نظرة عامة',
  USER_GUIDE: 'دليل المستخدم',
  STUDENT_GUIDE: 'دليل الطالب',
  TEACHER_GUIDE: 'دليل المعلم',
  FAQ: 'الأسئلة الشائعة',
  SUBSCRIPTIONS: 'الاشتراكات',
  PLATFORM_FEATURES: 'مميزات المنصة',
  SUPPORT: 'الدعم الفني',
  AI_AGENT_CONTEXT: 'تعليمات وكيل الذكاء الاصطناعي',
  TERMS: 'شروط الاستخدام',
  PRIVACY: 'سياسة الخصوصية',
  CONTACT: 'التواصل',
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function slugify(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9\s-_]/gi, '')
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'section';
}

function createMarkdown() {
  return new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    breaks: false,
  })
    .use(multimdTable, { multiline: true, rowspan: true, headerless: true })
    .use(markdownItAnchor, {
      level: [1, 2, 3],
      slugify,
      permalink: false,
    });
}

function findLogoPath() {
  const candidates = [
    path.join(ROOT, 'logo.png'),
    path.join(ROOT, 'public', 'logo.png'),
    path.join(KB_DIR, 'logo.png'),
    path.join(__dirname, 'assets', 'logo.png'),
    path.join(ROOT, 'public', 'icon.jpeg'),
    path.join(ROOT, 'public', 'icon.jpg'),
    path.join(ROOT, 'public', 'i.jpeg'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function fileToDataUri(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === '.png' ? 'image/png'
    : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
    : ext === '.webp' ? 'image/webp'
    : ext === '.svg' ? 'image/svg+xml'
    : 'application/octet-stream';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function todayLabel() {
  try {
    return new Date().toLocaleDateString('ar-SA', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function listKbMarkdownFiles() {
  if (!fs.existsSync(KB_DIR)) {
    throw new Error(`مجلد المعرفة غير موجود: ${KB_DIR}`);
  }
  return fs
    .readdirSync(KB_DIR)
    .filter((f) => f.toLowerCase().endsWith('.md'))
    .sort((a, b) => a.localeCompare(b));
}

function wrapHtmlDocument({ title, bodyHtml, logoDataUri, cssText, isCombined = false }) {
  const logoBlock = logoDataUri
    ? `<img class="brand-logo" src="${logoDataUri}" alt="شعار أولمبياد النخبة" />`
    : `<div class="brand-logo-fallback">أولمبياد النخبة</div>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${cssText}</style>
</head>
<body class="${isCombined ? 'combined' : 'single'}">
  <header class="print-header" aria-hidden="true">
    ${logoBlock}
    <div class="print-header-text">
      <strong>منصة أولمبياد النخبة</strong>
      <span>Knowledge Base</span>
    </div>
  </header>
  <main class="doc-main">
    ${bodyHtml}
  </main>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractTocEntries(markdown, sectionId) {
  const entries = [];
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const m = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (!m) continue;
    const level = m[1].length;
    const text = m[2].replace(/#+\s*$/, '').trim();
    entries.push({
      level,
      text,
      id: `${sectionId}--${slugify(text)}`,
      sectionId,
    });
  }
  return entries;
}

function rewriteHeadingIds(html, sectionId) {
  // markdown-it-anchor already adds ids; prefix them for uniqueness in combined doc
  return html.replace(/id="([^"]+)"/g, (_, id) => `id="${sectionId}--${id}"`);
}

async function launchBrowser() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : null,
    process.platform === 'win32' ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' : null,
    process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : null,
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ].filter(Boolean);

  const executablePath = candidates.find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });

  const launchOpts = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=medium',
    ],
  };

  if (executablePath) {
    console.log(`   المتصفح: ${executablePath}`);
    return puppeteer.launch({ ...launchOpts, executablePath });
  }

  console.log('   المتصفح: Chromium المدمج مع Puppeteer');
  return puppeteer.launch(launchOpts);
}

async function htmlToPdf(browser, htmlPath, pdfPath, logoDataUri) {
  const page = await browser.newPage();
  const fileUrl = pathToFileUrl(htmlPath);
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 120_000 });

  const headerLogo = logoDataUri
    ? `<img src="${logoDataUri}" style="height:22px;width:auto;vertical-align:middle;margin-inline-end:8px;" />`
    : '';

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="width:100%;font-size:9px;padding:0 16mm;display:flex;align-items:center;justify-content:space-between;color:#334155;font-family:Tahoma,Arial,sans-serif;direction:rtl;">
        <div style="display:flex;align-items:center;gap:6px;">${headerLogo}<span>منصة أولمبياد النخبة</span></div>
        <span style="opacity:.7">Knowledge Base</span>
      </div>`,
    footerTemplate: `
      <div style="width:100%;font-size:9px;padding:0 16mm;text-align:center;color:#64748b;font-family:Tahoma,Arial,sans-serif;direction:ltr;">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>`,
    margin: {
      top: '22mm',
      bottom: '18mm',
      left: '14mm',
      right: '14mm',
    },
  });

  await page.close();
}

function pathToFileUrl(filePath) {
  const resolved = path.resolve(filePath);
  if (process.platform === 'win32') {
    return `file:///${resolved.replace(/\\/g, '/')}`;
  }
  return `file://${resolved}`;
}

async function stampPdfPageNumbersIfNeeded(pdfPath) {
  // Puppeteer already stamps page numbers via footer; keep helper for future merges.
  if (!fs.existsSync(pdfPath)) return;
  void pdfPath;
}

async function createZip({ mdFiles, htmlFiles, pdfFiles }) {
  ensureDir(path.dirname(ZIP_PATH));
  if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);

  const output = createWriteStream(ZIP_PATH);
  const archive = archiver('zip', { zlib: { level: 9 } });

  const done = new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
  });

  archive.pipe(output);

  for (const f of mdFiles) {
    archive.file(path.join(KB_DIR, f), { name: `markdown/${f}` });
  }
  for (const f of htmlFiles) {
    archive.file(path.join(OUT_HTML, f), { name: `html/${f}` });
  }
  for (const f of pdfFiles) {
    archive.file(path.join(OUT_PDF, f), { name: `pdf/${f}` });
  }

  // الملف الموحّد أيضاً في جذر الأرشيف لسهولة الرفع
  const combined = path.join(OUT_PDF, COMBINED_PDF_NAME);
  if (fs.existsSync(combined)) {
    archive.file(combined, { name: COMBINED_PDF_NAME });
  }

  await archive.finalize();
  await done;
}

async function main() {
  const started = Date.now();
  console.log('📚 بناء قاعدة معرفة أولمبياد النخبة…');
  console.log(`   الجذر: ${ROOT}`);

  ensureDir(OUT_HTML);
  ensureDir(OUT_PDF);

  const cssText = fs.existsSync(CSS_PATH)
    ? fs.readFileSync(CSS_PATH, 'utf8')
    : 'body{font-family:Tahoma,Arial,sans-serif;direction:rtl}';

  const logoPath = findLogoPath();
  const logoDataUri = fileToDataUri(logoPath);
  if (logoPath) console.log(`   الشعار: ${path.relative(ROOT, logoPath)}`);
  else console.log('   ⚠️ لم يُعثر على logo.png — سيتم البناء بدون شعار صورة (نص بديل)');

  const md = createMarkdown();
  const mdFiles = listKbMarkdownFiles();
  if (!mdFiles.length) throw new Error('لا توجد ملفات Markdown في knowledge-base/');

  /** @type {{ base: string, file: string, markdown: string, htmlBody: string, toc: ReturnType<typeof extractTocEntries> }[]} */
  const docs = [];

  for (const file of mdFiles) {
    const base = path.basename(file, '.md');
    const markdown = fs.readFileSync(path.join(KB_DIR, file), 'utf8');
    let htmlBody = md.render(markdown);
    htmlBody = rewriteHeadingIds(htmlBody, base);
    const toc = extractTocEntries(markdown, base);
    docs.push({ base, file, markdown, htmlBody, toc });
  }

  // ── HTML فردي + PDF فردي ─────────────────────────────────
  console.log(`   تحويل ${docs.length} ملفاً إلى HTML/PDF…`);
  const browser = await launchBrowser();

  try {
    for (const doc of docs) {
      const title = TITLE_AR[doc.base] || doc.base;
      const body = `
        <article class="doc-article" id="${escapeHtml(doc.base)}">
          <h1 class="doc-title">${escapeHtml(title)}</h1>
          <p class="doc-meta"><code>${escapeHtml(doc.file)}</code></p>
          ${doc.htmlBody}
        </article>`;
      const html = wrapHtmlDocument({
        title: `${title} — أولمبياد النخبة`,
        bodyHtml: body,
        logoDataUri,
        cssText,
      });
      const htmlName = `${doc.base}.html`;
      const pdfName = `${doc.base}.pdf`;
      const htmlPath = path.join(OUT_HTML, htmlName);
      const pdfPath = path.join(OUT_PDF, pdfName);
      fs.writeFileSync(htmlPath, html, 'utf8');
      await htmlToPdf(browser, htmlPath, pdfPath, logoDataUri);
      await stampPdfPageNumbersIfNeeded(pdfPath);
      console.log(`   ✓ ${doc.base}`);
    }

    // ── الملف الموحّد ──────────────────────────────────────
    console.log('   إنشاء KnowledgeBase.pdf الموحّد…');
    const dateLabel = todayLabel();
    const ordered = COMBINED_ORDER
      .map((base) => docs.find((d) => d.base === base))
      .filter(Boolean);

    // أضف أي ملفات إضافية غير مدرجة في الترتيب
    for (const d of docs) {
      if (!ordered.includes(d)) ordered.push(d);
    }

    const tocHtml = ordered
      .map((d, i) => {
        const label = TITLE_AR[d.base] || d.base;
        return `<li class="toc-item toc-l1"><a href="#${d.base}">${i + 1}. ${escapeHtml(label)}</a></li>`;
      })
      .join('\n');

    const sectionsHtml = ordered
      .map((d) => {
        const label = TITLE_AR[d.base] || d.base;
        return `
        <section class="combined-section" id="${escapeHtml(d.base)}">
          <h1 class="section-banner">${escapeHtml(label)}</h1>
          <p class="doc-meta"><code>${escapeHtml(d.file)}</code></p>
          ${d.htmlBody}
        </section>`;
      })
      .join('\n');

    const coverHtml = `
      <section class="cover-page">
        <div class="cover-inner">
          ${logoDataUri ? `<img class="cover-logo" src="${logoDataUri}" alt="" />` : ''}
          <p class="cover-eyebrow">ERB Elite</p>
          <h1 class="cover-title">منصة أولمبياد النخبة</h1>
          <h2 class="cover-subtitle">Knowledge Base</h2>
          <p class="cover-tagline">نحو القمة بالتميز</p>
          <p class="cover-date">تاريخ الإنشاء: ${escapeHtml(dateLabel)}</p>
          <p class="cover-note">قاعدة معرفة جاهزة للدعم الفني وMeta Business AI وأنظمة RAG</p>
        </div>
      </section>
      <section class="toc-page">
        <h1>جدول المحتويات</h1>
        <ol class="toc-list">
          ${tocHtml}
        </ol>
      </section>
      ${sectionsHtml}
    `;

    const combinedHtml = wrapHtmlDocument({
      title: 'Knowledge Base — أولمبياد النخبة',
      bodyHtml: coverHtml,
      logoDataUri,
      cssText,
      isCombined: true,
    });

    const combinedHtmlPath = path.join(OUT_HTML, 'KnowledgeBase.html');
    const combinedPdfPath = path.join(OUT_PDF, COMBINED_PDF_NAME);
    fs.writeFileSync(combinedHtmlPath, combinedHtml, 'utf8');
    await htmlToPdf(browser, combinedHtmlPath, combinedPdfPath, logoDataUri);

    // نسخة إضافية بجانب dist للوصول السريع
    fs.copyFileSync(combinedPdfPath, path.join(ROOT, 'dist', COMBINED_PDF_NAME));
  } finally {
    await browser.close();
  }

  // ── ZIP ──────────────────────────────────────────────────
  console.log('   إنشاء Olympiad-Knowledge-Base.zip…');
  const htmlFiles = fs.readdirSync(OUT_HTML).filter((f) => f.endsWith('.html'));
  const pdfFiles = fs.readdirSync(OUT_PDF).filter((f) => f.endsWith('.pdf'));
  await createZip({ mdFiles, htmlFiles, pdfFiles });

  // تحقق بسيط من أن PDF الموحّد قابل للقراءة
  try {
    const bytes = fs.readFileSync(path.join(OUT_PDF, COMBINED_PDF_NAME));
    await PDFDocument.load(bytes);
  } catch (e) {
    console.warn('   ⚠️ تعذّر التحقق من PDF عبر pdf-lib:', e instanceof Error ? e.message : e);
  }

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log('');
  console.log('✅ اكتمل البناء');
  console.log(`   HTML: ${path.relative(ROOT, OUT_HTML)}`);
  console.log(`   PDF:  ${path.relative(ROOT, OUT_PDF)}`);
  console.log(`   موحّد: dist/pdf/${COMBINED_PDF_NAME}`);
  console.log(`   ZIP:  ${path.relative(ROOT, ZIP_PATH)}`);
  console.log(`   الوقت: ${secs}s`);
}

main().catch((err) => {
  console.error('❌ فشل build-docs:', err);
  process.exit(1);
});
