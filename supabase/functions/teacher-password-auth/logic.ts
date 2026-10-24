export type Teacher = { id: string; email: string | null; phone: string | null };
export type Setup = { password_configured_at: string | null; claim_expires_at: string | null };
export type Tokens = { access_token: string; refresh_token: string };
export interface Dependencies {
  sharedCodeHash?: string;
  claimSharedCode?(id: string, claim: string, now: string, until: string): Promise<boolean>;
  authorizedAdmin(): Promise<string | null>;
  findTeachers(phone: string): Promise<Teacher[]>;
  getTeacher(id: string): Promise<Teacher | null>;
  getSetup(id: string): Promise<Setup | null>;
  issueCode(id: string, hash: string, expires: string, adminId: string, now: string): Promise<boolean>;
  claimCode(id: string, hash: string, claim: string, now: string, until: string): Promise<boolean>;
  releaseClaim(id: string, claim: string): Promise<void>;
  finishSetup(id: string, claim: string, now: string): Promise<boolean>;
  setPassword(id: string, password: string): Promise<void>;
  signIn(teacher: Teacher, password: string): Promise<Tokens | null>;
  rateLimit(phone: string, action: string): Promise<boolean>;
  now(): Date;
}
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[٠-٩۰-۹]/g, c => String(c.charCodeAt(0) - (c >= '۰' ? 0x6f0 : 0x660))).replace(/\D/g, '');
  if (/^05\d{8}$/.test(digits)) return `966${digits.slice(1)}`;
  if (/^5\d{8}$/.test(digits)) return `966${digits}`;
  return digits;
}
export async function codeHash(userId: string, code: string): Promise<string> {
  const normalized = code.replace(/[\s-]/g, '').toUpperCase();
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${userId}:${normalized}`));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function activationCode(): string {
  const raw = [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return raw.match(/.{6}/g)!.join('-');
}
const invalid = { status: 401, body: { error: 'رقم الجوال أو كلمة المرور غير صحيحة' } };
export async function handleTeacherPassword(body: Record<string, unknown>, deps: Dependencies) {
  const action = body.action;
  if (!['check', 'login', 'setup', 'issue_code'].includes(String(action))) {
    return { status: 400, body: { error: 'طلب غير صالح' } };
  }
  if (action === 'issue_code') {
    const adminId = await deps.authorizedAdmin();
    if (!adminId) return { status: 403, body: { error: 'غير مصرح بإصدار كود التفعيل' } };
    if (deps.sharedCodeHash) return { status: 409, body: { error: 'التفعيل يستخدم الكود الموحّد؛ لا حاجة لإصدار كود لكل معلم' } };
    if (typeof body.user_id !== 'string') return { status: 400, body: { error: 'اختر المعلم' } };
    const teacher = await deps.getTeacher(body.user_id);
    if (!teacher?.phone) return { status: 400, body: { error: 'أضف رقم جوال المعلم إلى حسابه أولاً' } };
    if (!/^[1-9]\d{9,14}$/.test(normalizePhone(teacher.phone))) return { status: 400, body: { error: 'صحّح رقم جوال المعلم قبل إصدار كود التفعيل' } };
    const matches = await deps.findTeachers(normalizePhone(teacher.phone));
    if (matches.length !== 1 || matches[0].id !== teacher.id) return { status: 409, body: { error: 'رقم الجوال مرتبط بأكثر من معلم؛ صحّح بيانات الحسابات أولاً' } };
    const setup = await deps.getSetup(teacher.id);
    const now = deps.now();
    if (setup?.password_configured_at) return { status: 409, body: { error: 'سبق للمعلم إعداد كلمة المرور؛ لا يمكن تفعيل الإعداد مرة أخرى' } };
    if (setup?.claim_expires_at && new Date(setup.claim_expires_at) > now) return { status: 409, body: { error: 'إعداد كلمة المرور جارٍ الآن؛ حاول لاحقاً' } };
    const code = activationCode();
    const expires = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
    if (!await deps.issueCode(teacher.id, await codeHash(teacher.id, code), expires, adminId, now.toISOString())) {
      return { status: 409, body: { error: 'تعذر إصدار الكود؛ حدّث الصفحة وحاول مجدداً' } };
    }
    return { status: 200, body: { code, expires_at: expires } };
  }
  if (typeof body.phone !== 'string') return { status: 400, body: { error: 'أدخل رقم الجوال' } };
  const phone = normalizePhone(body.phone);
  if (!/^[1-9]\d{9,14}$/.test(phone)) return { status: 400, body: { error: 'أدخل رقم جوال صحيحاً' } };
  if (!await deps.rateLimit(phone, String(action))) return { status: 429, body: { error: 'محاولات كثيرة؛ انتظر قليلاً ثم حاول مجدداً' } };
  const teachers = await deps.findTeachers(phone);
  if (teachers.length !== 1) return action === 'login' ? invalid : { status: 404, body: { error: 'تعذر العثور على حساب معلم نشط بهذا الرقم؛ تواصل مع إدارة المدرسة' } };
  const teacher = teachers[0];
  const setup = await deps.getSetup(teacher.id);
  if (action === 'check') return { status: 200, body: { state: setup?.password_configured_at ? 'password' : 'setup' } };
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password || password.length > 1024) return { status: 400, body: { error: 'أدخل كلمة مرور صحيحة' } };
  if (action === 'login') {
    if (!setup?.password_configured_at) return { status: 409, body: { error: 'أعدّ كلمة المرور أولاً باستخدام كود التفعيل الذي تسلّمته من الإدارة' } };
    const session = await deps.signIn(teacher, password);
    return session ? { status: 200, body: { session } } : invalid;
  }
  if (setup?.password_configured_at) return { status: 409, body: { error: 'سبق إعداد كلمة المرور؛ استخدم تسجيل الدخول' } };
  if (password.length < 8) return { status: 400, body: { error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' } };
  const code = typeof body.code === 'string' ? body.code.replace(/[\s-]/g, '').toUpperCase() : '';
  if (!code || code.length > 64) return { status: 400, body: { error: 'أدخل كود التفعيل' } };
  if (deps.sharedCodeHash && await codeHash('shared-teacher-activation', code) !== deps.sharedCodeHash) {
    return { status: 401, body: { error: 'كود التفعيل غير صحيح' } };
  }
  if (!deps.sharedCodeHash && !/^[A-F0-9]{24}$/.test(code)) return { status: 400, body: { error: 'أدخل كود التفعيل الذي تسلّمته من الإدارة' } };
  const claim = crypto.randomUUID();
  const now = deps.now();
  const until = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const claimed = deps.sharedCodeHash
    ? await deps.claimSharedCode?.(teacher.id, claim, now.toISOString(), until)
    : await deps.claimCode(teacher.id, await codeHash(teacher.id, code), claim, now.toISOString(), until);
  if (!claimed) {
    return { status: 401, body: { error: 'كود التفعيل غير صحيح أو منتهي أو مستخدم؛ تواصل مع الإدارة' } };
  }
  try {
    await deps.setPassword(teacher.id, password);
    if (!await deps.finishSetup(teacher.id, claim, deps.now().toISOString())) throw new Error('Setup completion failed');
  } catch {
    await deps.releaseClaim(teacher.id, claim);
    return { status: 503, body: { error: 'تعذر حفظ كلمة المرور؛ حاول مجدداً' } };
  }
  return { status: 200, body: { ok: true, state: 'password' } };
}
