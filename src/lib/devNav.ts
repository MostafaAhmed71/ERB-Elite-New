import type { NavItem } from '../types';

/** مجموعات قائمة مطور المنصة — منفصلة تماماً عن ROLE_NAV المدرسي */
export type DevNavGroup = {
  id: string;
  title: string;
  items: NavItem[];
};

export const DEV_NAV_GROUPS: DevNavGroup[] = [
  {
    id: 'home',
    title: 'الرئيسية',
    items: [{ label: 'لوحة المطور', path: '/dev', icon: 'LayoutDashboard' }],
  },
  {
    id: 'health',
    title: 'الصحة والمراقبة',
    items: [
      { label: 'صحة النظام', path: '/dev/health', icon: 'Activity' },
      { label: 'مراقبة الأخطاء', path: '/dev/errors', icon: 'ShieldAlert' },
      { label: 'الأداء', path: '/dev/performance', icon: 'Gauge' },
      { label: 'Realtime', path: '/dev/monitor/realtime', icon: 'Radio' },
      { label: 'Supabase', path: '/dev/monitor/supabase', icon: 'Database' },
      { label: 'WhatsApp', path: '/dev/monitor/whatsapp', icon: 'MessageSquare' },
      { label: 'خدمات AI', path: '/dev/monitor/ai', icon: 'Sparkles' },
    ],
  },
  {
    id: 'jobs',
    title: 'المهام والطوابير',
    items: [
      { label: 'Background Jobs', path: '/dev/jobs', icon: 'ListOrdered' },
      { label: 'Queue', path: '/dev/queue', icon: 'Layers' },
      { label: 'المهام المجدولة', path: '/dev/schedules', icon: 'Calendar' },
    ],
  },
  {
    id: 'data',
    title: 'البيانات والملفات',
    items: [
      { label: 'الملفات', path: '/dev/files', icon: 'FolderOpen' },
      { label: 'التخزين', path: '/dev/storage', icon: 'HardDrive' },
      { label: 'مستكشف DB (قراءة)', path: '/dev/db', icon: 'Table' },
    ],
  },
  {
    id: 'ai',
    title: 'الذكاء والمعرفة',
    items: [
      { label: 'أنبوب المحتوى', path: '/dev/pipeline', icon: 'GitBranch' },
      { label: 'قاعدة المعرفة', path: '/dev/knowledge', icon: 'BookOpen' },
      { label: 'مراقبة AI', path: '/dev/ai/usage', icon: 'BarChart3' },
      { label: 'مستودع الأسئلة', path: '/dev/questions', icon: 'HelpCircle' },
    ],
  },
  {
    id: 'devtools',
    title: 'التطوير والتشخيص',
    items: [
      { label: 'الشكاوى والطلبات', path: '/dev/support', icon: 'Headset' },
      { label: 'Sandbox', path: '/dev/sandbox', icon: 'FlaskConical' },
      { label: 'Debug Mode', path: '/dev/debug', icon: 'Bug' },
      { label: 'السجلات', path: '/dev/logs', icon: 'ScrollText' },
      { label: 'Cache', path: '/dev/tools/cache', icon: 'RefreshCw' },
      { label: 'استيراد/تصدير', path: '/dev/import-export', icon: 'ArrowLeftRight' },
    ],
  },
  {
    id: 'security',
    title: 'الأمان والامتثال',
    items: [
      { label: 'Audit Center', path: '/dev/audit', icon: 'FileSearch' },
      { label: 'الصلاحيات', path: '/dev/tools/permissions', icon: 'KeyRound' },
      { label: 'Feature Flags', path: '/dev/tools/feature-flags', icon: 'Flag' },
    ],
  },
  {
    id: 'release',
    title: 'الإصدارات والبيئة',
    items: [
      { label: 'Version Center', path: '/dev/version', icon: 'GitBranch' },
      { label: 'البيئة', path: '/dev/environment', icon: 'Server' },
      { label: 'النسخ الاحتياطي', path: '/dev/backup', icon: 'Archive' },
    ],
  },
];

export const DEV_NAV: NavItem[] = DEV_NAV_GROUPS.flatMap((g) => g.items);

export function isDevPath(pathname: string): boolean {
  return pathname === '/dev' || pathname.startsWith('/dev/');
}
