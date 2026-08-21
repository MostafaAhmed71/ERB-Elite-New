import { useState } from 'react';
import { Link2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/ui/PageHeader';
import { linkParentToStudentByCode } from '../../lib/familyOnboarding';
import { toArabicErrorMessage } from '../../lib/auth';
import { useParentChildren } from '../../hooks/useParentChildren';
import '../LoginPage.css';

export function ParentLinkChildPage() {
  const queryClient = useQueryClient();
  const { children, refetch } = useParentChildren();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await linkParentToStudentByCode(code);
      toast.success(
        result.already_linked
          ? `${result.student_name} مرتبط مسبقاً`
          : `تم ربط ${result.student_name} بنجاح`
      );
      setCode('');
      await refetch();
      void queryClient.invalidateQueries({ queryKey: ['parent', 'children'] });
    } catch (err) {
      toast.error(toArabicErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg" dir="rtl">
      <PageHeader
        title="ربط طالب بكود"
        subtitle="أدخل كود الربط الخاص بالطالب لإضافته إلى حسابك"
        icon={Link2}
      />

      <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-4">
        <div>
          <label className="text-white/60 text-sm mb-1.5 block">كود الطالب</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono tracking-widest"
            dir="ltr"
            placeholder="A3F9K2"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full rounded-xl bg-gold-500 text-navy-950 font-bold py-2.5 disabled:opacity-50"
        >
          {loading ? 'جاري الربط...' : 'ربط الطالب'}
        </button>
      </form>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-white font-semibold mb-2">الأبناء الحاليون</h3>
        {children.length === 0 ? (
          <p className="text-white/40 text-sm">لا يوجد أبناء مرتبطون بعد</p>
        ) : (
          <ul className="space-y-2 text-sm text-white/70">
            {children.map((c) => (
              <li key={c.id}>
                {c.full_name}{' '}
                <span className="text-white/35">
                  ({c.grade} — {c.class_name})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
