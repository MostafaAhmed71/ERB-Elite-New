import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { StudentCard } from '../components/student/StudentCard';
import { PLATFORM_ICON } from './branding';
import { getStudentQRUrl } from './qr';

export type StudentCardExportItem = {
  id: string;
  full_name: string;
  grade: string;
  class_name: string;
  admission_number: string;
  qr_token?: string | null;
  photoUrl?: string | null;
};

const PNG_CAPTURE_OPTIONS = {
  pixelRatio: 3,
  backgroundColor: '#ffffff',
  /** تجنّب جلب خطوط Google (تفشل مع Service Worker / CORS) */
  skipFonts: true,
  /** true يضيف ?t= لروابط blob فيكسر صور الطلاب */
  cacheBust: false,
  filter: (node: HTMLElement) => {
    const tag = node.tagName?.toUpperCase();
    return tag !== 'LINK';
  },
};

function sanitizeFileName(name: string): string {
  return name.replace(/[/\\:*?"<>|\n\r]/g, '_').replace(/\s+/g, ' ').trim() || 'بطاقة';
}

function buildUniqueFileName(
  fullName: string,
  admissionNumber: string,
  used: Map<string, number>
): string {
  const base = sanitizeFileName(fullName);
  const count = used.get(base) ?? 0;
  used.set(base, count + 1);
  if (count === 0) return `${base}.png`;
  return `${base}_${admissionNumber}.png`;
}

function toAbsoluteUrl(url: string): string {
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return new URL(url, window.location.origin).href;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('فشل قراءة الصورة'));
    reader.readAsDataURL(blob);
  });
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const absolute = toAbsoluteUrl(url);
    if (absolute.startsWith('data:')) return absolute;

    const response = await fetch(absolute, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return await blobToDataUrl(await response.blob());
  } catch {
    return null;
  }
}

async function resolvePhotoUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  return fetchAsDataUrl(url);
}

async function inlineImagesInTree(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      const src = img.currentSrc || img.getAttribute('src') || '';
      if (!src || src.startsWith('data:')) return;
      const dataUrl = await fetchAsDataUrl(src);
      if (dataUrl) img.src = dataUrl;
    })
  );
}

async function waitForRender(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function captureCardPng(item: StudentCardExportItem): Promise<Blob> {
  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;left:-10000px;top:0;z-index:-1;background:#fff;pointer-events:none;';
  document.body.appendChild(host);

  const mount = document.createElement('div');
  host.appendChild(mount);

  let root: Root | null = null;

  try {
    const [photoUrl, platformIconUrl] = await Promise.all([
      resolvePhotoUrl(item.photoUrl),
      fetchAsDataUrl(PLATFORM_ICON),
    ]);

    root = createRoot(mount);
    root.render(
      createElement(StudentCard, {
        studentName: item.full_name,
        grade: item.grade,
        studentClass: item.class_name,
        admissionNumber: item.admission_number,
        photoUrl,
        platformIconUrl: platformIconUrl ?? undefined,
        qrValue: getStudentQRUrl(item.id, item.qr_token),
        printSize: true,
        wrapperClassName: 'shadow-none',
        useSystemFont: true,
      })
    );

    await waitForRender(host);

    const card = mount.querySelector('article');
    if (!card) {
      throw new Error('تعذر إنشاء البطاقة');
    }

    const cardEl = card as HTMLElement;
    cardEl.style.fontFamily = 'Arial, Helvetica, sans-serif';

    await inlineImagesInTree(cardEl);
    await waitForRender(cardEl);

    const dataUrl = await toPng(cardEl, PNG_CAPTURE_OPTIONS);
    const response = await fetch(dataUrl);
    return response.blob();
  } finally {
    root?.unmount();
    host.remove();
  }
}

export async function downloadStudentCardImage(
  student: StudentCardExportItem,
  options?: { fileName?: string }
): Promise<void> {
  const blob = await captureCardPng(student);
  const fileName =
    options?.fileName ??
    `${sanitizeFileName(student.full_name)}_${student.admission_number}.png`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportStudentCardsZip(
  students: StudentCardExportItem[],
  options?: {
    zipFileName?: string;
    onProgress?: (done: number, total: number) => void;
  }
): Promise<void> {
  if (students.length === 0) {
    throw new Error('لا يوجد طلاب للتصدير');
  }

  const zip = new JSZip();
  const used = new Map<string, number>();
  const total = students.length;

  for (let i = 0; i < students.length; i++) {
    const student = students[i]!;
    const blob = await captureCardPng(student);
    zip.file(buildUniqueFileName(student.full_name, student.admission_number, used), blob);
    options?.onProgress?.(i + 1, total);
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = options?.zipFileName ?? `بطاقات-الطلاب-${stamp}.zip`;
  const url = URL.createObjectURL(zipBlob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
