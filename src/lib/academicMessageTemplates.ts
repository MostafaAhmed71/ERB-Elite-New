import { supabase } from './supabase';
import type { PrincipalReminderKind } from './whatsappReminder';

export type AcademicMessageTemplate = {
  id: string;
  title: string;
  body: string;
  category: PrincipalReminderKind | string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function listAcademicMessageTemplates(opts?: {
  activeOnly?: boolean;
}): Promise<AcademicMessageTemplate[]> {
  let q = supabase
    .from('academic_message_templates')
    .select('*')
    .order('updated_at', { ascending: false });
  if (opts?.activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AcademicMessageTemplate[];
}

export async function saveAcademicMessageTemplate(input: {
  id?: string;
  title: string;
  body: string;
  category: string;
  is_active: boolean;
  created_by?: string | null;
}): Promise<AcademicMessageTemplate> {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) throw new Error('العنوان والنص مطلوبان');

  if (input.id) {
    const { data, error } = await supabase
      .from('academic_message_templates')
      .update({
        title,
        body,
        category: input.category,
        is_active: input.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id)
      .select()
      .single();
    if (error) throw error;
    return data as AcademicMessageTemplate;
  }

  const { data, error } = await supabase
    .from('academic_message_templates')
    .insert({
      title,
      body,
      category: input.category,
      is_active: input.is_active,
      created_by: input.created_by ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as AcademicMessageTemplate;
}

export async function deleteAcademicMessageTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('academic_message_templates').delete().eq('id', id);
  if (error) throw error;
}

export async function duplicateAcademicMessageTemplate(
  id: string,
  created_by?: string | null,
): Promise<AcademicMessageTemplate> {
  const { data: src, error } = await supabase
    .from('academic_message_templates')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return saveAcademicMessageTemplate({
    title: `${(src as AcademicMessageTemplate).title} (نسخة)`,
    body: (src as AcademicMessageTemplate).body,
    category: (src as AcademicMessageTemplate).category,
    is_active: false,
    created_by: created_by ?? null,
  });
}
