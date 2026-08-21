import { supabase } from './supabase';

export type PlatformDeveloperProfile = {
  display_name: string;
  title: string;
  phone: string;
  phone_e164: string;
  whatsapp: string;
  tagline: string;
  show_on_platform: boolean;
};

export const DEFAULT_DEVELOPER_PROFILE: PlatformDeveloperProfile = {
  display_name: 'مصطفى أحمد',
  title: 'مطور المنصة',
  phone: '0543641209',
  phone_e164: '966543641209',
  whatsapp: '966543641209',
  tagline: 'الدعم الفني والتقني لمنصة ERB Elite',
  show_on_platform: true,
};

export async function fetchPlatformDeveloperProfile(): Promise<PlatformDeveloperProfile> {
  const { data, error } = await supabase.rpc('get_platform_developer_profile');
  if (error) {
    // fallback إن لم تُطبَّق الهجرة بعد
    return DEFAULT_DEVELOPER_PROFILE;
  }
  const raw = (data ?? {}) as Partial<PlatformDeveloperProfile>;
  return { ...DEFAULT_DEVELOPER_PROFILE, ...raw };
}

export function developerWhatsAppLink(profile: PlatformDeveloperProfile, text?: string): string {
  const digits = (profile.whatsapp || profile.phone_e164 || profile.phone).replace(/\D/g, '');
  const phone = digits.startsWith('0') ? `966${digits.slice(1)}` : digits;
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${phone}${q}`;
}

export function developerTelLink(profile: PlatformDeveloperProfile): string {
  const digits = profile.phone.replace(/\D/g, '');
  return `tel:${digits}`;
}
