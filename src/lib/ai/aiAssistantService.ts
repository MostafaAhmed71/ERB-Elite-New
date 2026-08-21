import { supabase } from '../supabase';
import { reportServiceError } from '../platformErrors';
import type {
  AiCreditBalance,
  AiCreditCatalogItem,
  AiCreditSettings,
  AiCreditTransaction,
  AiFavorite,
  AiGenerateForm,
  AiGenerateResult,
  AiGeneration,
  AiPromptItem,
  AiSchoolTemplate,
  AiSharedPrompt,
  AiUsageStats,
  AiKnowledgeDoc,
} from './types';

/** استخراج رسالة الخطأ الفعلية من استجابة Edge Function */
async function edgeInvokeErrorMessage(error: unknown, fallback: string): Promise<string> {
  const err = error as {
    message?: string;
    context?: Response | { json?: () => Promise<unknown>; text?: () => Promise<string> };
  };
  const msg = err?.message || fallback;

  try {
    const ctx = err?.context;
    if (ctx && typeof (ctx as Response).json === 'function') {
      const body = (await (ctx as Response).clone().json()) as { error?: string; message?: string };
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    }
  } catch {
    try {
      const ctx = err?.context as Response | undefined;
      if (ctx && typeof ctx.text === 'function') {
        const text = await ctx.clone().text();
        if (text?.trim()) return text.trim().slice(0, 300);
      }
    } catch {
      /* ignore */
    }
  }

  if (/Failed to send a request to the Edge Function/i.test(msg)) {
    return 'دالة Edge غير متاحة — تأكد من النشر: supabase functions deploy ai-generate';
  }
  if (/non-2xx status code/i.test(msg)) {
    return 'رفضت دالة التوليد الطلب (تحقق من: تطبيق SQL 081–087، وSecrets للمزود، وتسجيل الدخول).';
  }
  return msg;
}

