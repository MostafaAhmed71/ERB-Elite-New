import { supabase } from './supabase';
import { createUser, deleteUser } from './auth';
import { extractErrorMessage } from './errors';
import { syncManagedCredentialPassword } from './managedAccounts';

/** انتظر مدة قصيرة ريثما تُنفَّذ trigger قاعدة البيانات (handle_new_user) */
function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export type BulkStudentInput = {
  full_name: string;
  admission_number?: string;
  class_name?: string;
};

export type BulkAccountResultRow = {
  student_name: string;
  admission_number: string;
  class_name?: string;
  student_email: string;
  student_password: string;
  parent_email: string;
  parent_password: string;
  success: boolean;
  error?: string;
  /** IDs محفوظة مباشرةً بدل البحث بالإيميل في public.users — تحل مشكلة async trigger */
  student_user_id?: string;
  parent_user_id?: string;
};

export type BulkCreateClassAccountsParams = {
  grade: string;
  class_name: string;
  students: BulkStudentInput[];
  email_domain?: string;
  academic_year?: string;
};

export type BulkCreateClassAccountsResponse = {
  results: BulkAccountResultRow[];
  success_count: number;
  failed_count: number;
};

const TEMP_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateTempPassword(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += TEMP_CHARS[Math.floor(Math.random() * TEMP_CHARS.length)];
  }
  return `ESP-${code}`;
}

function sanitizeAdmission(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '');
}

export function buildAccountEmails(admission: string, domain: string) {
  const slug = sanitizeAdmission(admission) || `id${Date.now()}`;
  const cleanDomain = domain.trim().toLowerCase().replace(/^@/, '');
  return {
    student: `sa${slug}@${cleanDomain}`,
    parent: `p${slug}@${cleanDomain}`,
  };
}

/** يتحقق أن البريد يتبع الصيغة: saرقم@نطاق للطالب و pرقم@نطاق لولي الأمر */
export function isBulkAccountEmailFormatValid(studentEmail: string, parentEmail: string): boolean {
  const studentLocal = studentEmail.split('@')[0] ?? '';
  const parentLocal = parentEmail.split('@')[0] ?? '';
  return /^sa[a-z0-9]+$/i.test(studentLocal) && /^p[a-z0-9]+$/i.test(parentLocal);
}

/** كشف الصيغة القديمة جداً: إيميل الطالب لا يبدأ بـ s على الإطلاق */
function hasLegacyBulkEmailResults(results: BulkAccountResultRow[]): boolean {
  return results.some(
    (r) => r.success && r.student_email && !/^s[a-z0-9]+@/i.test(r.student_email)
  );
}

function generateAdmissionNumber(index: number, year: string): string {
  const suffix = String(index + 1).padStart(4, '0');
  return `${year}${suffix}${Math.floor(Math.random() * 90 + 10)}`;
}

type ExistingStudentRef = {
  admission_number: string;
  user_id: string | null;
};

function buildAdmissionLookup(rows: ExistingStudentRef[]) {
  const allAdmissions = new Set<string>();
  const withAccount = new Set<string>();

  for (const row of rows) {
    const admission = String(row.admission_number ?? '').trim();
    if (!admission) continue;
    allAdmissions.add(admission);
    if (row.user_id) withAccount.add(admission);
  }

  return { allAdmissions, withAccount };
}

function shouldUseCreateUserFallback(error: unknown, data: unknown): boolean {
  const msg = [
    error instanceof Error ? error.message : String(error ?? ''),
    typeof data === 'object' && data !== null && 'error' in data
      ? String((data as { error: unknown }).error)
      : '',
  ]
    .join(' ')
    .toLowerCase();

  return (
    /failed to fetch|networkerror|load failed|network request failed|failed to send a request|functionsfetcherror|edge function|function not found|err_connection|enotfound|timeout|aborted|cors/i.test(
      msg
    ) || msg.includes('404')
  );
}

async function invokeBulkEdgeFunction(
  _params: BulkCreateClassAccountsParams
): Promise<BulkCreateClassAccountsResponse | null> {
  // Edge function على الخادم تستخدم بادئة s القديمة — نتجاوزها ونستخدم الـ fallback
  // الذي يولّد sa prefix صحيح. أعد نشر العملية على Supabase لتفعيلها مجدداً.
  console.info('bulk-create-class-accounts: bypassed — using create-user fallback (sa prefix)');
  return null;
}

