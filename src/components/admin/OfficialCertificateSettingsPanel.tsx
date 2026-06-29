import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Save } from 'lucide-react';
import {
  fetchOfficialCertificateConfig,
  saveOfficialCertificateConfig,
  type OfficialCertificateConfig,
} from '../../lib/officialCertificate';
import { Button } from '../ui/Button';
import { showSuccess, showError } from '../../lib/toast';

/** G6 — إعدادات الشهادات الرسمية */
export function OfficialCertificateSettingsPanel() {
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useQuery({
    queryKey: ['official-cert-config'],
    queryFn: fetchOfficialCertificateConfig,
  });
  const [draft, setDraft] = useState<OfficialCertificateConfig | null>(null);
  const form = draft ?? config;

  const saveMutation = useMutation({
    mutationFn: saveOfficialCertificateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['official-cert-config'] });
      showSuccess('تم حفظ إعدادات الشهادات');
    },
    onError: (e: Error) => showError(e),
  });

  if (isLoading || !form) {
    return <p className="text-white/40 text-sm">جاري التحميل...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Award className="w-5 h-5 text-gold-400" />
        <div>
          <h3 className="text-white font-semibold text-sm">الشهادات الرقمية الرسمية — G6</h3>
          <p className="text-white/40 text-xs">تظهر في محفظة الطالب وعلى PDF الطباعة</p>
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-white/50 text-xs">اسم المدرسة</span>
        <input
          value={form.school_name}
          onChange={(e) => setDraft({ ...form, school_name: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-white/50 text-xs">اسم المدير</span>
        <input
          value={form.principal_name}
          onChange={(e) => setDraft({ ...form, principal_name: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-white/50 text-xs">نص الختم</span>
        <input
          value={form.seal_text}
          onChange={(e) => setDraft({ ...form, seal_text: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
        />
      </label>

      <Button
        size="sm"
        icon={<Save className="w-4 h-4" />}
        disabled={saveMutation.isPending}
        onClick={() => saveMutation.mutate(form)}
      >
        حفظ
      </Button>
    </div>
  );
}
