/**
 * رفع ملفات إلى Hostinger (وليس Supabase Storage).
 * المراجعات → uploads/exam-reviews
 * شواهد المنح → uploads/points-evidence
 * صور الطلاب/الفصول → uploads/school-media
 * يُحفظ الرابط العام فقط في Supabase.
 */

export type HostingerUploadResult = {
  url: string;
  file_name: string;
  mime: string;
};

function examReviewUploadEndpoint(): string {
  const fromEnv = (import.meta.env.VITE_HOSTINGER_UPLOAD_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return `${window.location.origin}/api/upload-exam-review.php`;
}

/** يستنتج رابط شواهد المنح من رابط مراجعات PDF إن وُجد */
function pointsEvidenceUploadEndpoint(): string {
  const fromEnv = (import.meta.env.VITE_HOSTINGER_EVIDENCE_UPLOAD_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const examUrl = (import.meta.env.VITE_HOSTINGER_UPLOAD_URL as string | undefined)?.trim();
  if (examUrl) {
    return examUrl
      .replace(/\/$/, '')
      .replace(/upload-exam-review\.php$/i, 'upload-points-evidence.php');
  }

  return `${window.location.origin}/api/upload-points-evidence.php`;
}

function schoolMediaUploadEndpoint(): string {
  const fromEnv = (import.meta.env.VITE_HOSTINGER_MEDIA_UPLOAD_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const examUrl = (import.meta.env.VITE_HOSTINGER_UPLOAD_URL as string | undefined)?.trim();
  if (examUrl) {
    return examUrl
      .replace(/\/$/, '')
      .replace(/upload-exam-review\.php$/i, 'upload-school-media.php');
  }

  return `${window.location.origin}/api/upload-school-media.php`;
}

function uploadToken(): string {
  return (import.meta.env.VITE_HOSTINGER_UPLOAD_TOKEN as string | undefined)?.trim() ?? '';
}

function requireUploadToken(): string {
  const token = uploadToken();
  if (!token || token === 'CHANGE_ME_TEACHER_UPLOAD_TOKEN') {
    throw new Error(
      'لم يُضبط رمز رفع Hostinger — أضف VITE_HOSTINGER_UPLOAD_TOKEN في .env ورمز UPLOAD_TOKEN في ملف PHP',
    );
  }
  return token;
}

function sanitizePdfName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '');
  const safe = base.replace(/[^\w.\u0600-\u06FF-]+/g, '_').slice(0, 80) || 'review';
  return `${safe}.pdf`;
}

function sanitizeEvidenceName(name: string): string {
  const ext = (name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const base = name.replace(/\.[^.]+$/, '');
  const safe = base.replace(/[^\w.\u0600-\u06FF-]+/g, '_').slice(0, 80) || 'evidence';
  return `${safe}.${ext}`;
}

function sanitizeImageName(name: string): string {
  const ext = (name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)
    ? ext === 'jpeg'
      ? 'jpg'
      : ext
    : 'jpg';
  const base = name.replace(/\.[^.]+$/, '');
  const safe = base.replace(/[^\w.\u0600-\u06FF-]+/g, '_').slice(0, 80) || 'photo';
  return `${safe}.${safeExt}`;
}

async function postToHostinger(
  endpoint: string,
  file: File,
  clientFileName: string,
  fields: Record<string, string>,
): Promise<HostingerUploadResult> {
  const token = requireUploadToken();
  const body = new FormData();
  body.append('file', file, clientFileName);
  body.append('token', token);
  for (const [k, v] of Object.entries(fields)) {
    body.append(k, v);
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'X-Upload-Token': token,
    },
    body,
  });

  const rawText = await res.text();
  let payload: { ok?: boolean; url?: string; file_name?: string; mime?: string; error?: string } = {};
  let parsedJson = false;
  try {
    payload = JSON.parse(rawText) as typeof payload;
    parsedJson = true;
  } catch {
    /* HTML / empty — غالباً السكربت غير مرفوع أو مسار خاطئ */
  }

  if (!res.ok || !payload.ok || !payload.url) {
    const code = payload.error ?? (parsedJson ? `HTTP_${res.status}` : 'NOT_PHP_JSON');
    if (code === 'UNAUTHORIZED') throw new Error('رمز رفع الملفات غير صحيح');
    if (code === 'PDF_ONLY') throw new Error('يُسمح بملفات PDF فقط');
    if (code === 'TYPE_NOT_ALLOWED') throw new Error('يُسمح بالصور أو PDF فقط');
    if (code === 'FILE_TOO_LARGE') throw new Error('حجم الملف أكبر من المسموح');
    if (code === 'INVALID_KIND' || code === 'INVALID_KEY') {
      throw new Error('بيانات رفع الصورة غير صالحة');
    }
    if (code === 'NOT_PHP_JSON' || res.status === 404) {
      throw new Error(
        'سكربت الرفع غير موجود على Hostinger — ارفع public/api/upload-school-media.php وأنشئ مجلد uploads/school-media بصلاحية الكتابة',
      );
    }
    throw new Error(`فشل رفع الملف إلى الاستضافة (${code})`);
  }

  return {
    url: payload.url,
    file_name: payload.file_name || file.name,
    mime: payload.mime || file.type || 'application/octet-stream',
  };
}

