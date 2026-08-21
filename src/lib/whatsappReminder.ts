import { academicConfigService } from './academic/adminService';

export type WhatsAppSendResult = {
  ok: boolean;
  error?: string;
};

let cachedApiBase: string | null = null;

export function clearWhatsAppApiCache() {
  cachedApiBase = null;
}

export async function getWhatsAppApiBase(): Promise<string> {
  if (!cachedApiBase) {
    cachedApiBase = await academicConfigService.getWhatsAppApiUrl();
  }
  return cachedApiBase;
}

export function normalizePhoneDigits(phone: string): string {
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('05')) p = '966' + p.slice(1);
  else if (p.startsWith('5') && p.length === 9) p = '966' + p;
  return p;
}

export function buildHomeworkReminderMessage(teacherName: string, dateLabel: string): string {
  return (
    `السلام عليكم ${teacherName}،\n\n` +
    `تذكير من إدارة المدرسة:\n` +
    `يرجى إدخال *الواجب المنزلي* لتاريخ ${dateLabel} عبر تطبيق الشؤون الأكاديمية.\n\n` +
    `شكراً لتعاونكم 🌟`
  );
}

export function buildWeeklyPlanReminderMessage(teacherName: string, weekLabel: string): string {
  return (
    `السلام عليكم ${teacherName}،\n\n` +
    `تذكير من إدارة المدرسة:\n` +
    `يرجى إكمال *الخطة الأسبوعية* (${weekLabel}) من التطبيق في أقرب وقت.\n\n` +
    `شكراً لتعاونكم 🌟`
  );
}

export function buildObservationReminderMessage(teacherName: string, pendingCount: number): string {
  return (
    `السلام عليكم ${teacherName}،\n\n` +
    `تذكير من إدارة المدرسة:\n` +
    `يوجد *${pendingCount}* طلب ملاحظة من أولياء الأمور بانتظار إفادتكم في قسم *طلبات ملاحظات الطلاب*.\n\n` +
    `شكراً لتعاونكم 🌟`
  );
}

export function buildStudentObservationReminderMessage(
  teacherName: string,
  studentName: string,
  subject?: string | null,
): string {
  const subjectLine = subject?.trim() ? ` (مادة: *${subject.trim()}*)` : '';
  return (
    `السلام عليكم ${teacherName}،\n\n` +
    `تذكير من إدارة المدرسة:\n` +
    `يرجى إكمال *التقييم السلوكي والأكاديمي* للطالب *${studentName}*${subjectLine} ` +
    `من قسم *طلبات ملاحظات الطلاب* في التطبيق.\n\n` +
    `شكراً لتعاونكم 🌟`
  );
}

export type PrincipalReminderKind =
  | 'homework'
  | 'weekly_plan'
  | 'observation'
  | 'meeting'
  | 'exam'
  | 'attendance'
  | 'general'
  | 'custom';

export const PRINCIPAL_REMINDER_KINDS: {
  id: PrincipalReminderKind;
  label: string;
  description: string;
}[] = [
  { id: 'homework', label: 'واجب منزلي', description: 'تذكير بإدخال الواجب' },
  { id: 'weekly_plan', label: 'خطة أسبوعية', description: 'تذكير بإكمال الخطة' },
  { id: 'observation', label: 'ملاحظات أولياء الأمور', description: 'تذكير بطلبات الإفادات' },
  { id: 'meeting', label: 'اجتماع / لقاء', description: 'دعوة أو تذكير باجتماع' },
  { id: 'exam', label: 'اختبارات', description: 'تذكير باستعداد أو تسليم اختبار' },
  { id: 'attendance', label: 'حضور وغياب', description: 'تذكير بتسجيل الحضور' },
  { id: 'general', label: 'تذكير عام', description: 'نص جاهز مع اسم المعلم' },
  { id: 'custom', label: 'نص حر', description: 'اكتب أي رسالة — استخدم {name} للاسم' },
];

/** يستبدل {name} و{الاسم} باسم المستلم */
export function personalizeReminderMessage(template: string, teacherName: string): string {
  return template
    .split('{name}').join(teacherName)
    .split('{الاسم}').join(teacherName)
    .split('{NAME}').join(teacherName);
}

