import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { getNavForRole } from '../../lib/nav';
import type { NavItem } from '../../types';

const EXTRA: NavItem[] = [
  { label: 'مركز الاستيراد/التصدير', path: '/principal/import-export', icon: 'Upload' },
  { label: 'البحث الأكاديمي', path: '/academic/search', icon: 'Search' },
  { label: 'مساعد الذكاء', path: '/teacher/ai-assistant', icon: 'Sparkles' },
  { label: 'التقرير التنفيذي', path: '/principal/executive', icon: 'TrendingUp' },
  { label: 'قوالب التصدير', path: '/principal/academic/export-templates', icon: 'FileText' },
  { label: 'التصدير الأكاديمي', path: '/academic/export', icon: 'Download' },
  { label: 'مستودع الأسئلة', path: '/questions', icon: 'HelpCircle' },
  { label: 'تذكيرات واتساب', path: '/principal/academic/whatsapp-reminders', icon: 'MessageSquare' },
];

/** P — لوحة أوامر سريعة Ctrl/Cmd+K */
export function CommandPalette() {
  const { role } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const items = useMemo(() => {
    const nav = role ? getNavForRole(role) : [];
    const merged = [...nav];
    for (const e of EXTRA) {
      if (!merged.some((m) => m.path === e.path)) merged.push(e);
    }
    const query = q.trim().toLowerCase();
    if (!query) return merged.slice(0, 12);
    return merged.filter(
      (i) => i.label.toLowerCase().includes(query) || i.path.toLowerCase().includes(query),
    ).slice(0, 16);
  }, [role, q]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm"
      dir="rtl"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f1a2e] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10">
          <Search className="w-4 h-4 text-white/40" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن صفحة أو أمر…"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
          <button type="button" onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <ul className="max-h-72 overflow-y-auto py-1">
          {items.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-white/40">لا نتائج</li>
          )}
          {items.map((item) => (
            <li key={item.path}>
              <button
                type="button"
                className={clsx(
                  'w-full text-start px-4 py-2.5 text-sm text-white/85 hover:bg-white/5',
                  'flex flex-col gap-0.5',
                )}
                onClick={() => {
                  setOpen(false);
                  setQ('');
                  navigate(item.path);
                }}
              >
                <span>{item.label}</span>
                <span className="text-[10px] text-white/35 font-mono">{item.path}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="px-3 py-2 text-[10px] text-white/30 border-t border-white/5">
          Ctrl/Cmd+K · Esc للإغلاق
        </p>
      </div>
    </div>
  );
}
