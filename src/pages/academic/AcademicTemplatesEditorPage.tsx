import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, LayoutTemplate, Pencil, Plus, Trash2 } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import {
  deleteAcademicMessageTemplate,
  duplicateAcademicMessageTemplate,
  listAcademicMessageTemplates,
  saveAcademicMessageTemplate,
  type AcademicMessageTemplate,
} from '../../lib/academicMessageTemplates';
import { PRINCIPAL_REMINDER_KINDS } from '../../lib/whatsappReminder';
import { useAuthStore } from '../../stores/authStore';
import { showError, showSuccess } from '../../lib/toast';
import { EmptyState } from '../../components/ui/EmptyState';

const emptyForm = {
  id: undefined as string | undefined,
  title: '',
  body: '',
  category: 'general',
  is_active: true,
};

export function AcademicTemplatesEditorPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);

  const listQuery = useQuery({
    queryKey: ['academic-message-templates'],
    queryFn: () => listAcademicMessageTemplates(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['academic-message-templates'] });

  const saveMut = useMutation({
    mutationFn: () =>
      saveAcademicMessageTemplate({
        id: form.id,
        title: form.title,
        body: form.body,
        category: form.category,
        is_active: form.is_active,
        created_by: user?.id ?? null,
      }),
    onSuccess: () => {
      showSuccess(form.id ? 'تم تحديث القالب' : 'تم إنشاء القالب');
      setForm(emptyForm);
      setEditing(false);
      invalidate();
    },
    onError: (e: Error) => showError(e),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAcademicMessageTemplate(id),
    onSuccess: () => {
      showSuccess('حُذف القالب');
      invalidate();
    },
    onError: (e: Error) => showError(e),
  });

  const dupMut = useMutation({
    mutationFn: (id: string) => duplicateAcademicMessageTemplate(id, user?.id ?? null),
    onSuccess: () => {
      showSuccess('نُسخ القالب');
      invalidate();
    },
    onError: (e: Error) => showError(e),
  });

  const startEdit = (t: AcademicMessageTemplate) => {
    setForm({
      id: t.id,
      title: t.title,
      body: t.body,
      category: t.category,
      is_active: t.is_active,
    });
    setEditing(true);
  };

  const rows = listQuery.data ?? [];
  const missingTable =
    listQuery.error?.message?.includes('academic_message_templates')
    || listQuery.error?.message?.includes('schema cache');

  return (
    <RolePageShell>
      <PageHeader
        title="محرّر قوالب الرسائل"
        subtitle="إنشاء · تعديل · حذف · تكرار — قوالب تذكير واتساب والرسائل المدرسية"
        icon={LayoutTemplate}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setForm(emptyForm);
                setEditing(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 ml-1" />
              قالب جديد
            </Button>
            <Link to="/academic/templates" className="text-xs text-gold-400 self-center hover:underline">
              مركز القوالب
            </Link>
          </div>
        }
      />

      {missingTable && (
        <HorizonCard className="mb-4 border border-amber-500/30 bg-amber-500/5">
          <p className="text-sm text-amber-100">
            طبّق الهجرة <code className="text-xs">103_wave5_cron_templates_whatsapp.sql</code> أولاً.
          </p>
        </HorizonCard>
      )}

      {editing && (
        <HorizonCard className="mb-4 space-y-3">
          <p className="text-sm font-semibold text-white">{form.id ? 'تعديل قالب' : 'قالب جديد'}</p>
          <input
            className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
            placeholder="عنوان القالب"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <select
            className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            {PRINCIPAL_REMINDER_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
          <textarea
            className="w-full min-h-[140px] rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
            placeholder="نص الرسالة — استخدم {name} لاسم المستلم"
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm text-surface-muted">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            نشط
          </label>
          <div className="flex gap-2">
            <Button size="sm" disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
              حفظ
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditing(false);
                setForm(emptyForm);
              }}
            >
              إلغاء
            </Button>
          </div>
        </HorizonCard>
      )}

      {listQuery.isLoading ? (
        <p className="text-sm text-surface-muted">جاري التحميل…</p>
      ) : rows.length === 0 && !missingTable ? (
        <EmptyState
          title="لا قوالب بعد"
          description="أنشئ قالباً لرسائل التذكير والمشاركة الرقمية"
          action={{
            label: 'قالب جديد',
            onClick: () => {
              setForm(emptyForm);
              setEditing(true);
            },
          }}
        />
      ) : (
        <div className="space-y-2">
          {rows.map((t) => (
            <HorizonCard key={t.id} className="!p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-white">{t.title}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/60">
                      {PRINCIPAL_REMINDER_KINDS.find((k) => k.id === t.category)?.label ?? t.category}
                    </span>
                    {!t.is_active && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-200">
                        متوقف
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-muted mt-2 whitespace-pre-wrap line-clamp-3">{t.body}</p>
                </div>
                <div className="flex flex-wrap gap-1 h-fit">
                  <Button size="sm" variant="secondary" onClick={() => startEdit(t)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="secondary" disabled={dupMut.isPending} onClick={() => dupMut.mutate(t.id)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={deleteMut.isPending}
                    onClick={() => {
                      if (confirm('حذف هذا القالب؟')) deleteMut.mutate(t.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-300" />
                  </Button>
                </div>
              </div>
            </HorizonCard>
          ))}
        </div>
      )}
    </RolePageShell>
  );
}
