/**
 * ai-generate — توليد حسب مزود المدير:
 * openrouter | deepseek | google | openai
 *
 * Secrets (حسب المزود المختار):
 * - OPENROUTER_API_KEY
 * - DEEPSEEK_API_KEY
 * - GOOGLE_AI_API_KEY  (أو GEMINI_API_KEY)
 * - OPENAI_API_KEY
 * - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type GenerateBody = {
  task_code: string;
  form?: Record<string, unknown>;
  free_prompt?: string;
  regenerate?: boolean;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function buildUserPrompt(taskName: string, systemHint: string, form: Record<string, unknown>, freePrompt?: string) {
  const lines: string[] = [
    `المهمة: ${taskName}`,
    systemHint ? `تعليمات المهمة: ${systemHint}` : '',
    '',
    'بيانات السياق:',
  ];

  const map: Record<string, string> = {
    subject: 'المادة',
    education_level: 'المرحلة',
    grade: 'الصف',
    section: 'الفصل/الشعبة',
    unit: 'الوحدة',
    lesson: 'الدرس',
    duration: 'زمن الحصة (دقيقة)',
    student_count: 'عدد الطلاب',
    level: 'مستوى الطلاب',
    curriculum: 'المنهج',
    language: 'لغة المخرجات',
    style: 'أسلوب الكتابة',
    output_format: 'شكل المخرج',
    teacher_name: 'اسم المعلم',
  };

  for (const [k, label] of Object.entries(map)) {
    const v = form[k];
    if (v !== undefined && v !== null && String(v).trim()) {
      lines.push(`${label}: ${String(v)}`);
    }
  }

  if (freePrompt?.trim()) {
    lines.push('', 'طلب إضافي من المعلم:', freePrompt.trim());
  }

  lines.push(
    '',
    'أنتج مخرجات تربوية احترافية جاهزة للاستخدام مباشرة.',
    'إن طُلب جدول فاعرضه بصيغة Markdown.',
  );

  return lines.filter(Boolean).join('\n');
}

type Provider = 'openrouter' | 'deepseek' | 'google' | 'openai';

function normalizeProvider(raw: unknown): Provider {
  if (raw === 'deepseek' || raw === 'google' || raw === 'openai' || raw === 'openrouter') {
    return raw;
  }
  return 'openrouter';
}

function resolveModel(provider: Provider, configured: string | null | undefined): string {
  const raw = String(configured || '').trim();
  if (provider === 'deepseek') {
    if (!raw || raw.includes('/')) return 'deepseek-chat';
    return raw;
  }
  if (provider === 'google') {
    if (!raw || raw.includes('/')) return 'gemini-2.0-flash-lite';
    return raw.replace(/^models\//, '');
  }
  if (provider === 'openai') {
    if (!raw || raw.includes('/')) return 'gpt-4o-mini';
    return raw;
  }
  return raw || 'deepseek/deepseek-v4-flash';
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`انتهت مهلة الاتصال (${Math.round(timeoutMs / 1000)}ث)`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAiCompatible(opts: {
  url: string;
  apiKey: string;
  model: string;
  system: string;
  user: string;
  extraHeaders?: Record<string, string>;
  timeoutMs?: number;
}) {
  return fetchWithTimeout(
    opts.url,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        'Content-Type': 'application/json',
        ...(opts.extraHeaders ?? {}),
      },
      body: JSON.stringify({
        model: opts.model,
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.user },
        ],
        temperature: 0.7,
      }),
    },
    opts.timeoutMs ?? 40_000,
  );
}

async function callGoogleGemini(opts: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
}) {
  // واجهة OpenAI-compatible من Google
  return callOpenAiCompatible({
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    apiKey: opts.apiKey,
    model: opts.model,
    system: opts.system,
    user: opts.user,
  });
}

async function callLlm(opts: {
  provider: Provider;
  model: string;
  system: string;
  user: string;
  openRouterKey: string;
  deepseekKey: string;
  googleKey: string;
  openaiKey: string;
}) {
  if (opts.provider === 'deepseek') {
    if (!opts.deepseekKey) {
      throw new Error('DEEPSEEK_API_KEY غير مضبوط في Secrets');
    }
    const res = await callOpenAiCompatible({
      url: 'https://api.deepseek.com/chat/completions',
      apiKey: opts.deepseekKey,
      model: opts.model,
      system: opts.system,
      user: opts.user,
    });
    return { res, provider: 'deepseek' as const };
  }

  if (opts.provider === 'google') {
    if (!opts.googleKey) {
      throw new Error('GOOGLE_AI_API_KEY (أو GEMINI_API_KEY) غير مضبوط في Secrets');
    }
    const res = await callGoogleGemini({
      apiKey: opts.googleKey,
      model: opts.model,
      system: opts.system,
      user: opts.user,
    });
    return { res, provider: 'google' as const };
  }

  if (opts.provider === 'openai') {
    if (!opts.openaiKey) {
      throw new Error('OPENAI_API_KEY غير مضبوط في Secrets');
    }
    const res = await callOpenAiCompatible({
      url: 'https://api.openai.com/v1/chat/completions',
      apiKey: opts.openaiKey,
      model: opts.model,
      system: opts.system,
      user: opts.user,
    });
    return { res, provider: 'openai' as const };
  }

  if (!opts.openRouterKey) {
    throw new Error('OPENROUTER_API_KEY غير مضبوط في Secrets');
  }
  const res = await callOpenAiCompatible({
    url: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: opts.openRouterKey,
    model: opts.model,
    system: opts.system,
    user: opts.user,
    extraHeaders: {
      'HTTP-Referer': 'https://northelite.tech',
      'X-Title': 'ERB Elite AI Teacher Assistant',
    },
  });
  return { res, provider: 'openrouter' as const };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const started = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY'.toLowerCase()) ?? '';
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY') ?? '';
    const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY') ?? '';
    const googleKey =
      Deno.env.get('GOOGLE_AI_API_KEY') ?? Deno.env.get('GEMINI_API_KEY') ?? '';
    const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';

    if (!supabaseUrl || !serviceKey) {
      return json(503, { error: 'Supabase not configured' });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json(401, { error: 'Unauthorized' });
    }

    const userClient = createClient(supabaseUrl, anonKey || serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json(401, { error: 'Unauthorized' });
    }
    const userId = userData.user.id;

    const { data: profile } = await admin
      .from('users')
      .select('id, full_name, role')
      .eq('id', userId)
      .maybeSingle();

    const role = profile?.role as string | undefined;
    if (!role || !['teacher', 'principal', 'admin'].includes(role)) {
      return json(403, { error: 'الدور غير مصرح باستخدام المساعد' });
    }

    // المدير قد يجرّب التوليد على حسابه؛ الرصيد يُخصم من حسابه إن وُجد أو يُنشأ
    const teacherId = userId;

    const body = (await req.json()) as GenerateBody;
    const taskCode = String(body.task_code || '').trim();
    if (!taskCode) return json(400, { error: 'task_code مطلوب' });

    const form = (body.form && typeof body.form === 'object' ? body.form : {}) as Record<string, unknown>;
    if (!form.teacher_name && profile?.full_name) form.teacher_name = profile.full_name;

    const { data: creditRow } = await admin
      .from('ai_credit_catalog')
      .select('task_code, task_name, default_credit, is_active')
      .eq('task_code', taskCode)
      .maybeSingle();

    if (!creditRow || creditRow.is_active === false) {
      return json(400, { error: 'نوع المهمة غير متاح' });
    }

    let creditsNeeded = Number(creditRow.default_credit) || 1;
    if (body.regenerate) {
      // إعادة التوليد تُحاسب كطلب جديد
    }

    const { data: settings } = await admin.from('ai_credit_settings').select('*').limit(1).maybeSingle();
    if (settings && body.regenerate && settings.allow_regenerate === false) {
      return json(403, { error: 'إعادة التوليد غير مسموحة من الإعدادات' });
    }
    const maxPerReq = Number(settings?.max_credit_per_request ?? 30);
    const billingMode = settings?.billing_mode === 'tokens' ? 'tokens' : 'fixed';
    const tokensPerCredit = Math.max(1, Number(settings?.tokens_per_credit ?? 2000));
    const usdPer1m = Number(settings?.usd_per_1m_tokens ?? 0.15);

    // في وضع tokens نتحقق من رصيد الحد الأدنى (1) أو تقدير الكتالوج قبل الطلب
    const precheckCredits = billingMode === 'tokens' ? 1 : Math.min(creditsNeeded, maxPerReq);
    if (billingMode === 'fixed' && creditsNeeded > maxPerReq) creditsNeeded = maxPerReq;

    const provider = normalizeProvider(settings?.ai_provider);
    const model = resolveModel(provider, settings?.openrouter_model);

    // ضمان رصيد
    const { data: balEnsured, error: balErr } = await admin.rpc('ai_ensure_teacher_balance', {
      p_teacher_id: teacherId,
    });
    if (balErr) return json(500, { error: balErr.message });

    const bal = Array.isArray(balEnsured) ? balEnsured[0] : balEnsured;
    if (bal?.ai_disabled) {
      return json(403, { error: 'تم إيقاف مساعد الذكاء الاصطناعي لحسابك — راجع المدير' });
    }
    const remaining = Number(bal?.remaining_credit ?? 0);
    if (remaining < precheckCredits) {
      return json(402, {
        error: 'انتهى رصيد الذكاء الاصطناعي لهذا الشهر. يرجى التواصل مع مدير المدرسة للحصول على رصيد إضافي.',
        remaining,
        needed: precheckCredits,
      });
    }

    const { data: promptMeta } = await admin
      .from('ai_prompt_catalog')
      .select('name, category, system_hint')
      .eq('task_code', taskCode)
      .maybeSingle();

    const { data: templates } = await admin
      .from('ai_school_templates')
      .select('body')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(3);

    const schoolPolicy = (templates ?? []).map((t: { body: string }) => t.body).join('\n\n');

    // RAG: فقط إذا وُجدت مستندات جاهزة (لا نؤخر التوليد على embeddings بلا داعٍ)
    let knowledgeContext = '';
    let knowledgeSources: { doc_id: string; similarity: number; preview: string }[] = [];
    try {
      const { count: readyDocs } = await admin
        .from('ai_knowledge_docs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ready');

      const openaiKeyEmb = Deno.env.get('OPENAI_API_KEY') ?? '';
      const orKeyEmb = Deno.env.get('OPENROUTER_API_KEY') ?? '';
      const embedKey = openaiKeyEmb || orKeyEmb;
      if (embedKey && (readyDocs ?? 0) > 0) {
        const queryText = [
          promptMeta?.name || creditRow.task_name,
          form.subject,
          form.unit,
          form.lesson,
          body.free_prompt,
        ]
          .filter(Boolean)
          .join('\n')
          .slice(0, 1500);

        const embedUrl = openaiKeyEmb
          ? 'https://api.openai.com/v1/embeddings'
          : 'https://openrouter.ai/api/v1/embeddings';
        const embedModel = openaiKeyEmb ? 'text-embedding-3-small' : 'openai/text-embedding-3-small';
        const embRes = await fetchWithTimeout(
          embedUrl,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${embedKey}`,
              'Content-Type': 'application/json',
              ...(!openaiKeyEmb
                ? { 'HTTP-Referer': 'https://northelite.tech', 'X-Title': 'ERB Elite RAG' }
                : {}),
            },
            body: JSON.stringify({ model: embedModel, input: queryText }),
          },
          6_000,
        );
        if (embRes.ok) {
          const embJson = await embRes.json();
          const embedding = embJson?.data?.[0]?.embedding;
          if (Array.isArray(embedding)) {
            const { data: matches } = await admin.rpc('match_ai_knowledge', {
              query_embedding: embedding,
              match_count: 5,
              filter_education_level: (() => {
                const raw = String(form.education_level || '');
                if (raw === 'middle' || raw === 'متوسط') return 'middle';
                if (raw === 'high' || raw === 'ثانوي') return 'high';
                return null;
              })(),
              filter_grade: (() => {
                const n = Number(form.grade_number || form.grade);
                return Number.isFinite(n) && n > 0 ? n : null;
              })(),
              filter_subject: form.subject ? String(form.subject) : null,
            });
            if (matches?.length) {
              const rows = matches as { doc_id: string; content: string; similarity: number }[];
              knowledgeContext = rows
                .map((m, i) => `[مقتطف ${i + 1}]\n${m.content}`)
                .join('\n\n');
              knowledgeSources = rows.slice(0, 5).map((m) => ({
                doc_id: m.doc_id,
                similarity: Math.round((m.similarity ?? 0) * 1000) / 1000,
                preview: String(m.content || '').slice(0, 120),
              }));
            }
          }
        }
      }
    } catch {
      /* RAG اختياري — لا يوقف التوليد */
    }

    const isPromptTool = ['improve_prompt', 'rewrite_text', 'translate_prompt'].includes(taskCode);
    const systemParts = [
      'أنت خبير تربوي سعودي محترف يساعد المعلمين في إعداد المستندات التعليمية.',
      schoolPolicy && !isPromptTool ? `سياسة المدرسة الإلزامية:\n${schoolPolicy}` : '',
      knowledgeContext && !isPromptTool
        ? `من ملفات المدرسة (اعتمد عليها عند الصلة ولا تخترع محتوى يناقضها):\n${knowledgeContext}`
        : '',
      isPromptTool
        ? 'مهمتك أداة برومبت: أعد النص الناتج فقط بدون مقدمات أو شرح.'
        : 'التزم باللغة المطلوبة في النموذج. كن دقيقاً وعملياً.',
    ].filter(Boolean);

    const userPrompt = buildUserPrompt(
      promptMeta?.name || creditRow.task_name,
      promptMeta?.system_hint || '',
      form,
      body.free_prompt,
    );

    let orRes: Response;
    let usedProvider: Provider;
    try {
      const called = await callLlm({
        provider,
        model,
        system: systemParts.join('\n\n'),
        user: userPrompt,
        openRouterKey,
        deepseekKey,
        googleKey,
        openaiKey,
      });
      orRes = called.res;
      usedProvider = called.provider;
    } catch (e) {
      return json(503, { error: e instanceof Error ? e.message : 'فشل إعداد المزود' });
    }

    const orText = await orRes.text();
    let orJson: {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      error?: { message?: string };
    } = {};
    try {
      orJson = JSON.parse(orText);
    } catch {
      /* ignore */
    }

    if (!orRes.ok) {
      await admin.from('ai_generations').insert({
        teacher_id: teacherId,
        task_code: taskCode,
        prompt_name: promptMeta?.name || creditRow.task_name,
        category: promptMeta?.category,
        input_payload: { form, free_prompt: body.free_prompt },
        status: 'failed',
        error_message: orJson.error?.message || orText.slice(0, 500),
        model,
        provider: usedProvider,
        execution_time_ms: Date.now() - started,
        credits_used: 0,
      });
      return json(502, {
        error: orJson.error?.message || `فشل ${usedProvider} (${orRes.status})`,
      });
    }

    const content = orJson.choices?.[0]?.message?.content?.trim() || '';
    if (!content) {
      return json(502, { error: 'استجابة فارغة من النموذج' });
    }

    const tokensIn = orJson.usage?.prompt_tokens ?? null;
    const tokensOut = orJson.usage?.completion_tokens ?? null;
    const tokensTotal = orJson.usage?.total_tokens ?? ((tokensIn ?? 0) + (tokensOut ?? 0) || null);
    const elapsed = Date.now() - started;
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    if (billingMode === 'tokens') {
      const totalTok = Math.max(1, Number(tokensTotal) || Math.ceil(wordCount * 1.3));
      creditsNeeded = Math.max(1, Math.ceil(totalTok / tokensPerCredit));
      if (creditsNeeded > maxPerReq) creditsNeeded = maxPerReq;
    }

    const costUsd =
      tokensTotal != null && tokensTotal > 0
        ? Number(((tokensTotal / 1_000_000) * usdPer1m).toFixed(6))
        : null;

    if (remaining < creditsNeeded) {
      return json(402, {
        error: 'الرصيد غير كافٍ بعد احتساب التكلفة الفعلية. يرجى التواصل مع المدير.',
        remaining,
        needed: creditsNeeded,
        content,
      });
    }

    const { data: newBal, error: deductErr } = await admin.rpc('ai_deduct_credits', {
      p_teacher_id: teacherId,
      p_credits: creditsNeeded,
      p_action: taskCode,
      p_tokens: tokensTotal,
      p_model: model,
      p_execution_ms: elapsed,
      p_meta: { regenerate: !!body.regenerate, provider: usedProvider, billing_mode: billingMode },
      p_cost: costUsd,
      p_provider: usedProvider,
    });

    if (deductErr) {
      return json(402, { error: deductErr.message, content });
    }

    const balAfter = Array.isArray(newBal) ? newBal[0] : newBal;

    const { data: gen, error: genErr } = await admin
      .from('ai_generations')
      .insert({
        teacher_id: teacherId,
        task_code: taskCode,
        prompt_name: promptMeta?.name || creditRow.task_name,
        category: promptMeta?.category,
        input_payload: { form, free_prompt: body.free_prompt },
        output_content: content,
        model,
        provider: usedProvider,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        credits_used: creditsNeeded,
        word_count: wordCount,
        execution_time_ms: elapsed,
        status: 'success',
      })
      .select('id')
      .single();

    if (!genErr && promptMeta) {
      try {
        await admin.rpc('ai_ensure_teacher_balance', { p_teacher_id: teacherId });
      } catch {
        /* ignore */
      }
      // زيادة عداد الاستخدام
      await admin
        .from('ai_prompt_catalog')
        .update({ usage_count: (promptMeta as { usage_count?: number }).usage_count })
        .eq('task_code', taskCode);
      // تحديث usage_count بشكل آمن
      const { data: cur } = await admin
        .from('ai_prompt_catalog')
        .select('usage_count')
        .eq('task_code', taskCode)
        .maybeSingle();
      if (cur) {
        await admin
          .from('ai_prompt_catalog')
          .update({ usage_count: (cur.usage_count ?? 0) + 1, updated_at: new Date().toISOString() })
          .eq('task_code', taskCode);
      }
    }

    return json(200, {
      ok: true,
      content,
      generation_id: gen?.id ?? null,
      credits_used: creditsNeeded,
      remaining: balAfter?.remaining_credit ?? remaining - creditsNeeded,
      model,
      word_count: wordCount,
      execution_time_ms: elapsed,
      knowledge_sources: knowledgeSources,
      knowledge_used: knowledgeSources.length > 0,
    });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : 'خطأ غير متوقع' });
  }
});
