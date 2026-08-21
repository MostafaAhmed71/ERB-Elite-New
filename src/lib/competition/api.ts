import { supabase } from '../supabase';
import { getRiyadhDateString } from './time';
import type {
  CompAnswer,
  CompClass,
  CompDailyResult,
  CompLeaderboardRow,
  CompQuestion,
  CompQuestionInput,
  CompSettings,
} from './types';
import { DEFAULT_COMP_SETTINGS } from './types';

function parseOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      /* ignore */
    }
  }
  return [];
}

function mapQuestion(row: Record<string, unknown>): CompQuestion {
  return {
    id: String(row.id),
    question_text: String(row.question_text),
    subject: String(row.subject),
    options: parseOptions(row.options),
    correct_answer: Number(row.correct_answer),
    scheduled_date: String(row.scheduled_date),
    audio_url: row.audio_url ? String(row.audio_url) : null,
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
  };
}

export async function listCompClasses(): Promise<CompClass[]> {
  const { data, error } = await supabase
    .from('comp_classes')
    .select('*')
    .order('grade')
    .order('section');
  if (error) throw error;
  return (data ?? []) as CompClass[];
}

export async function getCompClassBySlug(slug: string): Promise<CompClass | null> {
  const { data, error } = await supabase
    .from('comp_classes')
    .select('*')
    .eq('url_slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data as CompClass | null;
}

export async function getTodayQuestion(dateStr?: string): Promise<CompQuestion | null> {
  const day = dateStr ?? getRiyadhDateString();
  const { data, error } = await supabase
    .from('comp_questions')
    .select('*')
    .eq('scheduled_date', day)
    .maybeSingle();
  if (error) throw error;
  return data ? mapQuestion(data as Record<string, unknown>) : null;
}

export async function getActiveOrTodayQuestion(): Promise<CompQuestion | null> {
  const { data: active, error: activeErr } = await supabase
    .from('comp_questions')
    .select('*')
    .eq('is_active', true)
    .order('scheduled_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeErr) throw activeErr;
  if (active) return mapQuestion(active as Record<string, unknown>);
  return getTodayQuestion();
}

export async function listCompQuestions(subject?: string): Promise<CompQuestion[]> {
  let q = supabase.from('comp_questions').select('*').order('scheduled_date', { ascending: false });
  if (subject) q = q.eq('subject', subject);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((row) => mapQuestion(row as Record<string, unknown>));
}

export async function upsertCompQuestion(
  input: CompQuestionInput,
  id?: string,
): Promise<CompQuestion> {
  const payload = {
    question_text: input.question_text,
    subject: input.subject,
    options: input.options,
    correct_answer: input.correct_answer,
    scheduled_date: input.scheduled_date,
    audio_url: input.audio_url ?? null,
    is_active: input.is_active ?? false,
  };

  if (id) {
    const { data, error } = await supabase
      .from('comp_questions')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw mapCompQuestionError(error);
    return mapQuestion(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from('comp_questions')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw mapCompQuestionError(error);
  return mapQuestion(data as Record<string, unknown>);
}

function mapCompQuestionError(error: { code?: string; message?: string }): Error {
  const msg = error.message ?? '';
  if (
    error.code === '23505' ||
    msg.includes('duplicate key') ||
    msg.includes('comp_questions_scheduled_date')
  ) {
    return new Error('يوجد سؤال مجدول في هذا التاريخ مسبقاً — عدّل السؤال الموجود أو اختر تاريخاً آخر');
  }
  if (error.code === '42501' || msg.includes('row-level security')) {
    return new Error('ليس لديك صلاحية لإدارة أسئلة المسابقة');
  }
  return new Error(msg || 'فشل حفظ السؤال');
}

export async function setQuestionActive(id: string, isActive: boolean): Promise<void> {
  if (isActive) {
    const { error: clearErr } = await supabase
      .from('comp_questions')
      .update({ is_active: false })
      .neq('id', id);
    if (clearErr) throw clearErr;
  }
  const { error } = await supabase.from('comp_questions').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

export async function deleteCompQuestion(id: string): Promise<void> {
  const { error } = await supabase.from('comp_questions').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadQuestionAudio(
  questionId: string,
  blob: Blob,
): Promise<string> {
  const path = `${questionId}/${Date.now()}.mp3`;
  const { error: upErr } = await supabase.storage
    .from('question-audio')
    .upload(path, blob, { contentType: 'audio/mpeg', upsert: true });
  if (upErr) throw upErr;

  const { data } = supabase.storage.from('question-audio').getPublicUrl(path);
  return data.publicUrl;
}

export async function submitCompAnswer(params: {
  questionId: string;
  classId: string;
  selectedAnswer: number;
  correctAnswer: number;
}): Promise<CompAnswer> {
  const isCorrect = params.selectedAnswer === params.correctAnswer;
  const { data, error } = await supabase
    .from('comp_answers')
    .insert({
      question_id: params.questionId,
      class_id: params.classId,
      selected_answer: params.selectedAnswer,
      is_correct: isCorrect,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('هذا الفصل أجاب مسبقاً على هذا السؤال');
    }
    throw error;
  }
  return data as CompAnswer;
}

export async function getClassAnswer(
  questionId: string,
  classId: string,
): Promise<CompAnswer | null> {
  const { data, error } = await supabase
    .from('comp_answers')
    .select('*')
    .eq('question_id', questionId)
    .eq('class_id', classId)
    .maybeSingle();
  if (error) throw error;
  return data as CompAnswer | null;
}

export async function fetchCompLeaderboard(): Promise<CompLeaderboardRow[]> {
  const [{ data: scores, error }, { data: classes, error: classErr }] = await Promise.all([
    supabase.from('comp_scores').select('class_id, total_points').order('total_points', { ascending: false }),
    supabase.from('comp_classes').select('id, name, grade, section, url_slug'),
  ]);
  if (error) throw error;
  if (classErr) throw classErr;

  const classMap = new Map(
    (classes ?? []).map((c) => [
      c.id as string,
      c as { id: string; name: string; grade: number; section: string; url_slug: string },
    ]),
  );

  return (scores ?? []).map((row, index) => {
    const cls = classMap.get(row.class_id as string);
    return {
      class_id: row.class_id as string,
      name: cls?.name ?? '—',
      grade: cls?.grade ?? 0,
      section: cls?.section ?? '',
      url_slug: cls?.url_slug ?? '',
      total_points: Number(row.total_points ?? 0),
      rank: index + 1,
    } satisfies CompLeaderboardRow;
  });
}

export async function fetchDailyResults(questionId: string): Promise<CompDailyResult[]> {
  const [{ data, error }, { data: classes, error: classErr }] = await Promise.all([
    supabase
      .from('comp_answers')
      .select('class_id, selected_answer, is_correct, answered_at')
      .eq('question_id', questionId)
      .order('answered_at', { ascending: true }),
    supabase.from('comp_classes').select('id, name'),
  ]);
  if (error) throw error;
  if (classErr) throw classErr;

  const classMap = new Map((classes ?? []).map((c) => [c.id as string, String(c.name)]));

  return (data ?? []).map((row) => ({
    class_id: row.class_id as string,
    class_name: classMap.get(row.class_id as string) ?? '—',
    selected_answer: Number(row.selected_answer),
    is_correct: Boolean(row.is_correct),
    answered_at: String(row.answered_at),
  }));
}

function mapSettings(row: Record<string, unknown> | null): CompSettings {
  if (!row) return { ...DEFAULT_COMP_SETTINGS };
  return {
    id: 1,
    start_hour: Number(row.start_hour ?? DEFAULT_COMP_SETTINGS.start_hour),
    start_minute: Number(row.start_minute ?? DEFAULT_COMP_SETTINGS.start_minute),
    answer_window_seconds: Number(
      row.answer_window_seconds ?? DEFAULT_COMP_SETTINGS.answer_window_seconds,
    ),
    answer_session_seconds: Number(
      row.answer_session_seconds ?? DEFAULT_COMP_SETTINGS.answer_session_seconds,
    ),
    mascot_seconds: Number(row.mascot_seconds ?? DEFAULT_COMP_SETTINGS.mascot_seconds),
    leaderboard_seconds: Number(
      row.leaderboard_seconds ?? DEFAULT_COMP_SETTINGS.leaderboard_seconds,
    ),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

/** يُرجع الإعدادات الافتراضية إذا لم يُطبَّق migration بعد */
export async function getCompSettings(): Promise<CompSettings> {
  const { data, error } = await supabase.from('comp_settings').select('*').eq('id', 1).maybeSingle();
  if (error) {
    // جدول غير موجود بعد
    if (error.code === '42P01' || error.message?.includes('comp_settings')) {
      return { ...DEFAULT_COMP_SETTINGS };
    }
    throw error;
  }
  return mapSettings(data as Record<string, unknown> | null);
}

export async function updateCompSettings(
  patch: Partial<Omit<CompSettings, 'id' | 'updated_at'>>,
): Promise<CompSettings> {
  const payload = {
    ...patch,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('comp_settings')
    .upsert({ id: 1, ...payload })
    .select('*')
    .single();
  if (error) throw error;
  return mapSettings(data as Record<string, unknown>);
}