async function bulkCreateViaCreateUser(
  params: BulkCreateClassAccountsParams
): Promise<BulkCreateClassAccountsResponse> {
  const domain = params.email_domain?.trim() || 'elite.com';
  const year = params.academic_year ?? new Date().getFullYear().toString();
  const results: BulkAccountResultRow[] = [];
  const usedInBatch = new Set<string>();

  const { data: existingStudents } = await supabase
    .from('students')
    .select('admission_number, user_id');
  const { allAdmissions, withAccount } = buildAdmissionLookup(
    (existingStudents ?? []) as ExistingStudentRef[]
  );

  for (let i = 0; i < params.students.length; i++) {
    const input = params.students[i];
    const studentName = String(input.full_name ?? '').trim();
    const studentClass = input.class_name || params.class_name;

    if (!studentName) {
      results.push(emptyResultRow('', 'اسم الطالب مطلوب', '', studentClass));
      continue;
    }

    let admission = String(input.admission_number ?? '').trim();
    if (!admission) {
      do {
        admission = generateAdmissionNumber(i, year);
      } while (allAdmissions.has(admission) || usedInBatch.has(admission));
    }

    if (withAccount.has(admission)) {
      // نتجاوز فقط إذا كان الطالب مرتبطاً بحساب فعلاً — لا نمنع التوليد للحسابات المُلغاة
      results.push(emptyResultRow(studentName, 'الطالب لديه حساب مرتبط مسبقاً — احذف الحساب القديم أولاً', admission, studentClass));
      continue;
    }

    if (usedInBatch.has(admission)) {
      results.push(emptyResultRow(studentName, 'رقم القيد مكرر في القائمة', admission, studentClass));
      continue;
    }

    let parentId: string | null = null;
    let studentUserId: string | null = null;

    const { student: studentEmail, parent: parentEmail } = buildAccountEmails(admission, domain);
    const studentPassword = generateTempPassword();
    const parentPassword = generateTempPassword();

    try {
      // 1) إنشاء حساب ولي الأمر
      parentId = await createUser({
        email: parentEmail,
        password: parentPassword,
        full_name: `ولي أمر ${studentName}`,
        role: 'parent',
        is_first_login: true,
      });

      // انتظار بسيط ريثما تُنفَّذ trigger handle_new_user في قاعدة البيانات
      await sleep(400);

      // 2) إنشاء حساب الطالب
      studentUserId = await createUser({
        email: studentEmail,
        password: studentPassword,
        full_name: studentName,
        role: 'student',
        is_first_login: true,
      });

      await sleep(400);

      // 3) ربط الحسابات بسجل الطالب
      const { error: linkErr } = await supabase.rpc('link_bulk_student_account', {
        p_student_user_id: studentUserId,
        p_parent_id: parentId,
        p_admission_number: admission,
        p_full_name: studentName,
        p_grade: params.grade,
        p_class_name: studentClass,
        p_academic_year: year,
      });

      if (linkErr) {
        // مسار بديل إذا لم تُنفَّذ migration بعد
        const { error: studentRowErr } = await supabase.from('students').upsert(
          {
            user_id: studentUserId,
            parent_id: parentId,
            admission_number: admission,
            full_name: studentName,
            grade: params.grade,
            class_name: studentClass,
            academic_year: year,
            is_active: true,
          },
          { onConflict: 'admission_number' }
        );
        if (studentRowErr) {
          // تراجع: حذف كلا الحسابين
          if (studentUserId) await safeDeleteUser(studentUserId);
          await safeDeleteUser(parentId);
          throw linkErr;
        }
      }

      usedInBatch.add(admission);
      allAdmissions.add(admission);
      results.push({
        student_name: studentName,
        admission_number: admission,
        class_name: studentClass,
        student_email: studentEmail,
        student_password: studentPassword,
        parent_email: parentEmail,
        parent_password: parentPassword,
        success: true,
        student_user_id: studentUserId ?? undefined,
        parent_user_id: parentId ?? undefined,
      });
    } catch (err) {
      // تراجع: حذف الحسابات التي أُنشئت
      if (studentUserId) await safeDeleteUser(studentUserId);
      if (parentId) await safeDeleteUser(parentId);
      results.push({
        student_name: studentName,
        admission_number: admission,
        class_name: studentClass,
        student_email: studentEmail,
        student_password: studentPassword,
        parent_email: parentEmail,
        parent_password: parentPassword,
        success: false,
        error: extractErrorMessage(err),
      });
    }
  }

  const success_count = results.filter((r) => r.success).length;
  return {
    results,
    success_count,
    failed_count: results.length - success_count,
  };
}

/** حذف مستخدم مع تجاهل الأخطاء (للتراجع) */
async function safeDeleteUser(userId: string): Promise<void> {
  try {
    await deleteUser(userId);
  } catch {
    console.warn('safeDeleteUser: تعذّر حذف المستخدم', userId);
  }
}

function emptyResultRow(name: string, error: string, admission = '', class_name = ''): BulkAccountResultRow {
  return {
    student_name: name,
    admission_number: admission,
    class_name,
    student_email: '',
    student_password: '',
    parent_email: '',
    parent_password: '',
    success: false,
    error,
  };
}

export async function bulkCreateClassAccounts(
  params: BulkCreateClassAccountsParams
): Promise<BulkCreateClassAccountsResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('يجب تسجيل الدخول أولاً');

  const edgeResult = await invokeBulkEdgeFunction(params);
  const response = edgeResult ?? (await bulkCreateViaCreateUser(params));

  if (response.success_count > 0) {
    await persistBulkCredentialsFromResults(
      response.results,
      params.grade,
      params.class_name
    );
  }

  return response;
}

