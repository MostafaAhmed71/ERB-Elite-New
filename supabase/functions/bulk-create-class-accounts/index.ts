// Supabase Edge Function: bulk-create-class-accounts
// Creates student + parent auth accounts for a class using service_role.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_ROLES = ['principal', 'admin', 'activity_leader'] as const;

type StudentInput = {
  full_name: string;
  admission_number?: string;
};

type CreatedAccountRow = {
  student_name: string;
  admission_number: string;
  student_email: string;
  student_password: string;
  parent_email: string;
  parent_password: string;
  success: boolean;
  error?: string;
};

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ESP-${code}`;
}

function sanitizeAdmission(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '');
}

function buildEmails(admission: string, domain: string) {
  const slug = sanitizeAdmission(admission) || `id${Date.now()}`;
  return {
    student: `s${slug}@${domain}`,
    parent: `p${slug}@${domain}`,
  };
}

function generateAdmissionNumber(index: number, year: string): string {
  const suffix = String(index + 1).padStart(4, '0');
  return `${year}${suffix}${Math.floor(Math.random() * 90 + 10)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (!caller) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (!callerProfile?.role || !ALLOWED_ROLES.includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'غير مصرح: فقط مدير المدرسة أو رائد النشاط يمكنه توليد الحسابات' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const {
      grade,
      class_name,
      students,
      email_domain = 'elite.com',
      academic_year,
    } = body as {
      grade: string;
      class_name: string;
      students: StudentInput[];
      email_domain?: string;
      academic_year?: string;
    };

    if (!grade || !class_name || !Array.isArray(students) || students.length === 0) {
      return new Response(
        JSON.stringify({ error: 'الحقول المطلوبة: grade, class_name, students[]' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (students.length > 100) {
      return new Response(
        JSON.stringify({ error: 'الحد الأقصى 100 طالب في الدفعة الواحدة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const domain = String(email_domain).trim().toLowerCase().replace(/^@/, '');
    const year = academic_year ?? new Date().getFullYear().toString();
    const results: CreatedAccountRow[] = [];
    const usedInBatch = new Set<string>();

    const { data: existingStudents } = await supabaseAdmin
      .from('students')
      .select('admission_number, user_id');

    const allAdmissions = new Set<string>();
    const withAccount = new Set<string>();
    for (const row of existingStudents ?? []) {
      const admission = String(row.admission_number ?? '').trim();
      if (!admission) continue;
      allAdmissions.add(admission);
      if (row.user_id) withAccount.add(admission);
    }

    for (let i = 0; i < students.length; i++) {
      const input = students[i];
      const studentName = String(input.full_name ?? '').trim();

      if (!studentName) {
        results.push({
          student_name: '',
          admission_number: '',
          student_email: '',
          student_password: '',
          parent_email: '',
          parent_password: '',
          success: false,
          error: 'اسم الطالب مطلوب',
        });
        continue;
      }

      let admission = String(input.admission_number ?? '').trim();
      if (!admission) {
        do {
          admission = generateAdmissionNumber(i, year);
        } while (allAdmissions.has(admission) || usedInBatch.has(admission));
      }

      if (withAccount.has(admission)) {
        results.push({
          student_name: studentName,
          admission_number: admission,
          student_email: '',
          student_password: '',
          parent_email: '',
          parent_password: '',
          success: false,
          error: 'الطالب لديه حساب مسبقاً',
        });
        continue;
      }

      if (usedInBatch.has(admission)) {
        results.push({
          student_name: studentName,
          admission_number: admission,
          student_email: '',
          student_password: '',
          parent_email: '',
          parent_password: '',
          success: false,
          error: 'رقم القيد مكرر في القائمة',
        });
        continue;
      }

      const { student: studentEmail, parent: parentEmail } = buildEmails(admission, domain);
      const studentPassword = generateTempPassword();
      const parentPassword = generateTempPassword();
      const parentName = `ولي أمر ${studentName}`;

      try {
        const { data: parentAuth, error: parentErr } = await supabaseAdmin.auth.admin.createUser({
          email: parentEmail,
          password: parentPassword,
          email_confirm: true,
          user_metadata: {
            full_name: parentName,
            role: 'parent',
            is_first_login: true,
            onboarding_completed: true,
          },
        });

        if (parentErr) throw parentErr;
        const parentId = parentAuth.user.id;

        await supabaseAdmin
          .from('users')
          .update({ is_first_login: true, onboarding_completed: true })
          .eq('id', parentId)
          .then(({ error }) => {
            if (error) console.warn('parent profile flags update skipped:', error.message);
          });

        const { data: studentAuth, error: studentErr } = await supabaseAdmin.auth.admin.createUser({
          email: studentEmail,
          password: studentPassword,
          email_confirm: true,
          user_metadata: {
            full_name: studentName,
            role: 'student',
            is_first_login: true,
            onboarding_completed: true,
          },
        });

        if (studentErr) {
          await supabaseAdmin.auth.admin.deleteUser(parentId);
          throw studentErr;
        }

        const studentUserId = studentAuth.user.id;

        await supabaseAdmin
          .from('users')
          .update({ is_first_login: true, onboarding_completed: true })
          .eq('id', studentUserId)
          .then(({ error }) => {
            if (error) console.warn('student profile flags update skipped:', error.message);
          });

        const { error: studentRowErr } = await supabaseAdmin.from('students').upsert(
          {
            user_id: studentUserId,
            parent_id: parentId,
            admission_number: admission,
            full_name: studentName,
            grade,
            class_name,
            academic_year: year,
            is_active: true,
          },
          { onConflict: 'admission_number' }
        );

        if (studentRowErr) {
          await supabaseAdmin.auth.admin.deleteUser(studentUserId);
          await supabaseAdmin.auth.admin.deleteUser(parentId);
          throw studentRowErr;
        }

        await supabaseAdmin
          .from('managed_account_credentials')
          .upsert(
            [
              {
                user_id: studentUserId,
                admission_number: admission,
                account_type: 'student',
                student_name: studentName,
                grade,
                class_name,
                email: studentEmail,
                display_password: studentPassword,
                password_changed_by_user: false,
                created_by: caller.id,
              },
              {
                user_id: parentId,
                admission_number: admission,
                account_type: 'parent',
                student_name: studentName,
                grade,
                class_name,
                email: parentEmail,
                display_password: parentPassword,
                password_changed_by_user: false,
                created_by: caller.id,
              },
            ],
            { onConflict: 'user_id' }
          )
          .then(({ error }) => {
            if (error) console.warn('managed_account_credentials upsert:', error.message);
          });

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
        const message = err instanceof Error ? err.message : 'فشل إنشاء الحساب';
        results.push({
          student_name: studentName,
          admission_number: admission,
          student_email: studentEmail,
          student_password: studentPassword,
          parent_email: parentEmail,
          parent_password: parentPassword,
          success: false,
          error: message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: caller.id,
      action: 'BULK_CLASS_ACCOUNTS_CREATED',
      entity: 'students',
      metadata: {
        grade,
        class_name,
        total: students.length,
        success: successCount,
        failed: students.length - successCount,
        email_domain: domain,
      },
    });

    return new Response(
      JSON.stringify({ results, success_count: successCount, failed_count: students.length - successCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
