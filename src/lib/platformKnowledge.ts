import { supabase } from './supabase';
import { aiAssistantService } from './ai/aiAssistantService';
import type { AiKnowledgeDoc } from './ai/types';

export type KnowledgePipelineStats = {
  by_status: Record<string, number>;
  total_docs: number;
  total_chunks: number;
  failed_docs: {
    id: string;
    title: string;
    file_name: string;
    error_message: string | null;
    updated_at: string;
  }[];
};

export type DevAiGenerationRow = {
  id: string;
  teacher_id: string | null;
  teacher_name: string | null;
  task_code: string;
  status: string;
  model: string | null;
  provider: string | null;
  credits_used: number | null;
  execution_time_ms: number | null;
  error_message: string | null;
  created_at: string;
};

export const KNOWLEDGE_STATUS_LABELS: Record<string, string> = {
  pending: 'انتظار',
  processing: 'معالجة',
  ready: 'جاهز',
  failed: 'فشل',
  needs_review: 'مراجعة بشرية',
  queued: 'طابور',
};

export const PIPELINE_STAGES = [
  { id: 'pending', label: 'استلام / انتظار', description: 'ملف مرفوع ينتظر الفهرسة' },
  { id: 'processing', label: 'استخراج + Embeddings', description: 'تقطيع النص وتوليد المتجهات' },
  { id: 'needs_review', label: 'مراجعة بشرية', description: 'نص ضعيف أو يحتاج تدخّلاً' },
  { id: 'ready', label: 'جاهز للاسترجاع', description: 'متاح لـ RAG' },
  { id: 'failed', label: 'فشل', description: 'خطأ يحتاج إعادة فهرسة' },
] as const;

export async function getKnowledgePipelineStats(): Promise<KnowledgePipelineStats> {
  const { data, error } = await supabase.rpc('dev_knowledge_pipeline_stats');
  if (error) throw error;
  const raw = (data ?? {}) as KnowledgePipelineStats;
  return {
    by_status: raw.by_status && typeof raw.by_status === 'object' ? raw.by_status : {},
    total_docs: Number(raw.total_docs) || 0,
    total_chunks: Number(raw.total_chunks) || 0,
    failed_docs: Array.isArray(raw.failed_docs) ? raw.failed_docs : [],
  };
}

export async function listDevAiGenerations(opts?: {
  limit?: number;
  status?: string | null;
}): Promise<DevAiGenerationRow[]> {
  const { data, error } = await supabase.rpc('dev_ai_generations_recent', {
    p_limit: opts?.limit ?? 40,
    p_status: opts?.status ?? null,
  });
  if (error) throw error;
  return (data ?? []) as DevAiGenerationRow[];
}

export async function listKnowledgeDocs(): Promise<AiKnowledgeDoc[]> {
  return aiAssistantService.listKnowledgeDocs();
}

export async function reingestKnowledgeDoc(id: string) {
  return aiAssistantService.reingestKnowledgeDoc(id);
}

export async function deleteKnowledgeDoc(id: string) {
  return aiAssistantService.deleteKnowledgeDoc(id);
}

export async function reviewKnowledgeDoc(
  id: string,
  action: 'approve' | 'reject',
  notes?: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('review_knowledge_doc', {
    p_doc_id: id,
    p_action: action,
    p_notes: notes ?? null,
  });
  if (error) throw error;
  return !!data;
}

export type KnowledgeProbeResult = {
  query: string;
  ready_docs: number;
  total_chunks: number;
  chunks_with_embedding: number;
  matches: Array<{
    id: string;
    doc_id: string;
    doc_title: string;
    doc_status: string;
    snippet: string;
    has_embedding: boolean;
  }>;
};

/** G+ — فحص استرجاع نصي بدون استدعاء مزود embeddings */
export async function probeKnowledgeText(query: string, limit = 8): Promise<KnowledgeProbeResult> {
  const { data, error } = await supabase.rpc('dev_probe_knowledge_text', {
    p_query: query,
    p_limit: limit,
  });
  if (error) throw error;
  const raw = (data ?? {}) as KnowledgeProbeResult;
  return {
    query: raw.query ?? query,
    ready_docs: Number(raw.ready_docs) || 0,
    total_chunks: Number(raw.total_chunks) || 0,
    chunks_with_embedding: Number(raw.chunks_with_embedding) || 0,
    matches: Array.isArray(raw.matches) ? raw.matches : [],
  };
}

export async function uploadKnowledgeDoc(opts: {
  file: File;
  title: string;
  education_level?: string | null;
  grade?: number | null;
  subject?: string | null;
}) {
  const { data: session } = await supabase.auth.getSession();
  return aiAssistantService.uploadKnowledgeDoc({
    ...opts,
    uploaded_by: session.session?.user?.id,
  });
}

export function knowledgeStatusTone(status: string) {
  if (status === 'ready') return 'text-emerald-300 bg-emerald-500/15 border-emerald-500/25';
  if (status === 'failed') return 'text-red-300 bg-red-500/15 border-red-500/25';
  if (status === 'processing') return 'text-cyan-300 bg-cyan-500/15 border-cyan-500/25';
  if (status === 'needs_review') return 'text-violet-300 bg-violet-500/15 border-violet-500/25';
  return 'text-amber-300 bg-amber-500/15 border-amber-500/25';
}
