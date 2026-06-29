import { supabase } from './supabase';
import { createUser, deleteUser } from './auth';
import { extractErrorMessage } from './errors';
import { syncManagedCredentialPassword } from './managedAccounts';

export type BulkStudentInput = {
  full_name: string;
  admission_number?: string;
};

export type BulkAccountResultRow = {
  student_name: string;
  admission_number: string;
  student_email: string;
  student_password: string;
  parent_email: string;
  parent_password: string;
  success: boolean;
  error?: string;
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
    student: `s${slug}@${cleanDomain}`,
    parent: `p${slug}@${cleanDomain}`,
  };
}

/** يتحقق أن البريد يتبع الصيغة: sرقم@نطاق للطالب و pرقم@نطاق لولي الأمر */
export function isBulkAccountEmailFormatValid(studentEmail: string, parentEmail: string): boolean {
  const studentLocal = studentEmail.split('@')[0] ?? '';
  const parentLocal = parentEmail.split('@')[0] ?? '';
  return /^s[a-z0-9]+$/i.test(studentLocal) && /^p[a-z0-9]+$/i.test(parentLocal);
}

function hasLegacyBulkEmailResults(results: BulkAccountResultRow[]): boolean {
  return results.some(
    (r) => r.success && r.student_email && !isBulkAccountEmailFormatValid(r.student_email, r.parent_email)
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
  params: BulkCreateClassAccountsParams
): Promise<BulkCreateClassAccountsResponse | null> {
  try {
    const { data, error } = await supabase.functions.invoke('bulk-create-class-accounts', {
      body: params,
    });

    if (!error && data && !data.error) {
      const response = data as BulkCreateClassAccountsResponse;
      if (hasLegacyBulkEmailResults(response.results ?? [])) {
        if (response.success_count > 0) {
          throw new Error(
            'الخادم أنشأ حسابات بصيغة بريد قديمة (بدون حرف s). احذف هذه الحسابات من Supabase → Authentication ثم أعد التوليد.'
          );
        }
        console.warn('bulk-create-class-accounts returned legacy email format, using create-user fallback');
        return null;
      }
      return response;
    }

    if (shouldUseCreateUserFallback(error, data)) {
      console.warn('bulk-create-class-accounts unavailable, using create-user fallback');
      return null;
    }

    if (data?.error) throw new Error(extractErrorMessage(data.error));
    if (error) throw new Error(extractErrorMessage(error.message));
  } catch (err) {
    if (shouldUseCreateUserFallback(err, null)) {
      console.warn('bulk-create-class-accounts invoke failed, using create-user fallback', err);
      return null;
    }
    throw err;
  }

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

    if (!studentName) {
      results.push(emptyResultRow('', 'اسم الطالب مطلوب'));
      continue;
    }

    let admission = String(input.admission_number ?? '').trim();
    if (!admission) {
      do {
        admission = generateAdmissionNumber(i, year);
      } while (allAdmissions.has(admission) || usedInBatch.has(admission));
    }

    if (withAccount.has(admission)) {
      results.push(emptyResultRow(studentName, 'الطالب لديه حساب مسبقاً', admission));
      continue;
    }

    if (usedInBatch.has(admission)) {
      results.push(emptyResultRow(studentName, 'رقم القيد مكرر في القائمة', admission));
      continue;
    }

    const { student: studentEmail, parent: parentEmail } = buildAccountEmails(admission, domain);
    const studentPassword = generateTempPassword();
    const parentPassword = generateTempPassword();

    let parentId: string | null = null;

    try {
      parentId = await createUser({
        email: parentEmail,
        password: parentPassword,
        full_name: `ولي أمر ${studentName}`,
        role: 'parent',
        is_first_login: true,
      });

      const studentUserId = await createUser({
        email: studentEmail,
        password: studentPassword,
        full_name: studentName,
        role: 'student',
        is_first_login: true,
      });

      const { error: linkErr } = await supabase.rpc('link_bulk_student_account', {
        p_student_user_id: studentUserId,
        p_parent_id: parentId,
        p_admission_number: admission,
        p_full_name: studentName,
        p_grade: params.grade,
        p_class_name: params.class_name,
        p_academic_year: year,
      });

      if (linkErr) {
        // مسار بديل إذا لم تُنفَّذ migration 035 بعد
        const { error: studentRowErr } = await supabase.from('students').upsert(
          {
            user_id: studentUserId,
            parent_id: parentId,
            admission_number: admission,
            full_name: studentName,
            grade: params.grade,
            class_name: params.class_name,
            academic_year: year,
            is_active: true,
          },
          { onConflict: 'admission_number' }
        );
        if (studentRowErr) {
          await deleteUser(studentUserId);
          await deleteUser(parentId);
          throw linkErr;
        }
      }

      usedInBatch.add(admission);
      allAdmissions.add(admission);
      results.push({
        student_name: studentName,
        admission_number: admission,
        student_email: studentEmail,
        student_password: studentPassword,
        parent_email: parentEmail,
        parent_password: parentPassword,
        success: true,
      });
    } catch (err) {
      if (parentId) {
        try {
          await deleteUser(parentId);
        } catch {
          // ignore rollback failure
        }
      }
      results.push({
        student_name: studentName,
        admission_number: admission,
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

function emptyResultRow(name: string, error: string, admission = ''): BulkAccountResultRow {
  return {
    student_name: name,
    admission_number: admission,
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

  const emails = successful.flatMap((r) => [r.student_email, r.parent_email].filter(Boolean));
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, email')
    .in('email', emails);

  if (usersErr) {
    console.warn('persistBulkCredentialsFromResults users:', usersErr.message);
    return;
  }

  const byEmail = new Map<string, string>();
  for (const u of users ?? []) {
    if (u.email) byEmail.set(u.email.toLowerCase(), u.id);
  }

  const {
    data: { user: caller },
  } = await supabase.auth.getUser();

  const rows = successful.flatMap((r) => {
    const studentId = byEmail.get(r.student_email.toLowerCase());
    const parentId = byEmail.get(r.parent_email.toLowerCase());
    const out: Array<Record<string, unknown>> = [];

    if (studentId) {
      out.push({
        user_id: studentId,
        admission_number: r.admission_number,
        account_type: 'student',
        student_name: r.student_name,
        grade,
        class_name,
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
        class_name,
        email: r.parent_email,
        display_password: r.parent_password,
        password_changed_by_user: false,
        created_by: caller?.id ?? null,
        updated_at: new Date().toISOString(),
      });
    }

    return out;
  });

  if (rows.length === 0) return;

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
