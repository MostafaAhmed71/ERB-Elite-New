import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Mail, Copy, Check, UserPlus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { createStaffInvite, buildInviteLink } from '../../lib/staffInvite';
import { ROLE_LABELS } from '../../types';
import type { UserRole } from '../../types';
import { showSuccess, showError } from '../../lib/toast';

const INVITE_ROLES: UserRole[] = ['teacher', 'supervisor', 'admin'];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function InviteUserModal({ open, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('teacher');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteMutation = useMutation({
    mutationFn: () => createStaffInvite(email.trim(), role as 'admin' | 'supervisor' | 'teacher'),
    onSuccess: (data) => {
      const link = buildInviteLink(data.token);
      setInviteLink(link);
      showSuccess('تم إنشاء رابط الدعوة — انسخه وأرسله للموظف');
    },
    onError: (e: Error) => showError(e),
  });

  const handleCopy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setEmail('');
    setRole('teacher');
    setInviteLink(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="دعوة موظف بالبريد" size="md">
      <div className="space-y-4" dir="rtl">
        <p className="text-white/50 text-sm leading-relaxed">
          أدخل بريد الموظف واختر دوره. سيُنشأ رابط دعوة صالح 7 أيام — أرسله عبر البريد أو واتساب.
        </p>

        {!inviteLink ? (
          <>
            <label className="block space-y-1">
              <span className="text-white/50 text-xs">البريد الإلكتروني</span>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@school.edu.sa"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-3 py-2.5 text-white text-sm"
                />
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-white/50 text-xs">الدور</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
              >
                {INVITE_ROLES.map((r) => (
                  <option key={r} value={r} className="bg-navy-900">
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>

            <Button
              className="w-full"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => inviteMutation.mutate()}
              disabled={!email.trim() || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء رابط الدعوة'}
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-emerald-400 text-sm font-medium">تم إنشاء الرابط بنجاح</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteLink}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono"
              />
              <Button variant="secondary" onClick={handleCopy} icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}>
                {copied ? 'تم' : 'نسخ'}
              </Button>
            </div>
            <p className="text-white/30 text-xs">الدور: {ROLE_LABELS[role]} — صالح 7 أيام</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
