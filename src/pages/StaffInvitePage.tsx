import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Lock, Mail, User, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { acceptStaffInvite } from '../lib/staffInvite';
import { signIn, getHomePathForRole, toArabicErrorMessage } from '../lib/auth';
import { useAuthStore } from '../stores/authStore';
import { ROLE_LABELS } from '../types';
import { LogoIcon } from '../components/ui/Logo';
import { BarsLoader } from '../components/ui/BarsLoader';
import { Button } from '../components/ui/Button';
import clsx from 'clsx';

export function StaffInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setAuthSession } = useAuthStore();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: inviteInfo, isLoading, error: inviteError } = useQuery({
    queryKey: ['staff-invite', token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_staff_invite_public', { p_token: token! });
      if (error) throw error;
      if (!data) throw new Error('رابط الدعوة غير صالح أو منتهي');
      return data as { email: string; role: string };
    },
    enabled: !!token,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950" dir="rtl">
        <BarsLoader label="جاري التحقق من الدعوة..." fullScreen />
      </div>
    );
  }

  if (!inviteInfo || inviteError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-navy-950 text-center p-6" dir="rtl">
        <AlertCircle className="w-12 h-12 text-red-400/60 mb-4" />
        <p className="text-white/60">رابط الدعوة غير صالح أو منتهي الصلاحية</p>
        <Link to="/login" className="text-gold-400 text-sm mt-4 hover:underline">تسجيل الدخول</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) {
      setError('كلمة المرور 8 أحرف على الأقل');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('كلمة المرور غير متطابقة');
      return;
    }
    if (form.email.trim().toLowerCase() !== inviteInfo.email.toLowerCase()) {
      setError('يجب استخدام البريد المدعو: ' + inviteInfo.email);
      return;
    }

    setLoading(true);
    try {
      await acceptStaffInvite({
        token: token!,
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
      });
      const { session } = await signIn(form.email.trim(), form.password);
      if (session) setAuthSession(session);
      navigate(getHomePathForRole(inviteInfo.role as Parameters<typeof getHomePathForRole>[0]));
    } catch (err) {
      setError(toArabicErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md glass-card p-8 space-y-6">
        <div className="text-center space-y-2">
          <LogoIcon className="w-12 h-12 mx-auto" />
          <h1 className="text-white font-bold text-xl">دعوة انضمام للمنصة</h1>
          <p className="text-gold-400 text-sm">
            الدور: {ROLE_LABELS[inviteInfo.role as keyof typeof ROLE_LABELS] ?? inviteInfo.role}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-white/50 text-xs">الاسم الكامل</span>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                required
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-3 py-2.5 text-white text-sm"
              />
            </div>
          </label>

          <label className="block space-y-1">
            <span className="text-white/50 text-xs">البريد (محدد مسبقاً)</span>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="email"
                required
                value={form.email || inviteInfo.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder={inviteInfo.email}
                className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-3 py-2.5 text-white text-sm"
              />
            </div>
          </label>

          <label className="block space-y-1">
            <span className="text-white/50 text-xs">كلمة المرور</span>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-3 py-2.5 text-white text-sm"
              />
            </div>
          </label>

          <label className="block space-y-1">
            <span className="text-white/50 text-xs">تأكيد كلمة المرور</span>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
            />
          </label>

          {error && (
            <p className={clsx('text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2')}>
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'جاري إنشاء الحساب...' : 'قبول الدعوة وإنشاء الحساب'}
          </Button>
        </form>
      </div>
    </div>
  );
}
