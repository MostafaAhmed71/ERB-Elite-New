import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import PptxGenJS from 'pptxgenjs';
import { jsPDF } from 'jspdf';

function splitBlocks(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
}

function isHeading(line: string): boolean {
  const t = line.trim();
  if (/^#{1,3}\s+/.test(t)) return true;
  if (/^[\d٠-٩]+[\.\)]\s+/.test(t) && t.length < 80) return true;
  if (t.length < 60 && !t.includes('.') && /[أ-يA-Za-z]/.test(t)) {
    // short title-like lines without punctuation
    return /^[\u0600-\u06FFA-Za-z0-9\s\-_:]+$/.test(t) && t.split(/\s+/).length <= 10;
  }
  return false;
}

function cleanHeading(line: string): string {
  return line.replace(/^#{1,3}\s+/, '').trim();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeName(title: string): string {
  const base = (title || 'ai-export').replace(/[^\u0600-\u06FFa-zA-Z0-9-_ ]/g, '').trim() || 'ai-export';
  return base.slice(0, 60);
}

export async function exportToWord(content: string, title = 'مساعد المعلم') {
  const blocks = splitBlocks(content);
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: title, rightToLeft: true, bold: true })],
    }),
  ];

  for (const block of blocks) {
    const lines = block.split('\n');
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      if (isHeading(t)) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
            children: [new TextRun({ text: cleanHeading(t), rightToLeft: true, bold: true })],
          }),
        );
      } else {
        children.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 120 },
            children: [new TextRun({ text: t, rightToLeft: true })],
          }),
        );
      }
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${safeName(title)}.docx`);
}

export async function exportToPptx(content: string, title = 'مساعد المعلم') {
  const pptx = new PptxGenJS();
  pptx.rtlMode = true;
  pptx.author = 'ERB Elite';
  pptx.title = title;

  const titleSlide = pptx.addSlide();
  titleSlide.addText(title, {
    x: 0.5,
    y: 2.2,
    w: 9,
    h: 1,
    fontSize: 28,
    bold: true,
    align: 'center',
    color: '1E3A5F',
  });

  const blocks = splitBlocks(content);
  let currentTitle = 'محتوى';
  let bullets: string[] = [];

  const flush = () => {
    if (!bullets.length && currentTitle === 'محتوى') return;
    const slide = pptx.addSlide();
    slide.addText(currentTitle, {
      x: 0.4,
      y: 0.3,
      w: 9.2,
      h: 0.7,
      fontSize: 20,
      bold: true,
      color: '1E3A5F',
      align: 'right',
    });
    const body = bullets.length ? bullets : [''];
    slide.addText(
      body.slice(0, 10).map((t) => ({ text: t, options: { bullet: body.length > 1 } })),
      {
        x: 0.5,
        y: 1.2,
        w: 9,
        h: 4.5,
        fontSize: 14,
        color: '333333',
        align: 'right',
        valign: 'top',
      },
    );
    bullets = [];
  };

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (isHeading(lines[0])) {
      flush();
      currentTitle = cleanHeading(lines[0]).slice(0, 80);
      bullets = lines.slice(1);
    } else {
      if (bullets.length > 8) flush();
      bullets.push(...lines);
    }
  }
  flush();

  await pptx.writeFile({ fileName: `${safeName(title)}.pptx` });
}

export function exportToPdf(content: string, title = 'مساعد المعلم') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  // خط افتراضي لاتيني — نعرض النص مع التفاف؛ للعربية الأفضل طباعة المتصفح إن احتجت جودة أعلى
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.text(title, 105, 18, { align: 'center' });
  doc.setFontSize(11);

  const pageWidth = 180;
  const margin = 15;
  let y = 28;
  const lines = doc.splitTextToSize(content, pageWidth) as string[];
  for (const line of lines) {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, margin, y);
    y += 6;
  }
  doc.save(`${safeName(title)}.pdf`);
}
