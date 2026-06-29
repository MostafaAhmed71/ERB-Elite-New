/** قالب ورقة رسمية لأدلة المستخدم — من public/temp.jpeg */
export const USER_GUIDE_TEMPLATE_PATH = '/temp.jpeg';

/** منطقة آمنة للمحتوى فوق الترويسة والتذييل (تقريبي لقالب A4) */
export const USER_GUIDE_TEMPLATE_PADDING = {
  top: '42mm',
  right: '16mm',
  bottom: '38mm',
  left: '16mm',
};

export async function resolveUserGuideTemplateUrl(forEmbed = false): Promise<string> {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : import.meta.env.VITE_APP_URL || '';

  if (!forEmbed) {
    return `${origin}${USER_GUIDE_TEMPLATE_PATH}`;
  }

  try {
    const res = await fetch(USER_GUIDE_TEMPLATE_PATH);
    if (!res.ok) throw new Error('template fetch failed');
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return `${origin}${USER_GUIDE_TEMPLATE_PATH}`;
  }
}
