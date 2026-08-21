/** تنزيل ملف من رابط خارجي (يعمل حتى عبر نطاق مختلف عند تفعيل CORS) */
export async function downloadFileFromUrl(url: string, fileName?: string) {
  const cleanUrl = url.trim();
  if (!cleanUrl) throw new Error('رابط الملف غير متوفر');

  const suggested =
    (fileName?.trim() && (fileName.trim().toLowerCase().endsWith('.pdf')
      ? fileName.trim()
      : `${fileName.trim()}.pdf`)) ||
    decodeURIComponent(cleanUrl.split('/').pop()?.split('?')[0] || 'file.pdf') ||
    'file.pdf';

  const res = await fetch(cleanUrl, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`تعذّر تنزيل الملف (${res.status})`);
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = suggested;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2_000);
}
