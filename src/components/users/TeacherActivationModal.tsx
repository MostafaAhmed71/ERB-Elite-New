import { useState } from 'react';
import { X, Copy, KeyRound } from 'lucide-react';
import { issueTeacherPasswordCode } from '../../lib/teacherPasswordAuth';
import type { DbUser } from '../../types';

export function TeacherActivationModal({ teacher, onClose }: { teacher: DbUser; onClose: () => void }) {
  const [issued, setIssued] = useState<{ code: string; expires_at: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const issue = async () => {
    setLoading(true); setError(null);
    try { setIssued(await issueTeacherPasswordCode(teacher.id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'تعذر إصدار الكود'); }
    finally { setLoading(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(issued!.code); setCopied(true); }
    catch { setError('تعذر النسخ التلقائي؛ حدّد الكود وانسخه يدوياً'); }
  };
  return <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
    <section role="dialog" aria-modal="true" aria-labelledby="teacher-activation-title" className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4">
      <div className="flex items-center justify-between gap-3"><h2 id="teacher-activation-title" className="text-white font-bold flex items-center gap-2"><KeyRound size={20} />تفعيل كلمة مرور المعلم</h2><button type="button" onClick={onClose} disabled={loading} aria-label="إغلاق" className="text-white/60 p-2"><X size={20} /></button></div>
      <p className="text-white font-semibold">{teacher.full_name}</p><p className="text-white/60" dir="ltr">{teacher.phone || 'لم يُضف رقم الجوال'}</p>
      {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}
      {issued ? <>
        <p className="text-white/70 text-sm leading-7">سلّم هذا الكود للمعلم صاحب الحساب. يستخدمه مرة واحدة مع رقم جواله لتعيين كلمة المرور. يظهر الكود هنا فقط عند إصداره.</p>
        <div dir="ltr" className="font-mono text-center text-lg font-bold text-gold-400 bg-white/5 rounded-xl p-3 break-all select-all">{issued.code}</div>
        <p className="text-white/60 text-sm">صالح حتى {new Date(issued.expires_at).toLocaleString('ar-SA')}</p>
        <button type="button" onClick={copy} className="w-full rounded-xl bg-gold-400 text-navy-900 font-bold p-3 flex items-center justify-center gap-2"><Copy size={18} />{copied ? 'تم النسخ' : 'نسخ الكود'}</button>
      </> : <>
        <p className="text-white/60 text-sm leading-7">كود خاص بهذا المعلم، صالح لمدة 48 ساعة. إصدار كود جديد يُلغي أي كود سابق لم يُستخدم. لا يُرسل إلى واتساب.</p>
        <button type="button" disabled={loading || !teacher.phone || !teacher.is_active} onClick={issue} className="w-full rounded-xl bg-gold-400 text-navy-900 font-bold p-3 disabled:opacity-50">{loading ? 'جاري الإصدار...' : 'إصدار كود التفعيل'}</button>
      </>}
    </section>
  </div>;
}