export const aiAssistantService = {
  async listPrompts(): Promise<AiPromptItem[]> {
    const { data: prompts, error } = await supabase
      .from('ai_prompt_catalog')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('name');
    if (error) throw error;

    const { data: credits } = await supabase
      .from('ai_credit_catalog')
      .select('task_code, default_credit');

    const creditMap = new Map((credits ?? []).map((c) => [c.task_code, c.default_credit]));
    return (prompts ?? []).map((p) => ({
      ...p,
      default_credit: creditMap.get(p.task_code) ?? 1,
    })) as AiPromptItem[];
  },

  async generate(opts: {
    task_code: string;
    form: AiGenerateForm;
    free_prompt?: string;
    regenerate?: boolean;
  }): Promise<AiGenerateResult> {
    const invokePromise = supabase.functions.invoke('ai-generate', {
      body: opts,
    });
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('انتهت مهلة الانتظار (60 ثانية). غالباً مفتاح OpenRouter غير مضبوط في Secrets أو الدالة القديمة لم تُحدَّث.')),
        60_000,
      );
    });

    let data: AiGenerateResult | { error?: string } | null = null;
    let error: unknown = null;
    try {
      const result = await Promise.race([invokePromise, timeoutPromise]);
      data = result.data as AiGenerateResult | { error?: string } | null;
      error = result.error;
    } catch (e) {
      reportServiceError('ai', e, { severity: 'error', context: { task_code: opts.task_code } });
      throw e instanceof Error ? e : new Error('فشل التوليد');
    }

    if (error) {
      if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
        const msg = String((data as { error: string }).error);
        reportServiceError('ai', msg, { context: { task_code: opts.task_code, edge: true } });
        throw new Error(msg);
      }
      const msg = await edgeInvokeErrorMessage(error, 'فشل التوليد');
      reportServiceError('edge', msg, { severity: 'error', context: { fn: 'ai-generate', task_code: opts.task_code } });
      throw new Error(msg);
    }

    if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
      const msg = String((data as { error: string }).error);
      reportServiceError('ai', msg, { context: { task_code: opts.task_code } });
      throw new Error(msg);
    }

    return data as AiGenerateResult;
  },

  async listGenerations(limit = 50): Promise<AiGeneration[]> {
    const { data, error } = await supabase
      .from('ai_generations')
      .select(
        'id, teacher_id, task_code, prompt_name, category, output_content, credits_used, word_count, status, model, created_at, input_payload',
      )
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as AiGeneration[];
  },

  async listFavorites(): Promise<AiFavorite[]> {
    const { data, error } = await supabase
      .from('ai_favorites')
      .select('*')
      .order('sort_order')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as AiFavorite[];
  },

  async addFavorite(input: {
    teacher_id: string;
    generation_id?: string | null;
    task_code?: string;
    title?: string;
    content: string;
  }) {
    const { data, error } = await supabase
      .from('ai_favorites')
      .insert({
        teacher_id: input.teacher_id,
        generation_id: input.generation_id ?? null,
        task_code: input.task_code ?? null,
        title: input.title ?? null,
        content: input.content,
      })
      .select()
      .single();
    if (error) throw error;
    return data as AiFavorite;
  },

  async removeFavorite(id: string) {
    const { error } = await supabase.from('ai_favorites').delete().eq('id', id);
    if (error) throw error;
  },

  async listTemplates(): Promise<AiSchoolTemplate[]> {
    const { data, error } = await supabase
      .from('ai_school_templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as AiSchoolTemplate[];
  },

  async saveTemplate(input: { id?: string; title: string; body: string; is_active: boolean; created_by?: string }) {
    if (input.id) {
      const { data, error } = await supabase
        .from('ai_school_templates')
        .update({
          title: input.title,
          body: input.body,
          is_active: input.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data as AiSchoolTemplate;
    }
    const { data, error } = await supabase
      .from('ai_school_templates')
      .insert({
        title: input.title,
        body: input.body,
        is_active: input.is_active,
        created_by: input.created_by ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as AiSchoolTemplate;
  },

  async deleteTemplate(id: string) {
    const { error } = await supabase.from('ai_school_templates').delete().eq('id', id);
    if (error) throw error;
  },

  async listSharedPrompts(): Promise<AiSharedPrompt[]> {
    const { data, error } = await supabase
      .from('ai_shared_prompts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    const rows = (data ?? []) as AiSharedPrompt[];
    const ids = [...new Set(rows.map((r) => r.teacher_id))];
    if (!ids.length) return rows;
    const { data: teachers } = await supabase.from('users').select('id, full_name').in('id', ids);
    const nameMap = new Map((teachers ?? []).map((t) => [t.id, t.full_name]));
    return rows.map((r) => ({ ...r, teacher_name: nameMap.get(r.teacher_id) ?? '—' }));
  },

  async sharePrompt(input: {
    teacher_id: string;
    title: string;
    prompt_text: string;
    category?: string;
    subject?: string;
  }) {
    const { data, error } = await supabase
      .from('ai_shared_prompts')
      .insert({
        teacher_id: input.teacher_id,
        title: input.title,
        prompt_text: input.prompt_text,
        category: input.category ?? null,
        subject: input.subject ?? null,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;
    return data as AiSharedPrompt;
  },

  async deactivateSharedPrompt(id: string) {
    const { error } = await supabase
      .from('ai_shared_prompts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async listKnowledgeDocs(): Promise<AiKnowledgeDoc[]> {
    const { data, error } = await supabase
      .from('ai_knowledge_docs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as AiKnowledgeDoc[];
  },

  async uploadKnowledgeDoc(opts: {
    file: File;
    title: string;
    uploaded_by?: string;
    education_level?: string | null;
    grade?: number | null;
    subject?: string | null;
  }): Promise<AiKnowledgeDoc> {
    const ext = opts.file.name.split('.').pop() || 'bin';
    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('ai-knowledge')
      .upload(path, opts.file, { contentType: opts.file.type || undefined, upsert: false });
    if (upErr) throw upErr;

    const { data, error } = await supabase
      .from('ai_knowledge_docs')
      .insert({
        title: opts.title || opts.file.name,
        file_path: path,
        file_name: opts.file.name,
        mime_type: opts.file.type || null,
        status: 'pending',
        uploaded_by: opts.uploaded_by ?? null,
        education_level: opts.education_level || null,
        grade: opts.grade ?? null,
        subject: opts.subject?.trim() || null,
      })
      .select()
      .single();
    if (error) throw error;

    const { data: ingest, error: ingestErr } = await supabase.functions.invoke('ai-knowledge-ingest', {
      body: { doc_id: data.id },
    });
    if (ingestErr) {
      console.warn('ingest invoke', ingestErr);
    } else if (ingest?.error) {
      console.warn('ingest', ingest.error);
    }

    const { data: refreshed } = await supabase
      .from('ai_knowledge_docs')
      .select('*')
      .eq('id', data.id)
      .maybeSingle();
    return (refreshed ?? data) as AiKnowledgeDoc;
  },

  async deleteKnowledgeDoc(id: string) {
    const { data: doc } = await supabase
      .from('ai_knowledge_docs')
      .select('file_path')
      .eq('id', id)
      .maybeSingle();
    if (doc?.file_path) {
      await supabase.storage.from('ai-knowledge').remove([doc.file_path]);
    }
    const { error } = await supabase.from('ai_knowledge_docs').delete().eq('id', id);
    if (error) throw error;
  },

  async reingestKnowledgeDoc(id: string) {
    const { data, error } = await supabase.functions.invoke('ai-knowledge-ingest', {
      body: { doc_id: id },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  },
};

export const aiCreditsService = {
  async fetchMine(): Promise<{
    balance: AiCreditBalance | null;
    history: AiCreditTransaction[];
    settings: AiCreditSettings | null;
  }> {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;
    if (!userId) throw new Error('يجب تسجيل الدخول');

    await supabase.rpc('ai_ensure_teacher_balance', { p_teacher_id: userId });

    const { data: balance } = await supabase
      .from('ai_credit_balance')
      .select('*')
      .eq('teacher_id', userId)
      .maybeSingle();

    const { data: history } = await supabase
      .from('ai_credit_transactions')
      .select('*')
      .eq('teacher_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: settings } = await supabase.from('ai_credit_settings').select('*').limit(1).maybeSingle();

    return {
      balance: balance as AiCreditBalance | null,
      history: (history ?? []) as AiCreditTransaction[],
      settings: settings as AiCreditSettings | null,
    };
  },

  async principalAction(body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('ai-credits', { body });
    if (error) throw new Error(await edgeInvokeErrorMessage(error, 'فشل طلب الرصيد'));
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async listCatalog(): Promise<AiCreditCatalogItem[]> {
    const { data, error } = await supabase
      .from('ai_credit_catalog')
      .select('*')
      .order('default_credit')
      .order('task_name');
    if (error) throw error;
    return (data ?? []) as AiCreditCatalogItem[];
  },

  async listAllBalances(): Promise<(AiCreditBalance & { teacher_name?: string })[]> {
    const { data: balances, error } = await supabase
      .from('ai_credit_balance')
      .select('*')
      .order('used_credit', { ascending: false });
    if (error) throw error;

    const ids = (balances ?? []).map((b) => b.teacher_id);
    if (!ids.length) return [];

    const { data: teachers } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', ids);

    const nameMap = new Map((teachers ?? []).map((t) => [t.id, t.full_name]));
    return (balances ?? []).map((b) => ({
      ...b,
      teacher_name: nameMap.get(b.teacher_id) ?? '—',
    })) as (AiCreditBalance & { teacher_name?: string })[];
  },

  async usageStats(fromIso?: string, toIso?: string): Promise<AiUsageStats> {
    const { data, error } = await supabase.rpc('ai_usage_stats', {
      p_from: fromIso ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      p_to: toIso ?? new Date().toISOString(),
    });
    if (error) throw error;
    const raw = (data ?? {}) as AiUsageStats;
    return {
      total_credits: Number(raw.total_credits) || 0,
      total_tokens: Number(raw.total_tokens) || 0,
      total_cost_usd: Number(raw.total_cost_usd) || 0,
      success_count: Number(raw.success_count) || 0,
      failed_count: Number(raw.failed_count) || 0,
      avg_execution_ms: Number(raw.avg_execution_ms) || 0,
      top_tasks: Array.isArray(raw.top_tasks) ? raw.top_tasks : [],
      top_teachers: Array.isArray(raw.top_teachers) ? raw.top_teachers : [],
      top_subjects: Array.isArray(raw.top_subjects) ? raw.top_subjects : [],
    };
  },
};