async function persistBulkCredentialsFromResults(
  results: BulkAccountResultRow[],
  grade: string,
  class_name: string
): Promise<void> {
  const successful = results.filter((r) => r.success);
  if (successful.length === 0) return;

  // إذا تم تخزين user_ids في النتائج نستخدمها مباشرةً بدل البحث بالإيميل
  // هذا يحل مشكلة async trigger handle_new_user الذي قد لا يكتمل بعد وقت البحث
  const needsEmailLookup = successful.some((r) => !r.student_user_id);

  const byEmail = new Map<string, string>();
  if (needsEmailLookup) {
    const emails = successful.flatMap((r) => [r.student_email, r.parent_email].filter(Boolean));
    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('id, email')
      .in('email', emails);

    if (usersErr) {
      console.warn('persistBulkCredentialsFromResults users:', usersErr.message);
    }
    for (const u of users ?? []) {
      if (u.email) byEmail.set(u.email.toLowerCase(), u.id);
    }
  }

  const {
    data: { user: caller },
  } = await supabase.auth.getUser();

  const rows = successful.flatMap((r) => {
    // أولوية: استخدم الـ ID المحفوظ مباشرةً ، وإلا البحث بالإيميل
    const studentId = r.student_user_id ?? byEmail.get(r.student_email.toLowerCase());
    const parentId = r.parent_user_id ?? byEmail.get(r.parent_email.toLowerCase());
    const rowClass = r.class_name || class_name;
    const out: Array<Record<string, unknown>> = [];

    if (studentId) {
      out.push({
        user_id: studentId,
        admission_number: r.admission_number,
        account_type: 'student',
        student_name: r.student_name,
        grade,
        class_name: rowClass,
        email: r.student_email,
        display_password: r.student_password,
        password_changed_by_user: false,
        created_by: caller?.id ?? null,
        updated_at: new Date().toISOString(),
      });
    }

    if (parentId) {
      out.push({
        user_id: parentId,
        admission_number: r.admission_number,
        account_type: 'parent',
        student_name: r.student_name,
        grade,
        class_name: rowClass,
        email: r.parent_email,
        display_password: r.parent_password,
        password_changed_by_user: false,
        created_by: caller?.id ?? null,
        updated_at: new Date().toISOString(),
      });
    }

    return out;
  });

  if (rows.length === 0) {
    console.warn('persistBulkCredentialsFromResults: لا توجد صفوف للحفظ');
    return;
  }

  const { error } = await supabase
    .from('managed_account_credentials')
    .upsert(rows, { onConflict: 'user_id' });

  if (error) {
    console.warn('persistBulkCredentialsFromResults:', error.message);
  }
}

export async function completeFirstLogin(newPassword: string): Promise<void> {
  if (newPassword.length < 8) {
    throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  }

  const { error: authError } = await supabase.auth.updateUser({
    password: newPassword,
    data: { is_first_login: false },
  });
  if (authError) throw authError;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('لم يتم العثور على المستخدم');

  const { error: profileError } = await supabase
    .from('users')
    .update({ is_first_login: false })
    .eq('id', user.id);

  if (profileError) {
    console.warn('تعذّر تحديث is_first_login في قاعدة البيانات:', profileError.message);
  }

  await syncManagedCredentialPassword(newPassword);
}

// =============================================================
// حذف جميع الحسابات المولّدة دفعةً واحدة بحسب الفلتر
// =============================================================
export async function deleteAllBulkGeneratedAccounts(
  userIds: string[]
): Promise<{ deleted: number; failed: number }> {
  if (userIds.length === 0) return { deleted: 0, failed: 0 };

  let deleted = 0;
  let failed = 0;

  // حذف كل حساب من Auth
  for (const userId of userIds) {
    try {
      await safeDeleteUser(userId);
      deleted++;
    } catch {
      failed++;
    }
  }

  // حذف من managed_account_credentials
  await supabase
    .from('managed_account_credentials')
    .delete()
    .in('user_id', userIds);

  // إلغاء ربط سجلات الطلاب فقط (لا يحذف بيانات الطالب)
  await supabase
    .from('students')
    .update({ user_id: null, updated_at: new Date().toISOString() })
    .in('user_id', userIds);

  return { deleted, failed };
}

// =============================================================
// حذف حسابات طالب وولي أمره المولَّدة (حذف فردي)
// =============================================================
export type DeleteBulkAccountParams = {
  studentUserId: string;
  parentUserId?: string | null;
};

export async function deleteBulkGeneratedAccounts(params: DeleteBulkAccountParams): Promise<void> {
  const errors: string[] = [];

  await safeDeleteUser(params.studentUserId);

  if (params.parentUserId) {
    await safeDeleteUser(params.parentUserId);
  }

  const ids = [params.studentUserId, ...(params.parentUserId ? [params.parentUserId] : [])];
  const { error } = await supabase
    .from('managed_account_credentials')
    .delete()
    .in('user_id', ids);

  if (error) errors.push(error.message);

  await supabase
    .from('students')
    .update({ user_id: null, is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', params.studentUserId);

  if (errors.length > 0) throw new Error(errors.join(' | '));
}