export function buildPrincipalReminderDraft(
  kind: PrincipalReminderKind,
  opts: {
    teacherName?: string;
    dateLabel?: string;
    weekLabel?: string;
    pendingCount?: number;
    customBody?: string;
    meetingDetails?: string;
    examDetails?: string;
  } = {},
): string {
  const name = opts.teacherName?.trim() || '{name}';
  const dateLabel = opts.dateLabel?.trim() || 'اليوم';
  const weekLabel = opts.weekLabel?.trim() || 'هذا الأسبوع';
  const pending = opts.pendingCount ?? 0;
  const meeting = opts.meetingDetails?.trim() || 'اجتماع هيئة التدريس';
  const exam = opts.examDetails?.trim() || 'الاختبارات القادمة';
  const custom = opts.customBody?.trim() || '';

  switch (kind) {
    case 'homework':
      return buildHomeworkReminderMessage(name, dateLabel);
    case 'weekly_plan':
      return buildWeeklyPlanReminderMessage(name, weekLabel);
    case 'observation':
      return buildObservationReminderMessage(name, pending || 1);
    case 'meeting':
      return (
        `السلام عليكم ${name}،\n\n` +
        `تذكير من إدارة المدرسة:\n` +
        `يُرجى الحضور إلى *${meeting}*.\n\n` +
        `شكراً لتعاونكم 🌟`
      );
    case 'exam':
      return (
        `السلام عليكم ${name}،\n\n` +
        `تذكير من إدارة المدرسة:\n` +
        `بخصوص *${exam}* — يُرجى استكمال المطلوب عبر التطبيق في أقرب وقت.\n\n` +
        `شكراً لتعاونكم 🌟`
      );
    case 'attendance':
      return (
        `السلام عليكم ${name}،\n\n` +
        `تذكير من إدارة المدرسة:\n` +
        `يرجى إدخال *سجل الحضور والغياب* لتاريخ ${dateLabel} عبر التطبيق.\n\n` +
        `شكراً لتعاونكم 🌟`
      );
    case 'general':
      return (
        `السلام عليكم ${name}،\n\n` +
        `تذكير من إدارة المدرسة:\n` +
        `${custom || 'يرجى متابعة المهام المطلوبة في التطبيق في أقرب وقت.'}\n\n` +
        `شكراً لتعاونكم 🌟`
      );
    case 'custom':
      return custom || `السلام عليكم ${name}،\n\n`;
    default:
      return custom;
  }
}

type ServerStatus = {
  connected: boolean;
  status: string;
  apiBase: string;
  supportsTextReminders: boolean;
  version?: number;
};

export async function fetchWhatsAppServerStatus(): Promise<ServerStatus> {
  const apiBase = await getWhatsAppApiBase();
  try {
    const res = await fetch(`${apiBase}/status`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      return { connected: false, status: 'error', apiBase, supportsTextReminders: false };
    }
    const data = (await res.json()) as {
      connected?: boolean;
      status?: string;
      version?: number;
      features?: string[];
    };
    const features = data.features ?? [];
    return {
      connected: !!data.connected,
      status: data.status ?? 'unknown',
      apiBase,
      version: data.version,
      supportsTextReminders: features.includes('send-text') || (data.version ?? 0) >= 2,
    };
  } catch {
    return { connected: false, status: 'offline', apiBase, supportsTextReminders: false };
  }
}

async function parseApiError(res: Response): Promise<string> {
  if (res.status === 404) {
    return (
      'خادم واتساب قديم — مسار /send-text غير موجود. ' +
      'ارفع الملف المحدّث إلى /opt/wppconnect/whatsapp-server.js على الـ VPS ثم أعد التشغيل (pm2 restart all)'
    );
  }
  try {
    const text = await res.text();
    try {
      const data = JSON.parse(text) as { error?: string };
      if (data.error) return humanizeWhatsAppError(data.error);
    } catch {
      if (text.includes('Cannot POST')) {
        return 'مسار الإرسال غير موجود على الخادم — حدّث whatsapp-server.js على VPS';
      }
    }
  } catch {
    /* ignore */
  }
  if (res.status === 503) return 'واتساب غير متصل — امسح رمز QR من صفحة الخادم';
  return `فشل الإرسال (${res.status})`;
}

