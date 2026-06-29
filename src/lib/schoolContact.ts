import { supabase } from './supabase';

export type SchoolContactInfo = {
  activityLeaderName: string;
  activityLeaderEmail: string;
  adminEmail: string;
  phone: string;
};

const DEFAULT_CONTACT: SchoolContactInfo = {
  activityLeaderName: 'رائد النشاط',
  activityLeaderEmail: import.meta.env.VITE_SCHOOL_ACTIVITY_EMAIL ?? '',
  adminEmail: import.meta.env.VITE_SCHOOL_ADMIN_EMAIL ?? '',
  phone: import.meta.env.VITE_SCHOOL_PHONE ?? '',
};

export async function fetchSchoolContact(): Promise<SchoolContactInfo> {
  try {
    const { data } = await supabase
      .from('school_settings')
      .select('value')
      .eq('key', 'school_branding')
      .maybeSingle();

    const branding = (data?.value ?? {}) as Partial<{
      contact_email: string;
      contact_phone: string;
      activity_leader_name: string;
      admin_email: string;
    }>;

    return {
      activityLeaderName: branding.activity_leader_name ?? DEFAULT_CONTACT.activityLeaderName,
      activityLeaderEmail: branding.contact_email ?? DEFAULT_CONTACT.activityLeaderEmail,
      adminEmail: branding.admin_email ?? DEFAULT_CONTACT.adminEmail,
      phone: branding.contact_phone ?? DEFAULT_CONTACT.phone,
    };
  } catch {
    return DEFAULT_CONTACT;
  }
}

export function buildContactMailto(
  contact: SchoolContactInfo,
  topic: 'attendance' | 'points' | 'general'
): string {
  const email = contact.activityLeaderEmail || contact.adminEmail || 'info@school.local';
  const subjects: Record<typeof topic, string> = {
    attendance: 'استفسار عن حضور الابن',
    points: 'استفسار عن نقاط التميز',
    general: 'استفسار عام — أولمبياد النخبة',
  };
  return `mailto:${email}?subject=${encodeURIComponent(subjects[topic])}`;
}