export async function uploadExamReviewToHostinger(
  file: File,
  teacherId: string,
): Promise<HostingerUploadResult> {
  if (!file || file.size === 0) throw new Error('اختر ملف PDF صالحاً');
  if (file.size > 25 * 1024 * 1024) throw new Error('حجم الملف أكبر من 25 ميجابايت');

  const isPdf =
    file.type === 'application/pdf' ||
    file.type === 'application/x-pdf' ||
    file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) throw new Error('يُسمح بملفات PDF فقط');

  return postToHostinger(examReviewUploadEndpoint(), file, sanitizePdfName(file.name), {
    teacher_id: teacherId,
  });
}

const EVIDENCE_ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

/** رفع شاهد منح واحد (صورة أو PDF) إلى Hostinger */
export async function uploadPointsEvidenceToHostinger(
  file: File,
  userId: string,
): Promise<HostingerUploadResult> {
  if (!file || file.size === 0) throw new Error('ملف فارغ');
  if (file.size > 10 * 1024 * 1024) throw new Error(`الملف أكبر من 10MB: ${file.name}`);

  const byExt = /\.(jpe?g|png|webp|gif|pdf)$/i.test(file.name);
  if (!EVIDENCE_ALLOWED.has(file.type) && !byExt) {
    throw new Error(`نوع الملف غير مدعوم: ${file.name} (صور أو PDF فقط)`);
  }

  return postToHostinger(
    pointsEvidenceUploadEndpoint(),
    file,
    sanitizeEvidenceName(file.name),
    { user_id: userId },
  );
}

const IMAGE_ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/** رفع صورة طالب/فصل إلى Hostinger (uploads/school-media) */
export async function uploadSchoolMediaToHostinger(
  file: File,
  kind: 'class' | 'student',
  key: string,
): Promise<HostingerUploadResult> {
  if (!file || file.size === 0) throw new Error('اختر صورة صالحة');
  if (file.size > 3 * 1024 * 1024) throw new Error('حجم الصورة يجب ألا يتجاوز 3 ميجابايت');

  const byExt = /\.(jpe?g|png|webp|gif)$/i.test(file.name);
  if (!IMAGE_ALLOWED.has(file.type) && !byExt) {
    throw new Error('يرجى اختيار ملف صورة (JPG أو PNG أو WebP)');
  }

  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
  if (!safeKey) throw new Error('معرف الصورة غير صالح');

  return postToHostinger(schoolMediaUploadEndpoint(), file, sanitizeImageName(file.name), {
    kind,
    key: safeKey,
  });
}