function humanizeWhatsAppError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('detached frame') || lower.includes('انقطعت جلسة')) {
    return 'انقطعت جلسة واتساب على الخادم — أعد المحاولة بعد دقيقة أو امسح QR من wpp.northelite0.com/qr';
  }
  if (lower.includes('no lid for user')) {
    return 'الرقم غير مسجّل على واتساب أو بصيغة خاطئة';
  }
  // خطأ وهمي شائع: الرسالة وصلت ثم فشل wppconnect في قراءة تأكيد الإرسال
  if (
    /wapi\.js/i.test(msg)
    || /object\.e\s*\(/i.test(msg)
    || /message .+ not found/i.test(msg)
    || /getmessagebyid/i.test(lower)
  ) {
    return 'أُرسلت الرسالة بنجاح (تحذير تقني من واتساب يمكن تجاهله)';
  }
  return msg;
}

/** هل الخطأ يعني أن الرسالة غالباً وصلت رغم ظهور استثناء؟ */
export function isWhatsAppSoftDeliveryError(msg: string): boolean {
  return (
    /wapi\.js/i.test(msg)
    || /object\.e\s*\(/i.test(msg)
    || /message .+ not found/i.test(msg)
    || /تحذير تقني/i.test(msg)
    || /أُرسلت الرسالة/i.test(msg)
  );
}

export async function assertWhatsAppServerReady(): Promise<string> {
  const status = await fetchWhatsAppServerStatus();
  if (status.status === 'offline') {
    throw new Error(
      `تعذّر الاتصال بخادم واتساب على ${status.apiBase}. تحقق من العنوان في الإعدادات الأكاديمية`,
    );
  }
  if (!status.connected) {
    throw new Error(`واتساب غير متصل بعد — افتح ${status.apiBase}/qr وامسح رمز الربط`);
  }
  if (!status.supportsTextReminders) {
    throw new Error(
      'خادم واتساب يحتاج تحديثاً لدعم التذكيرات النصية. نفّذ deploy-whatsapp-vps.ps1 أو ارفع الملف يدوياً إلى /opt/wppconnect/whatsapp-server.js',
    );
  }
  return status.apiBase;
}

export async function sendWhatsAppText(phone: string, message: string): Promise<WhatsAppSendResult> {
  const apiBase = await assertWhatsAppServerReady();

  const res = await fetch(`${apiBase}/send-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const error = await parseApiError(res);
    // بعض إصدارات الخادم تُرجع 500 رغم وصول الرسالة
    if (isWhatsAppSoftDeliveryError(error)) {
      return { ok: true, error };
    }
    return { ok: false, error };
  }

  return { ok: true };
}

export async function sendBulkWhatsAppTexts(
  items: { phone: string; message: string }[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ sent: number; failed: number; errors: string[] }> {
  if (items.length === 0) return { sent: 0, failed: 0, errors: [] };

  const apiBase = await assertWhatsAppServerReady();

  const res = await fetch(`${apiBase}/send-bulk-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: items }),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  const data = (await res.json()) as {
    sent?: number;
    failed?: number;
    report?: { phone?: string; status?: string; reason?: string; softOk?: boolean }[];
  };
  let sent = data.sent ?? 0;
  let failed = data.failed ?? 0;
  const errors: string[] = [];
  for (const r of data.report ?? []) {
    if (r.status === 'sent') continue;
    const reason = r.reason ?? r.status ?? 'فشل';
    if (isWhatsAppSoftDeliveryError(reason)) {
      sent += 1;
      failed = Math.max(0, failed - 1);
      continue;
    }
    errors.push(`${r.phone ?? '?'}: ${humanizeWhatsAppError(reason)}`);
  }
  onProgress?.(items.length, items.length);
  return { sent, failed: errors.length, errors };
}
