import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, Send, RotateCcw, CheckCircle2, FileText, Download, Eye, EyeOff, Trash2,
  Link2, Copy, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { academicExamReviewService } from '../../lib/academic/adminService';
import { academicTeacherService } from '../../lib/academic/teacherService';
import {
  EXAM_REVIEW_TYPE_LABELS,
  EXAM_REVIEW_TYPES,
  REVIEW_ACTOR_ROLE_LABELS,
  REVIEW_EVENT_LABELS,
  REVIEW_STATUS_LABELS,
  gradesForLevel,
  formatGradeLabel,
  HIGH_SCHOOL_SUGGESTED_SUBJECTS,
  PUBLIC_SECONDARY_REVIEWS_PATH,
} from '../../lib/academic/constants';
import type {
  AcademicEducationLevel,
  AcademicExamReview,
  AcademicExamReviewEvent,
  AcademicExamReviewType,
} from '../../lib/academic/types';
import {
  AcademicLayout,
  AcademicPageHeader,
  AcademicEmpty,
  AcademicBadge,
  academicInputClass,
  academicBtnPrimary,
  academicBtnSecondary,
  academicBtnDanger,
} from '../../components/academic/AcademicUi';
import { AcademicSubjectSelect } from '../../components/academic/AcademicSubjectSelect';
import { subjectsFromTeacherSetup } from '../../lib/academic/subjectHelpers';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { downloadFileFromUrl } from '../../lib/downloadFile';

const REVIEW_FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.gif,application/pdf,image/jpeg,image/png,image/webp,image/gif';

function isImageReview(review: Pick<AcademicExamReview, 'file_type' | 'file_name' | 'file_url'>): boolean {
  if (review.file_type?.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|gif)$/i.test(review.file_name || review.file_url || '');
}

function buildForcedDownloadUrl(fileUrl: string, fileName: string): string | null {
  try {
    const u = new URL(fileUrl);
    const parts = u.pathname.split('/').filter(Boolean);
    const stored = parts[parts.length - 1];
    if (!stored || !/\.(pdf|jpe?g|png|webp|gif)$/i.test(stored)) return null;
    const basePath = parts.slice(0, -1).join('/');
    return `${u.origin}/${basePath}/download.php?f=${encodeURIComponent(stored)}&name=${encodeURIComponent(fileName)}`;
  } catch {
    return null;
  }
}

function statusVariant(status: AcademicExamReview['status']): 'warning' | 'success' | 'danger' | 'info' | 'default' {
  if (status === 'pending') return 'warning';
  if (status === 'awaitingReviewer') return 'info';
  if (status === 'awaitingPrincipal') return 'info';
  if (status === 'needsRevision') return 'danger';
  if (status === 'sentToParent') return 'success';
  return 'default';
}

function actionTakenLabel(r: AcademicExamReview): string {
  if (r.status === 'pending') return 'بانتظار المشرف التربوي';
  if (r.status === 'awaitingReviewer') return 'اعتمد المشرف — بانتظار المراجع';
  if (r.status === 'needsRevision') return 'أُعيد للمعلم للتعديل';
  if (r.status === 'awaitingPrincipal') return 'اعتمد المراجع — بانتظار المدير';
  if (r.status === 'sentToParent') return 'اعتمد المدير ونُشر';
  if (r.status === 'approved') return 'معتمد';
  return REVIEW_STATUS_LABELS[r.status] ?? r.status;
}

