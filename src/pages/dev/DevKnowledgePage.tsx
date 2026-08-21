import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, RefreshCw, Trash2, Upload } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { HubTabs, type HubTabItem } from '../../components/ui/HubTabs';
import {
  deleteKnowledgeDoc,
  KNOWLEDGE_STATUS_LABELS,
  knowledgeStatusTone,
  listKnowledgeDocs,
  probeKnowledgeText,
  reingestKnowledgeDoc,
  uploadKnowledgeDoc,
  type KnowledgeProbeResult,
} from '../../lib/platformKnowledge';
import { showError, showSuccess } from '../../lib/toast';
import clsx from 'clsx';

type Filter = 'all' | 'pending' | 'processing' | 'ready' | 'failed' | 'needs_review';

const FILTERS: HubTabItem<Filter>[] = [
  { id: 'all', label: 'الكل' },
  { id: 'pending', label: 'انتظار' },
  { id: 'processing', label: 'معالجة' },
  { id: 'needs_review', label: 'مراجعة' },
  { id: 'ready', label: 'جاهز' },
  { id: 'failed', label: 'فشل' },
];

export function DevKnowledgePage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [probeQ, setProbeQ] = useState('');
  const [probeResult, setProbeResult] = useState<KnowledgeProbeResult | null>(null);

  const docsQuery = useQuery({
    queryKey: ['dev', 'knowledge', 'docs'],
    queryFn: listKnowledgeDocs,
    refetchInterval: 12_000,
    retry: false,
  });

  const docs = useMemo(() => {
    const all = docsQuery.data ?? [];
    if (filter === 'all') return all;
    return all.filter((d) => d.status === filter);
  }, [docsQuery.data, filter]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of docsQuery.data ?? []) {
      map[d.status] = (map[d.status] ?? 0) + 1;
    }
    return map;
  }, [docsQuery.data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['dev', 'knowledge'] });

  const uploadMut = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('اختر ملفاً');
      return uploadKnowledgeDoc({ file, title: title.trim() || file.name });
    },
    onSuccess: () => {
      showSuccess('رُفع الملف وبدأت الفهرسة');
      setFile(null);
      setTitle('');
      invalidate();
      qc.invalidateQueries({ queryKey: ['dev', 'pipeline'] });
    },
    onError: (e: Error) => showError(e),
  });

  const reingestMut = useMutation({
    mutationFn: (id: string) => reingestKnowledgeDoc(id),
    onSuccess: () => {
      showSuccess('أُعيدت الفهرسة');
      invalidate();
      qc.invalidateQueries({ queryKey: ['dev', 'pipeline'] });
    },
    onError: (e: Error) => showError(e),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteKnowledgeDoc(id),
    onSuccess: () => {
      showSuccess('حُذف المستند');
      invalidate();
      qc.invalidateQueries({ queryKey: ['dev', 'pipeline'] });
    },
    onError: (e: Error) => showError(e),
  });

  const probeMut = useMutation({
    mutationFn: () => probeKnowledgeText(probeQ.trim(), 8),
    onSuccess: (data) => {
      setProbeResult(data);
      showSuccess(`وُجد ${data.matches.length} مقطع`);
    },
    onError: (e: Error) => showError(e),
  });

  const missing =
    docsQuery.error?.message?.includes('ai_knowledge')
    || docsQuery.error?.message?.includes('schema cache');

  return (
    <RolePageShell>
      <PageHeader
        title="قاعدة المعرفة RAG"
        subtitle="رفع · إعادة فهرسة · اختبار استرجاع — مساحة المطور"
        icon={BookOpen}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/dev/pipeline"
              className="inline-flex items-center justify-center font-semibold px-3 py-1.5 text-xs rounded-lg gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white"
            >
              أنبوب المحتوى
            </Link>
            <Link
              to="/dev/ai/usage"
              className="inline-flex items-center justify-center font-semibold px-3 py-1.5 text-xs rounded-lg gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white"
            >
              مراقبة AI
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => docsQuery.refetch()}
              disabled={docsQuery.isFetching}
            >
              <RefreshCw className={clsx('w-4 h-4', docsQuery.isFetching && 'animate-spin')} />
              تحديث
            </Button>
          </div>
        }
      />

      {missing && (
        <HorizonCard className="border border-amber-500/30 mb-4">
          <p className="text-sm text-amber-200/90">
            جداول المعرفة غير متاحة — طبّق migrations 087–088 و094 إن لزم.
          </p>
        </HorizonCard>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'الإجمالي', value: docsQuery.data?.length ?? 0 },
          { label: 'جاهز', value: counts.ready ?? 0 },
          { label: 'معالجة/انتظار', value: (counts.pending ?? 0) + (counts.processing ?? 0) },
          { label: 'فشل/مراجعة', value: (counts.failed ?? 0) + (counts.needs_review ?? 0) },
        ].map((s) => (
          <HorizonCard key={s.label} className="!p-4">
            <p className="text-xs text-surface-muted">{s.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{s.value}</p>
          </HorizonCard>
        ))}
      </div>

      <HorizonCard className="mb-4 border border-cyan-500/20">
        <p className="text-sm font-medium text-white mb-2">اختبار استرجاع (نصي سريع)</p>
        <p className="text-[11px] text-surface-muted mb-3">
          يبحث في نص المقاطع بدون استدعاء مزود Embeddings. الاسترجاع الدلالي يتم وقت التوليد عبر{' '}
          <code className="text-white/50">match_ai_knowledge</code>. طبّق migration 102 إن لزم.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
            value={probeQ}
            onChange={(e) => setProbeQ(e.target.value)}
            placeholder="كلمة أو جملة من محتوى المستند…"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && probeQ.trim()) probeMut.mutate();
            }}
          />
          <Button
            size="sm"
            disabled={!probeQ.trim() || probeMut.isPending}
            onClick={() => probeMut.mutate()}
          >
            فحص
          </Button>
        </div>
        {probeResult && (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] text-white/50">
              جاهز: {probeResult.ready_docs} · مقاطع: {probeResult.total_chunks} · بمتجه:{' '}
              {probeResult.chunks_with_embedding}
            </p>
            {probeResult.matches.length === 0 ? (
              <p className="text-xs text-amber-200/80">لا نتائج نصية — جرّب كلمة أخرى أو أعد الفهرسة.</p>
            ) : (
              probeResult.matches.map((m) => (
                <div key={m.id} className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                  <p className="text-xs text-cyan-200/90 font-medium">
                    {m.doc_title}{' '}
                    <span className="text-white/40">({m.doc_status})</span>
                    {!m.has_embedding && <span className="text-amber-300/80"> · بلا embedding</span>}
                  </p>
                  <p className="text-[11px] text-white/65 mt-1 leading-relaxed">{m.snippet}</p>
                </div>
              ))
            )}
          </div>
        )}
      </HorizonCard>

      <HorizonCard className="mb-4">
        <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Upload className="w-4 h-4 text-gold-400" />
          رفع مستند معرفة
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <label className="flex-1 text-xs text-surface-muted block">
            العنوان
            <input
              className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="اختياري — اسم الملف افتراضياً"
            />
          </label>
          <label className="flex-1 text-xs text-surface-muted block">
            الملف (PDF / DOCX / TXT)
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              className="mt-1 w-full text-sm text-white/80"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <Button
            size="sm"
            disabled={!file || uploadMut.isPending}
            onClick={() => uploadMut.mutate()}
          >
            {uploadMut.isPending ? 'جاري الرفع…' : 'رفع وفهرسة'}
          </Button>
        </div>
      </HorizonCard>

      <HubTabs tabs={FILTERS} activeId={filter} onChange={setFilter} className="mb-4" ariaLabel="تصفية المستندات" />

      {docsQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <TapHandLoader />
        </div>
      ) : docs.length === 0 ? (
        <HorizonCard>
          <p className="text-sm text-surface-muted text-center py-8">لا مستندات في هذا الفلتر</p>
        </HorizonCard>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <HorizonCard key={d.id} className="!p-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white truncate">{d.title}</h3>
                    <span
                      className={clsx(
                        'text-[11px] px-2 py-0.5 rounded-full border',
                        knowledgeStatusTone(d.status),
                      )}
                    >
                      {KNOWLEDGE_STATUS_LABELS[d.status] ?? d.status}
                    </span>
                  </div>
                  <p className="text-xs text-surface-muted truncate">{d.file_name}</p>
                  <p className="text-[11px] text-white/40 mt-1">
                    مقاطع: {d.chunk_count ?? 0}
                    {d.subject ? ` · ${d.subject}` : ''}
                    {d.grade != null ? ` · صف ${d.grade}` : ''}
                  </p>
                  {d.error_message && (
                    <p className="text-xs text-red-300/90 mt-2 leading-relaxed">{d.error_message}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={reingestMut.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          'تأكيد مزدوج: إعادة فهرسة ستحذف المقاطع القديمة وتعيد التضمين. متابعة؟',
                        )
                      ) {
                        reingestMut.mutate(d.id);
                      }
                    }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    إعادة فهرسة
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="!text-red-300"
                    disabled={deleteMut.isPending}
                    onClick={() => {
                      if (
                        window.confirm('حذف نهائي للمستند ومقاطعه من قاعدة المعرفة؟ لا يمكن التراجع.')
                      ) {
                        deleteMut.mutate(d.id);
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف
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
