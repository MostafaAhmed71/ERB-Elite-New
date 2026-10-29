import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleTeacherPassword, type Dependencies, type Teacher, codeHash } from './logic.ts';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const administratorRoles = ['principal', 'admin', 'activity_leader', 'platform_developer'];
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'طلب غير صالح' }), { status: 405, headers });
  try {
    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!url || !serviceKey || !anonKey) throw new Error('Missing server configuration');
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const passwordClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const bearer = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    const { data: sharedCodeRow } = await admin
      .from('academic_config')
      .select('value')
      .eq('key', 'teacher_password_activation_code')
      .maybeSingle();
    const sharedCodeRaw = typeof sharedCodeRow?.value === 'string'
      ? sharedCodeRow.value.replace(/^"|"$/g, '').trim()
      : '';
    const sharedCodeHash = sharedCodeRaw
      ? await codeHash('shared-teacher-activation', sharedCodeRaw)
      : Deno.env.get('TEACHER_SHARED_ACTIVATION_HASH')?.trim();

    const deps: Dependencies = {
      sharedCodeHash,
      async claimSharedCode(id, claim, now, until) {
        const { error: insertError } = await admin.from('teacher_password_setup').upsert({ user_id: id }, { onConflict: 'user_id', ignoreDuplicates: true });
        if (insertError) throw insertError;
        const { data, error } = await admin.from('teacher_password_setup').update({ claim_id: claim, claim_expires_at: until })
          .eq('user_id', id).is('password_configured_at', null)
          .or(`claim_expires_at.is.null,claim_expires_at.lt.${now}`).select('user_id');
        if (error) throw error;
        return data?.length === 1;
      },
      now: () => new Date(),
      async authorizedAdmin() {
        if (!bearer) return null;
        const { data, error } = await admin.auth.getUser(bearer);
        if (error || !data.user) return null;
        const { data: profile, error: profileError } = await admin.from('users').select('role,is_active').eq('id', data.user.id).single();
        return !profileError && profile?.is_active && administratorRoles.includes(profile.role) ? data.user.id : null;
      },
      async findTeachers(phone) {
        const { data, error } = await admin.rpc('resolve_teacher_login_phone', { p_phone: phone });
        if (error) throw error;
        return (data ?? []) as Teacher[];
      },
      async getTeacher(id) {
        const { data, error } = await admin.from('users').select('id,email,phone').eq('id', id).eq('role', 'teacher').eq('is_active', true).maybeSingle();
        if (error) throw error;
        return data;
      },
      async getSetup(id) {
        const { data, error } = await admin.from('teacher_password_setup').select('password_configured_at,claim_expires_at').eq('user_id', id).maybeSingle();
        if (error) throw error;
        return data;
      },
      async issueCode(id, hash, expires, adminId, now) {
        // Insert once, then conditional update: reissuing never reopens a configured account.
        const { error: insertError } = await admin.from('teacher_password_setup').upsert({ user_id: id }, { onConflict: 'user_id', ignoreDuplicates: true });
        if (insertError) throw insertError;
        const { data, error } = await admin.from('teacher_password_setup').update({ code_hash: hash, expires_at: expires, issued_by: adminId, issued_at: now, claim_id: null, claim_expires_at: null }).eq('user_id', id).is('password_configured_at', null).or(`claim_expires_at.is.null,claim_expires_at.lt.${now}`).select('user_id');
        if (error) throw error;
        return data?.length === 1;
      },
      async claimCode(id, hash, claim, now, until) {
        const { data, error } = await admin.from('teacher_password_setup').update({ claim_id: claim, claim_expires_at: until }).eq('user_id', id).eq('code_hash', hash).is('password_configured_at', null).gt('expires_at', now).or(`claim_expires_at.is.null,claim_expires_at.lt.${now}`).select('user_id');
        if (error) throw error;
        return data?.length === 1;
      },
      async releaseClaim(id, claim) {
        const { error } = await admin.from('teacher_password_setup').update({ claim_id: null, claim_expires_at: null }).eq('user_id', id).eq('claim_id', claim);
        if (error) throw error;
      },
      async finishSetup(id, claim, now) {
        const { data, error } = await admin.from('teacher_password_setup').update({ password_configured_at: now, code_hash: null, expires_at: null, claim_id: null, claim_expires_at: null }).eq('user_id', id).eq('claim_id', claim).is('password_configured_at', null).select('user_id');
        if (error) throw error;
        return data?.length === 1;
      },
      async setPassword(id, password) {
        const { data, error: accountError } = await admin.auth.admin.getUserById(id);
        if (accountError || !data.user) throw accountError ?? new Error('Account unavailable');
        const { error } = await admin.auth.admin.updateUserById(id, {
          password, user_metadata: { ...data.user.user_metadata, is_first_login: false },
        });
        if (error) throw error;
        const { error: profileError } = await admin.from('users').update({ is_first_login: false }).eq('id', id);
        if (profileError) throw profileError;
      },
      async signIn(teacher, password) {
        const { data: account, error: accountError } = await admin.auth.admin.getUserById(teacher.id);
        if (accountError || !account.user?.email) return null;
        const { data, error } = await passwordClient.auth.signInWithPassword({ email: account.user.email, password });
        if (error || !data.session || data.user?.id !== teacher.id) return null;
        return { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
      },
      async rateLimit(phone, action) {
        const { data, error } = await admin.rpc('check_teacher_auth_rate_limit', { p_key_hash: await codeHash(action, phone), p_limit: action === 'check' ? 30 : 10, p_window_seconds: action === 'check' ? 60 : 600 });
        if (error) throw error;
        return data === true;
      },
    };
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return new Response(JSON.stringify({ error: 'طلب غير صالح' }), { status: 400, headers });
    const result = await handleTeacherPassword(body, deps);
    return new Response(JSON.stringify(result.body), { status: result.status, headers });
  } catch {
    // Never include credentials, activation codes or auth tokens in errors/logs.
    return new Response(JSON.stringify({ error: 'تعذر الاتصال بخدمة دخول المعلمين؛ حاول لاحقاً' }), { status: 503, headers });
  }
});