function formatWhen(iso?: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('ar-SA', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}

function UploadProgressBar({
  percent,
  phase,
  file,
  extra,
}: {
  percent: number;
  phase: 'upload' | 'save' | 'idle';
  file?: File | null;
  extra?: string;
}) {
  if (phase === 'idle') return null;
  const label = extra
    || (phase === 'save' ? 'جاري حفظ الملف في النظام...' : 'جاري رفع الملف...');
  const shown = Math.min(100, Math.max(0, percent));
  return (
    <div className="rounded-xl border border-gold-400/25 bg-gold-500/10 px-3 py-3 space-y-2" dir="rtl">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-gold-200 font-semibold">{label}</span>
        <span className="text-white tabular-nums font-bold">{shown}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-black/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-l from-gold-400 to-gold-500 transition-[width] duration-200"
          style={{ width: `${shown}%` }}
        />
      </div>
      {file && (
        <p className="text-[11px] text-white/45 truncate">
          {file.name} · {formatFileSize(file.size)}
        </p>
      )}
    </div>
  );
}

function emptyFilesByType(): Record<AcademicExamReviewType, File | null> {
  return {
    exam: null,
    solvedReview: null,
    unsolvedReview: null,
    testSchedule: null,
  };
}

function ReviewHistory({ events }: { events: AcademicExamReviewEvent[] }) {
  if (events.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/8 bg-black/20 p-3 space-y-2">
      <p className="text-[11px] font-semibold text-white/50">سجل النسخ والاعتماد</p>
      <ol className="space-y-2">
        {events.map((event) => (
          <li key={event.id} className="text-xs text-white/70 leading-relaxed">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-gold-300 font-semibold">
                {REVIEW_EVENT_LABELS[event.action] ?? event.action}
              </span>
              <span className="text-white/35">نسخة {event.version}</span>
              {formatWhen(event.created_at) && (
                <span className="text-white/35">{formatWhen(event.created_at)}</span>
              )}
            </div>
            <p className="text-white/50 mt-0.5">
              {REVIEW_ACTOR_ROLE_LABELS[event.actor_role ?? ''] ?? event.actor_role ?? 'النظام'}
              {event.actor_name ? ` — ${event.actor_name}` : ''}
            </p>
            {event.notes && <p className="text-amber-200/80 mt-0.5">الملاحظات: {event.notes}</p>}
            {event.file_name && event.action === 'archived' && (
              <p className="text-white/35 mt-0.5">الملف السابق: {event.file_name}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ReviewCard({
  review,
  actions,
  showActionTaken,
  events = [],
}: {
  review: AcademicExamReview;
  actions?: React.ReactNode;
  showActionTaken?: boolean;
  events?: AcademicExamReviewEvent[];
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const fileUrl = review.file_url?.trim() || '';
  const imagePreview = isImageReview(review);
  const downloadName = review.file_name || (imagePreview ? 'review.jpg' : 'review.pdf');

  const handleDownload = async () => {
    if (!fileUrl || downloading) return;
    setDownloading(true);
    try {
      await downloadFileFromUrl(fileUrl, downloadName);
      toast.success('بدأ التحميل');
    } catch (e) {
      try {
        const forced = buildForcedDownloadUrl(fileUrl, downloadName);
        if (forced) {
          await downloadFileFromUrl(forced, downloadName);
          toast.success('بدأ التحميل');
        } else {
          throw e;
        }
      } catch {
        toast.error(e instanceof Error ? e.message : 'تعذّر التحميل المباشر');
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111c44] p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-white font-bold">
            {review.subject} — {formatGradeLabel(review.education_level, review.grade)}
          </h3>
          <p className="text-[#A3AED0] text-sm mt-0.5">
            {review.teacher_name} · {EXAM_REVIEW_TYPE_LABELS[review.type]}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <AcademicBadge variant={statusVariant(review.status)}>
              {REVIEW_STATUS_LABELS[review.status] ?? review.status}
            </AcademicBadge>
            {(review.version_number ?? 1) > 1 && (
              <AcademicBadge variant="default">النسخة {review.version_number}</AcademicBadge>
            )}
            {showActionTaken && (
              <span className="text-xs text-white/50">{actionTakenLabel(review)}</span>
            )}
          </div>
          {(review.supervisor_notes || review.reviewer_notes || review.principal_notes) && (
            <div className="mt-2 space-y-1 text-xs text-white/55">
              {review.supervisor_notes && <p>ملاحظة المشرف التربوي: {review.supervisor_notes}</p>}
              {review.reviewer_notes && <p>ملاحظة المراجع: {review.reviewer_notes}</p>}
              {review.principal_notes && <p>ملاحظة المدير: {review.principal_notes}</p>}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-white/35">
            {formatWhen(review.uploaded_at) && <span>رفع: {formatWhen(review.uploaded_at)}</span>}
            {formatWhen(review.supervisor_reviewed_at) && (
              <span>مشرف: {formatWhen(review.supervisor_reviewed_at)}</span>
            )}
            {formatWhen(review.reviewer_reviewed_at) && (
              <span>مراجع: {formatWhen(review.reviewer_reviewed_at)}</span>
            )}
            {formatWhen(review.sent_to_parent_at) && (
              <span>نشر: {formatWhen(review.sent_to_parent_at)}</span>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2 items-start">{actions}</div>}
      </div>

      {fileUrl ? (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5">
          <button
            type="button"
            className={academicBtnSecondary}
            onClick={() => setPreviewOpen((v) => !v)}
          >
            {previewOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {previewOpen ? 'إخفاء المعاينة' : 'عرض الملف داخل الشاشة'}
          </button>
          <button
            type="button"
            className={academicBtnSecondary}
            onClick={() => void handleDownload()}
            disabled={downloading}
          >
            <Download className="w-4 h-4" />
            {downloading ? 'جاري التحميل...' : 'تحميل الملف'}
          </button>
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-gold-400 text-sm hover:underline px-2"
          >
            <FileText className="w-3.5 h-3.5" />
            {review.file_name || 'فتح في تبويب جديد'}
          </a>
        </div>
      ) : (
        <p className="text-amber-300/80 text-xs">لا يوجد رابط ملف لهذا الطلب</p>
      )}

      {previewOpen && fileUrl && (
        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40">
          {imagePreview ? (
            <img
              src={fileUrl}
              alt={review.file_name || 'معاينة الصورة'}
              className="w-full max-h-[min(70vh,640px)] object-contain bg-black"
            />
          ) : (
            <iframe
              title={`معاينة ${review.file_name || 'الملف'}`}
              src={`${fileUrl}#toolbar=1&navpanes=0`}
              className="w-full h-[min(70vh,640px)] bg-white"
            />
          )}
        </div>
      )}

      <ReviewHistory events={events} />
    </div>
  );
}

function NotesPrompt({
  label,
  onConfirm,
  onCancel,
  pending,
  required,
}: {
  label: string;
  onConfirm: (notes: string) => void;
  onCancel: () => void;
  pending?: boolean;
  required?: boolean;
}) {
  const [notes, setNotes] = useState('');
  const trimmed = notes.trim();
  return (
    <div className="w-full rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
      <p className="text-white/60 text-xs">{label}</p>
      <textarea
        className={academicInputClass}
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={required ? 'الملاحظات إلزامية' : 'ملاحظات (اختياري)'}
      />
      <div className="flex gap-2">
        <button
          type="button"
          className={academicBtnPrimary}
          disabled={pending || (required && !trimmed)}
          onClick={() => onConfirm(notes)}
        >
          تأكيد
        </button>
        <button type="button" className={academicBtnSecondary} onClick={onCancel}>
          إلغاء
        </button>
      </div>
    </div>
  );
}

function PublicSecondaryLinkCard() {
  const url = `${window.location.origin}${PUBLIC_SECONDARY_REVIEWS_PATH}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('تم نسخ الرابط');
    } catch {
      toast.error('تعذّر النسخ — انسخ الرابط يدوياً');
    }
  };
  return (
    <div className="rounded-2xl border border-gold-400/20 bg-gold-500/[0.07] p-4 mb-6 space-y-2">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-gold-300" />
        <h3 className="text-white font-bold text-sm">صفحة طلاب الثانوي العامة (بدون تسجيل دخول)</h3>
      </div>
      <p className="text-white/55 text-xs">
        كل ما تنشره للمرحلة الثانوية يظهر فوراً في هذه الصفحة حسب الصف — أرسل الرابط للطلاب ليعرضوا الملفات أو يحمّلوها.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code
          dir="ltr"
          className="flex-1 min-w-0 truncate rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-xs text-white/80"
        >
          {url}
        </code>
        <button type="button" className={academicBtnSecondary} onClick={() => void copy()}>
          <Copy className="w-4 h-4" /> نسخ الرابط
        </button>
        <a href={url} target="_blank" rel="noreferrer" className={academicBtnSecondary}>
          <ExternalLink className="w-4 h-4" /> فتح الصفحة
        </a>
      </div>
    </div>
  );
}

type ReviewerTab = 'inbox' | 'all';
type PrincipalTab = 'inbox' | 'published';

export function AcademicExamReviewsPage() {
  const { user, role } = useAuthStore();
  const qc = useQueryClient();
  const isTeacher = role === 'teacher';
  const isReviewer = role === 'reviewer';
  const isSupervisor = role === 'supervisor';
  const isPrincipal = role === 'principal';
  const isDeputy = role === 'deputy';
  const supervisorLevel = user?.staff_education_level === 'middle' || user?.staff_education_level === 'high'
    ? user.staff_education_level
    : null;

  const [filesByType, setFilesByType] = useState(emptyFilesByType);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState<AcademicEducationLevel>('middle');
  const [grade, setGrade] = useState(1);
  const [principalTab, setPrincipalTab] = useState<PrincipalTab>('inbox');
  const [uploadExtra, setUploadExtra] = useState('');
  const [activeUploadFile, setActiveUploadFile] = useState<File | null>(null);
  const [reviewerTab, setReviewerTab] = useState<ReviewerTab>('inbox');
  const [supervisorTab, setSupervisorTab] = useState<ReviewerTab>('inbox');
  const [filterLevel, setFilterLevel] = useState<AcademicEducationLevel | ''>('');
  const [filterGrade, setFilterGrade] = useState<number | ''>('');
  const [filterType, setFilterType] = useState<AcademicExamReviewType | ''>('');
  const [actionFor, setActionFor] = useState<{ id: string; kind: 'revise' | 'submit' | 'publish' | 'delete' } | null>(null);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'upload' | 'save'>('idle');
  const [replacePercent, setReplacePercent] = useState(0);
  const [replacePhase, setReplacePhase] = useState<'idle' | 'upload' | 'save'>('idle');

  const { data: setup } = useQuery({
    queryKey: ['academic-teacher-setup', user?.id],
    queryFn: () => academicTeacherService.getSetup(user!.id),
    enabled: isTeacher && !!user,
  });

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['academic-reviews', user?.id, role, principalTab, reviewerTab, supervisorTab, supervisorLevel],
    queryFn: () => {
      if (isTeacher && user) return academicExamReviewService.listByTeacher(user.id);
      if (isSupervisor) {
        return supervisorTab === 'inbox'
          ? academicExamReviewService.listForSupervisor(supervisorLevel)
          : academicExamReviewService.listAllForSupervisor(supervisorLevel);
      }
      if (isReviewer) {
        return reviewerTab === 'inbox'
          ? academicExamReviewService.listForReviewer()
          : academicExamReviewService.listAllForReviewer();
      }
      if (isPrincipal) {
        return principalTab === 'inbox'
          ? academicExamReviewService.listForPrincipal()
          : academicExamReviewService.listPublished();
      }
      return academicExamReviewService.listPublished();
    },
    enabled: !!user,
  });

  const reviewIds = reviews.map((r) => r.id);
  const { data: reviewEvents = [] } = useQuery({
    queryKey: ['academic-review-events', reviewIds.join(',')],
    queryFn: () => academicExamReviewService.listEvents(reviewIds),
    enabled: reviewIds.length > 0,
  });
  const eventsByReview = reviewEvents.reduce<Record<string, AcademicExamReviewEvent[]>>((acc, event) => {
    (acc[event.review_id] ??= []).push(event);
    return acc;
  }, {});

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['academic-reviews'] });
    qc.invalidateQueries({ queryKey: ['academic-review-events'] });
    qc.invalidateQueries({ queryKey: ['published-academic-reviews'] });
  };

  const selectedUploads = EXAM_REVIEW_TYPES
    .map((reviewType) => ({ type: reviewType, file: filesByType[reviewType] }))
    .filter((item): item is { type: AcademicExamReviewType; file: File } => !!item.file);

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!user || !subject) throw new Error('أكمل البيانات والملف');
      if (!selectedUploads.length) throw new Error('اختر ملفاً واحداً على الأقل');
      setUploadPhase('upload');
      setUploadPercent(0);
      const total = selectedUploads.length;
      const results = [];
      for (let i = 0; i < total; i += 1) {
        const item = selectedUploads[i];
        setActiveUploadFile(item.file);
        setUploadExtra(`رفع ${EXAM_REVIEW_TYPE_LABELS[item.type]} (${i + 1} من ${total})`);
        setUploadPhase('upload');
        const onProgress = (p: { percent: number }) => {
          const overall = Math.round(((i + p.percent / 100) / total) * 100);
          setUploadPercent(overall);
          setUploadPhase(p.percent >= 100 ? 'save' : 'upload');
          if (p.percent >= 100) {
            setUploadExtra(`حفظ ${EXAM_REVIEW_TYPE_LABELS[item.type]} (${i + 1} من ${total})`);
          }
        };
        const shared = { subject, education_level: level, grade, type: item.type };
        if (isPrincipal) {
          results.push(await academicExamReviewService.uploadByPrincipal(item.file, {
            principal_id: user.id,
            principal_name: user.full_name,
            ...shared,
          }, onProgress));
        } else {
          results.push(await academicExamReviewService.uploadReview(item.file, {
            teacher_id: user.id,
            teacher_name: user.full_name,
            ...shared,
          }, onProgress));
        }
      }
      setUploadPercent(100);
      setUploadPhase('save');
      return results;
    },
    onSuccess: (results) => {
      toast.success(
        isPrincipal
          ? `تم رفع ونشر ${results.length} ملف لطلاب الصف`
          : `تم رفع ${results.length} ملف — بانتظار المشرف التربوي`,
      );
      setFilesByType(emptyFilesByType());
      setFileInputKey((k) => k + 1);
      setUploadPhase('idle');
      setUploadPercent(0);
      setUploadExtra('');
      setActiveUploadFile(null);
      if (isPrincipal) setPrincipalTab('published');
      invalidate();
    },
    onError: (e: Error) => {
      setUploadPhase('idle');
      setUploadPercent(0);
      setUploadExtra('');
      setActiveUploadFile(null);
      toast.error(e.message);
    },
  });

  const replaceMut = useMutation({
    mutationFn: async () => {
      if (!replaceId || !replaceFile || !user) throw new Error('اختر ملفاً');
      setReplacePhase('upload');
      setReplacePercent(0);
      const result = await academicExamReviewService.replaceReviewFile(
        replaceId,
        user.id,
        replaceFile,
        (p) => {
          setReplacePercent(p.percent);
          setReplacePhase(p.percent >= 100 ? 'save' : 'upload');
        },
      );
      setReplacePhase('save');
      setReplacePercent(100);
      return result;
    },
    onSuccess: () => {
      toast.success('تم رفع النسخة الجديدة — بانتظار المشرف التربوي');
      setReplaceId(null);
      setReplaceFile(null);
      setReplacePhase('idle');
      setReplacePercent(0);
      invalidate();
    },
    onError: (e: Error) => {
      setReplacePhase('idle');
      setReplacePercent(0);
      toast.error(e.message);
    },
  });

  const decideMut = useMutation({
    mutationFn: ({ id, action, notes }: { id: string; action: 'approve' | 'reject'; notes?: string }) =>
      academicExamReviewService.decide(id, action, notes),
    onSuccess: (_row, vars) => {
      toast.success(
        vars.action === 'reject'
          ? 'أُعيد للمعلم للتعديل'
          : isSupervisor
            ? 'أُرسل للمراجع'
            : isReviewer
              ? 'أُرسل للمدير للاعتماد'
              : 'تم الاعتماد والنشر للطالب وولي الأمر',
      );
      setActionFor(null);
      if (isSupervisor) setSupervisorTab('all');
      if (isReviewer) setReviewerTab('all');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: ({ id, fileUrl }: { id: string; fileUrl?: string | null }) =>
      academicExamReviewService.deleteReview(id, fileUrl),
    onSuccess: () => {
      toast.success('تم حذف الملف');
      setActionFor(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'تعذّر حذف الملف'),
  });

  const subtitle = isTeacher
    ? 'ارفع الملف ليعتمده المشرف التربوي ثم المراجع ثم المدير'
    : isSupervisor
      ? 'اعتمد الملف لينتقل للمراجع، أو أرجعه للمعلم مع ملاحظات إلزامية'
      : isReviewer
        ? 'راجع الملفات المعتمدة من المشرف، ثم أرسلها للمدير أو أعدها للمعلم'
        : isPrincipal
          ? 'ارفع ملفات كل أنواع المراجعة دفعة واحدة حسب المرحلة والصف، أو اعتمد ملفات المعلمين'
          : 'متابعة الملفات المنشورة';

  const emptyMessage = isSupervisor
    ? supervisorTab === 'inbox'
      ? 'لا ملفات بانتظار المشرف التربوي'
      : 'لا توجد طلبات بعد'
    : isReviewer
      ? reviewerTab === 'inbox'
        ? 'لا ملفات بانتظار المراجعة'
        : 'لا توجد طلبات بعد'
      : isPrincipal && principalTab === 'inbox'
        ? 'لا ملفات بانتظار اعتمادك'
        : isPrincipal && principalTab === 'published' && (filterLevel || filterGrade || filterType)
          ? 'لا توجد مراجعات مطابقة للتصفية'
          : 'لا توجد مراجعات';

  const visibleReviews = reviews.filter((r) => {
    if (!isPrincipal || principalTab !== 'published') return true;
    if (filterLevel && r.education_level !== filterLevel) return false;
    if (filterGrade && r.grade !== filterGrade) return false;
    if (filterType && r.type !== filterType) return false;
    return true;
  });

  const canUpload = isTeacher || isPrincipal;

  return (
    <AcademicLayout size="6xl">
      <AcademicPageHeader title="مراجعات وملفات الاختبارات" subtitle={subtitle} />

      {isPrincipal && <PublicSecondaryLinkCard />}

      {canUpload && (
        <div className="rounded-2xl border border-white/10 bg-[#111c44] p-5 mb-6 space-y-3">
          <div>
            <h3 className="text-white font-bold text-sm">
              {isPrincipal ? 'رفع مراجعات الصف دفعة واحدة' : 'رفع ملفات للمشرف التربوي دفعة واحدة'}
            </h3>
            <p className="text-white/50 text-xs mt-1">
              {isPrincipal
                ? 'اختر المرحلة والصف والمادة، ثم ضع صورة أو PDF لكل نوع تريده واضغط رفع مرة واحدة — يُنشر فوراً لطلاب هذا الصف.'
                : 'مسار الاعتماد: معلم → مشرف تربوي → مراجع → مدير → نشر. يمكنك رفع أكثر من نوع في نفس العملية (صورة أو PDF).'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="المرحلة">
            {(['middle', 'high'] as const).map((lv) => (
              <button
                key={lv}
                type="button"
                role="tab"
                aria-selected={level === lv}
                disabled={uploadMut.isPending}
                onClick={() => {
                  if (lv === level) return;
                  setLevel(lv);
                  setGrade(gradesForLevel(lv)[0]);
                  setSubject('');
                }}
                className={clsx(
                  'rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors disabled:opacity-50',
                  level === lv
                    ? 'bg-gold-500/20 text-gold-200 border-gold-400/50'
                    : 'bg-white/[0.04] text-white/60 border-white/10 hover:bg-white/[0.08]',
                )}
              >
                {lv === 'middle' ? 'المرحلة المتوسطة' : 'المرحلة الثانوية'}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <select
              className={academicInputClass}
              value={grade}
              disabled={uploadMut.isPending}
              onChange={(e) => {
                setGrade(+e.target.value);
                setSubject('');
              }}
            >
              {gradesForLevel(level).map((g) => (
                <option key={g} value={g}>
                  {formatGradeLabel(level, g)}
                </option>
              ))}
            </select>
            <AcademicSubjectSelect
              level={level}
              grade={grade}
              value={subject}
              onChange={setSubject}
              teacherSetupSubjects={isTeacher ? subjectsFromTeacherSetup(setup, level, grade) : undefined}
              suggestions={level === 'high' ? HIGH_SCHOOL_SUGGESTED_SUBJECTS : undefined}
              required
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {EXAM_REVIEW_TYPES.map((reviewType) => {
              const chosen = filesByType[reviewType];
              return (
                <div
                  key={reviewType}
                  className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-white text-sm font-semibold">
                      {EXAM_REVIEW_TYPE_LABELS[reviewType]}
                      <span className="text-white/35 font-normal mr-1">· صورة أو PDF</span>
                    </p>
                    {chosen && (
                      <button
                        type="button"
                        className="text-[11px] text-red-300 hover:underline disabled:opacity-40"
                        disabled={uploadMut.isPending}
                        onClick={() => setFilesByType((prev) => ({ ...prev, [reviewType]: null }))}
                      >
                        إزالة
                      </button>
                    )}
                  </div>
                  <input
                    key={`${fileInputKey}-${reviewType}`}
                    type="file"
                    accept={REVIEW_FILE_ACCEPT}
                    className={academicInputClass}
                    disabled={uploadMut.isPending}
                    onChange={(e) =>
                      setFilesByType((prev) => ({
                        ...prev,
                        [reviewType]: e.target.files?.[0] ?? null,
                      }))
                    }
                  />
                  {chosen && (
                    <p className="text-[11px] text-white/45 truncate">
                      {chosen.name} · {formatFileSize(chosen.size)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <UploadProgressBar
            percent={uploadPercent}
            phase={uploadPhase}
            file={activeUploadFile}
            extra={uploadExtra}
          />
          <button
            type="button"
            className={academicBtnPrimary}
            onClick={() => uploadMut.mutate()}
            disabled={!selectedUploads.length || !subject || uploadMut.isPending}
          >
            <Upload className="w-4 h-4" />
            {uploadMut.isPending
              ? `${uploadExtra || 'جاري الرفع...'} — ${uploadPercent}%`
              : selectedUploads.length
                ? isPrincipal
                  ? `رفع ونشر ${selectedUploads.length} ملفات للصف`
                  : `رفع ${selectedUploads.length} ملفات للمشرف التربوي`
                : 'اختر ملفاً واحداً على الأقل'}
          </button>
        </div>
      )}

      {isSupervisor && (
        <div className="flex flex-wrap gap-2 mb-4">
          {(
            [
              { key: 'inbox' as const, label: 'وارد للمشرف التربوي' },
              { key: 'all' as const, label: 'كل الطلبات والإجراءات' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setSupervisorTab(t.key)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-semibold border',
                supervisorTab === t.key
                  ? 'bg-gold-500/20 text-gold-300 border-gold-400/40'
                  : 'bg-white/[0.04] text-white/55 border-white/10',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {isReviewer && (
        <div className="flex flex-wrap gap-2 mb-4">
          {(
            [
              { key: 'inbox' as const, label: 'وارد للمراجعة' },
              { key: 'all' as const, label: 'كل الطلبات والإجراءات' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setReviewerTab(t.key)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-semibold border',
                reviewerTab === t.key
                  ? 'bg-gold-500/20 text-gold-300 border-gold-400/40'
                  : 'bg-white/[0.04] text-white/55 border-white/10',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {isPrincipal && (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: 'inbox' as const, label: 'بانتظار الاعتماد' },
                { key: 'published' as const, label: 'المنشورات' },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setPrincipalTab(t.key)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-semibold border',
                  principalTab === t.key
                    ? 'bg-gold-500/20 text-gold-300 border-gold-400/40'
                    : 'bg-white/[0.04] text-white/55 border-white/10',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {principalTab === 'published' && (
            <div className="flex flex-wrap gap-2">
              <select
                className={`${academicInputClass} max-w-[160px]`}
                value={filterLevel}
                onChange={(e) => {
                  setFilterLevel(e.target.value as AcademicEducationLevel | '');
                  setFilterGrade('');
                }}
              >
                <option value="">كل المراحل</option>
                <option value="middle">متوسط</option>
                <option value="high">ثانوي</option>
              </select>
              <select
                className={`${academicInputClass} max-w-[200px]`}
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value ? +e.target.value : '')}
                disabled={!filterLevel}
              >
                <option value="">كل الصفوف</option>
                {(filterLevel ? gradesForLevel(filterLevel) : []).map((g) => (
                  <option key={g} value={g}>
                    {formatGradeLabel(filterLevel as AcademicEducationLevel, g)}
                  </option>
                ))}
              </select>
              <select
                className={`${academicInputClass} max-w-[200px]`}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as AcademicExamReviewType | '')}
              >
                <option value="">كل الأنواع</option>
                {Object.entries(EXAM_REVIEW_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <TapHandLoader label="جاري التحميل..." />
      ) : visibleReviews.length === 0 ? (
        <AcademicEmpty message={emptyMessage} />
      ) : (
        <div className="space-y-3">
          {visibleReviews.map((r) => (
            <div key={r.id} className="space-y-2">
              <ReviewCard
                review={r}
                events={eventsByReview[r.id] ?? []}
                showActionTaken={(isReviewer && reviewerTab === 'all') || (isSupervisor && supervisorTab === 'all')}
                actions={
                  <>
                    {isSupervisor && supervisorTab === 'inbox' && r.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          className={academicBtnPrimary}
                          onClick={() => setActionFor({ id: r.id, kind: 'submit' })}
                        >
                          <Send className="w-4 h-4" /> إرسال للمراجع
                        </button>
                        <button
                          type="button"
                          className={academicBtnDanger}
                          onClick={() => setActionFor({ id: r.id, kind: 'revise' })}
                        >
                          <RotateCcw className="w-4 h-4" /> مطلوب تعديل
                        </button>
                      </>
                    )}
                    {isReviewer && reviewerTab === 'inbox' && r.status === 'awaitingReviewer' && (
                      <>
                        <button
                          type="button"
                          className={academicBtnPrimary}
                          onClick={() => setActionFor({ id: r.id, kind: 'submit' })}
                        >
                          <Send className="w-4 h-4" /> إرسال للمدير
                        </button>
                        <button
                          type="button"
                          className={academicBtnDanger}
                          onClick={() => setActionFor({ id: r.id, kind: 'revise' })}
                        >
                          <RotateCcw className="w-4 h-4" /> مطلوب تعديل
                        </button>
                      </>
                    )}
                    {isPrincipal && principalTab === 'inbox' && r.status === 'awaitingPrincipal' && (
                      <>
                        <button
                          type="button"
                          className={academicBtnPrimary}
                          onClick={() => setActionFor({ id: r.id, kind: 'publish' })}
                        >
                          <CheckCircle2 className="w-4 h-4" /> اعتماد ورفع
                        </button>
                        <button
                          type="button"
                          className={academicBtnDanger}
                          onClick={() => setActionFor({ id: r.id, kind: 'revise' })}
                        >
                          <RotateCcw className="w-4 h-4" /> إعادة للتعديل
                        </button>
                      </>
                    )}
                    {isTeacher && r.status === 'needsRevision' && (
                      <button
                        type="button"
                        className={academicBtnSecondary}
                        onClick={() => {
                          setReplaceId(r.id);
                          setReplaceFile(null);
                        }}
                      >
                        <Upload className="w-4 h-4" /> إعادة رفع
                      </button>
                    )}
                    {(isPrincipal || isTeacher) && (
                      <button
                        type="button"
                        className={academicBtnDanger}
                        onClick={() => setActionFor({ id: r.id, kind: 'delete' })}
                      >
                        <Trash2 className="w-4 h-4" /> حذف الملف
                      </button>
                    )}
                  </>
                }
              />

              {actionFor?.id === r.id && actionFor.kind === 'submit' && (
                <NotesPrompt
                  label={isSupervisor ? 'إرسال للمراجع بعد اعتماد المشرف التربوي' : 'إرسال للمدير للاعتماد والنشر'}
                  pending={decideMut.isPending}
                  onCancel={() => setActionFor(null)}
                  onConfirm={(notes) => decideMut.mutate({ id: r.id, action: 'approve', notes })}
                />
              )}
              {actionFor?.id === r.id && actionFor.kind === 'revise' && (
                <NotesPrompt
                  label="اكتب الملاحظات — ترجع للمعلم بحالة مطلوب تعديل"
                  required
                  pending={decideMut.isPending}
                  onCancel={() => setActionFor(null)}
                  onConfirm={(notes) => decideMut.mutate({ id: r.id, action: 'reject', notes })}
                />
              )}
              {actionFor?.id === r.id && actionFor.kind === 'publish' && (
                <NotesPrompt
                  label="اعتماد الملف ونشره للطالب وولي الأمر"
                  pending={decideMut.isPending}
                  onCancel={() => setActionFor(null)}
                  onConfirm={(notes) => decideMut.mutate({ id: r.id, action: 'approve', notes })}
                />
              )}
              {actionFor?.id === r.id && actionFor.kind === 'delete' && (
                <div className="w-full rounded-xl border border-red-400/25 bg-red-500/10 p-3 space-y-2">
                  <p className="text-red-100 text-xs">
                    سيتم حذف «{r.file_name || 'الملف'}» لـ {r.subject} — {formatGradeLabel(r.education_level, r.grade)}.
                    يختفي من الطالب وولي الأمر ولا يمكن التراجع.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={academicBtnDanger}
                      disabled={deleteMut.isPending}
                      onClick={() => deleteMut.mutate({ id: r.id, fileUrl: r.file_url })}
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleteMut.isPending ? 'جاري الحذف...' : 'تأكيد الحذف'}
                    </button>
                    <button type="button" className={academicBtnSecondary} onClick={() => setActionFor(null)}>
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
              {isTeacher && replaceId === r.id && (
                <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
                  <input
                    type="file"
                    accept={REVIEW_FILE_ACCEPT}
                    className={academicInputClass}
                    disabled={replaceMut.isPending}
                    onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)}
                  />
                  <UploadProgressBar percent={replacePercent} phase={replacePhase} file={replaceFile} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={academicBtnPrimary}
                      disabled={!replaceFile || replaceMut.isPending}
                      onClick={() => replaceMut.mutate()}
                    >
                      {replaceMut.isPending
                        ? replacePhase === 'save'
                          ? 'جاري الحفظ...'
                          : `جاري الرفع... ${replacePercent}%`
                        : 'رفع النسخة الجديدة'}
                    </button>
                    <button
                      type="button"
                      className={academicBtnSecondary}
                      disabled={replaceMut.isPending}
                      onClick={() => setReplaceId(null)}
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isDeputy && (
        <p className="text-white/40 text-xs mt-4">
          عرض المنشورات فقط — الاعتماد يتم عبر المشرف التربوي ثم المراجع ثم المدير.
        </p>
      )}
    </AcademicLayout>
  );
}
