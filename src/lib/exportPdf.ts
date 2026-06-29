/** طباعة تقرير HTML كـ PDF عبر نافذة الطباعة */
import { PLATFORM_NAME } from './branding';

export function printHtmlReport(title: string, htmlBody: string) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;

  win.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 32px; color: #111; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        .meta { color: #666; font-size: 12px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: right; }
        th { background: #f5f5f5; }
        .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
        .kpi { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
        .kpi-label { font-size: 11px; color: #666; }
        .kpi-value { font-size: 20px; font-weight: bold; margin-top: 4px; }
        @media print { body { padding: 16px; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p class="meta">${PLATFORM_NAME} — ${new Date().toLocaleString('ar-SA')}</p>
      ${htmlBody}
    </body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 400);
}
