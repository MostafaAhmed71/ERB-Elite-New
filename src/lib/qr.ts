export type ParsedStudentQR = {
  studentId?: string;
  qrToken?: string;
};

export const DEFAULT_PRODUCTION_DOMAIN = 'https://northelite.tech';
export const ALTERNATE_VERCEL_DOMAIN = 'https://erp-elite.vercel.app';

/**
 * يسترجع دومين المنصة الصالح لروابط الـ QR:
 * يُمنع منعاً باتاً وضع localhost أو 127.0.0.1 لأن الهواتف لا تستطيع الوصول إليها عند مسح الكود
 */
export function getBaseAppUrl(): string {
  if (typeof window !== 'undefined') {
    const savedDomain = localStorage.getItem('erb_qr_domain')?.trim();
    if (savedDomain && !savedDomain.includes('localhost') && !savedDomain.includes('127.0.0.1')) {
      return savedDomain.replace(/\/$/, '');
    }
  }

  const envUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.trim();
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.trim();
    if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return origin.replace(/\/$/, '');
    }
  }

  return DEFAULT_PRODUCTION_DOMAIN;
}

export function getStudentQRUrl(studentId: string, qrToken?: string | null, customBaseUrl?: string): string {
  const appUrl = (customBaseUrl || getBaseAppUrl()).replace(/\/$/, '');
  if (qrToken) return `${appUrl}/card/t/${qrToken}`;
  return `${appUrl}/card/${studentId}`;
}

/** يستخرج معرّف الطالب أو رمز QR من رابط البطاقة */
export function parseStudentQRPayload(raw: string): ParsedStudentQR | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const cardIndex = pathParts.indexOf('card');
    if (cardIndex === -1) return null;

    const next = pathParts[cardIndex + 1];
    const after = pathParts[cardIndex + 2];
    if (next === 't' && after) {
      return { qrToken: decodeURIComponent(after) };
    }
    if (next && next !== 't') {
      return { studentId: decodeURIComponent(next) };
    }
    return null;
  } catch {
    // ليس URL — ربما رمز أو UUID مباشر
  }

  const uuidMatch = trimmed.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  );
  if (uuidMatch) return { studentId: uuidMatch[0] };

  // رمز QR خام (hex)
  if (/^[a-f0-9]{16,64}$/i.test(trimmed)) {
    return { qrToken: trimmed };
  }

  return null;
}

/** توافق: يعيد studentId فقط إن وُجد في الرابط (بدون مسار /card/t/) */
export function parseStudentQRUrl(url: string): string | null {
  const parsed = parseStudentQRPayload(url);
  return parsed?.studentId ?? null;
}
