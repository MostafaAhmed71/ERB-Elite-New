import { PLATFORM_NAME } from './branding';
import { supabase } from './supabase';
import { saveSchoolSetting } from './schoolConfig';
import { OLYMPIAD_TEMPLATES, getTemplateById, type OlympiadTemplate } from './olympiadTemplates';

export type OlympiadConfig = {
  id: string;
  name: string;
};

export async function fetchOlympiadConfig(): Promise<OlympiadConfig> {
  const { data, error } = await supabase
    .from('school_settings')
    .select('value')
    .eq('key', 'olympiad_template')
    .maybeSingle();
  if (error || !data?.value) {
    return { id: 'olympiad_1448', name: PLATFORM_NAME };
  }
  const v = data.value as OlympiadConfig;
  return v;
}

export async function applyOlympiadTemplate(templateId: string): Promise<OlympiadTemplate> {
  const template = getTemplateById(templateId);
  if (!template) throw new Error('قالب غير معروف');

  await saveSchoolSetting('olympiad_template', { id: template.id, name: template.name });
  await saveSchoolSetting('axis_weights', template.weights);
  await saveSchoolSetting('excellence_levels', template.levels);

  return template;
}

export { OLYMPIAD_TEMPLATES };
