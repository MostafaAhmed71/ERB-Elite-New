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
  REVIEW_STATUS_LABELS,
  gradesForLevel,
  formatGradeLabel,
  HIGH_SCHOOL_SUGGESTED_SUBJECTS,
  PUBLIC_SECONDARY_REVIEWS_PATH,
} from '../../lib/academic/constants';
import type {
  AcademicEducationLevel,
  AcademicExamReview,
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
  if (status === 'awaitingPrincipal') return 'info';
  if (status === 'needsRevision') return 'danger';
  if (status === 'sentToParent') return 'success';
  return 'default';
}

function actionTakenLabel(r: AcademicExamReview): string {
  if (r.status === 'pending') return 'بانتظار المشرف التربوي';
  if (r.status === 'needsRevision') return 'أُعيد للمعلم للتعديل';
  if (r.status === 'awaitingPrincipal') return 'أُرسل للمدير للاعتماد';
  if (r.status === 'sentToParent') return 'اعتمد المدير ونُشر';
  if (r.status === 'approved') return 'اعتمد المشرف — بانتظار المراجع';
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

function ReviewCard({
  review,
  actions,
  showActionTaken,
}: {
  review: AcademicExamReview;
  actions?: React.ReactNode;
  showActionTaken?: boolean;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const { user: viewer, role: viewerRole } = useAuthStore();
  const canViewHistory = viewer?.id === review.teacher_id || ['supervisor', 'reviewer', 'principal'].includes(viewerRole ?? '');
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: history = [], isLoading: historyLoading, error: historyError } = useQuery({
    queryKey: ['academic-reviews', 'history', review.id, review.status, review.uploaded_at, viewer?.id, viewerRole],
    queryFn: () => academicExamReviewService.listHistory(review.id),
    enabled: historyOpen && canViewHistory,
  });
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
            {formatWhen(review.reviewer_reviewed_at) && (
              <span>مراجعة: {formatWhen(review.reviewer_reviewed_at)}</span>
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

      {canViewHistory && <details onToggle={(event) => setHistoryOpen(event.currentTarget.open)} className="text-sm rounded-xl border border-white/10 p-3">
          <summary className="cursor-pointer">سجل النسخ والاعتمادات</summary>
          {historyLoading && <p>جاري تحميل السجل...</p>}
          {historyError && <p role="alert">تعذر تحميل سجل المراجعة</p>}
          {!historyLoading && !historyError && history.length === 0 && <p>لا يوجد سجل بعد.</p>}
          <ol className="space-y-3 mt-3">
            {history.map((event, i) => (
              <li key={`${event.at}-${i}`}>
                <p>{formatWhen(event.at)} · {({ teacher: 'المعلم', supervisor: 'المشرف التربوي', reviewer: 'المراجع', principal: 'المدير', legacy: 'نسخة سابقة' } as Record<string, string>)[event.role] ?? event.role} · {REVIEW_STATUS_LABELS[event.status]}</p>
                {event.notes && <p className="whitespace-pre-wrap">{event.notes}</p>}
                <a href={event.file_url} target="_blank" rel="noreferrer" className="underline">{event.file_name}</a>
              </li>
            ))}
          </ol>
        </details>}

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
    </div>
  );
}

function NotesPrompt({
  label,
  onConfirm,
  onCancel,
  pending,
  required = false,
}: {
  label: string;
  onConfirm: (notes: string) => void;
  onCancel: () => void;
  pending?: boolean;
  required?: boolean;
}) {
  const [notes, setNotes] = useState('');
  return (
    <div className="w-full rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
      <p className="text-white/60 text-xs">{label}</p>
      <textarea
        className={academicInputClass}
        rows={2}
        aria-label={label}
        required={required}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={required ? "ملاحظات التعديل (إلزامي)" : "ملاحظات (اختياري)"}
      />
      <div className="flex gap-2">
        <button type="button" className={academicBtnPrimary} disabled={pending || (required && !notes.trim())} onClick={() => onConfirm(notes)}>
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
  const isReviewStaff = isReviewer || isSupervisor;
  const isPrincipal = role === 'principal';
  const isDeputy = role === 'deputy';

  const [filesByType, setFilesByType] = useState(emptyFilesByType);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState<AcademicEducationLevel>('middle');
  const [grade, setGrade] = useState(1);
  const [principalTab, setPrincipalTab] = useState<PrincipalTab>('inbox');
  const [uploadExtra, setUploadExtra] = useState('');
  const [activeUploadFile, setActiveUploadFile] = useState<File | null>(null);
  const [reviewerTab, setReviewerTab] = useState<ReviewerTab>('inbox');
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
    queryKey: ['academic-reviews', user?.id, role, principalTab, reviewerTab],
    queryFn: () => {
      if (isTeacher && user) return academicExamReviewService.listByTeacher(user.id);
      if (isReviewStaff) {
        return reviewerTab === 'inbox'
          ? (isSupervisor ? academicExamReviewService.listForSupervisor() : academicExamReviewService.listForReviewer())
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

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['academic-reviews'] });
    qc.invalidateQueries({ queryKey: ['published-academic-reviews'] });
    qc.invalidateQueries({ queryKey: ['academic-reviews-reviewer-inbox'] });
    qc.invalidateQueries({ queryKey: ['supervisor', 'academic-snapshot'] });
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
          : `تم رفع ${results.length} ملف — بانتظار المراجع`,
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
      toast.success('تم إعادة الرفع للمشرف التربوي');
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

  const submitMut = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      isSupervisor ? academicExamReviewService.submitToReviewer(id, notes) : academicExamReviewService.submitToPrincipal(id, user!.id, notes),
    onSuccess: () => {
      toast.success(isSupervisor ? 'اعتمدت المراجعة وأُرسلت للمراجع' : 'أُرسل للمدير للاعتماد');
      setActionFor(null);
      setReviewerTab('all');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviseMut = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      academicExamReviewService.requestRevision(id, notes, {
        role: isSupervisor ? 'supervisor' : isReviewer ? 'reviewer' : 'principal',
        userId: user!.id,
      }),
    onSuccess: () => {
      toast.success('أُعيد للمعلم للتعديل');
      setActionFor(null);
      if (isReviewStaff) setReviewerTab('all');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publishMut = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      academicExamReviewService.publish(id, notes),
    onSuccess: () => {
      toast.success('تم الاعتماد والنشر للطالب وولي الأمر');
      setActionFor(null);
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
    ? 'المعلم ← المشرف التربوي ← المراجع ← المدير للاعتماد النهائي والنشر'
    : isReviewStaff
      ? 'راجع الملفات، عاينها داخل الشاشة، وتابع كل الطلبات والإجراءات'
      : isPrincipal
        ? 'ارفع ملفات كل أنواع المراجعة دفعة واحدة حسب المرحلة والصف، أو اعتمد ملفات المعلمين'
        : 'متابعة الملفات المنشورة';

  const emptyMessage = isReviewStaff
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
                : 'مسار الاعتماد: معلم → مراجع → مدير → نشر. يمكنك رفع أكثر من نوع في نفس العملية (صورة أو PDF).'}
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

      {isReviewStaff && (
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
                showActionTaken={isReviewStaff && reviewerTab === 'all'}
                actions={
                  <>
                    {isReviewStaff && reviewerTab === 'inbox' && r.status === (isSupervisor ? 'pending' : 'approved') && (
                      <>
                        <button
                          type="button"
                          className={academicBtnPrimary}
                          onClick={() => setActionFor({ id: r.id, kind: 'submit' })}
                        >
                          <Send className="w-4 h-4" /> {isSupervisor ? 'اعتماد وإرسال للمراجع' : 'اعتماد وإرسال للمدير'}
                        </button>
                        <button
                          type="button"
                          className={academicBtnDanger}
                          onClick={() => setActionFor({ id: r.id, kind: 'revise' })}
                        >
                          <RotateCcw className="w-4 h-4" /> يحتاج تعديل
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
                          <CheckCircle2 className="w-4 h-4" /> اعتماد نهائي ونشر
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
                    {(isPrincipal || (isTeacher && ['pending', 'needsRevision'].includes(r.status))) && (
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
                  label={isSupervisor ? "اعتماد وإرسال للمراجع" : "إرسال للمدير للاعتماد والنشر"}
                  pending={submitMut.isPending}
                  onCancel={() => setActionFor(null)}
                  onConfirm={(notes) => submitMut.mutate({ id: r.id, notes })}
                />
              )}
              {actionFor?.id === r.id && actionFor.kind === 'revise' && (
                <NotesPrompt
                  required
                  label="سبب طلب التعديل من المعلم (إلزامي)"
                  pending={reviseMut.isPending}
                  onCancel={() => setActionFor(null)}
                  onConfirm={(notes) => reviseMut.mutate({ id: r.id, notes })}
                />
              )}
              {actionFor?.id === r.id && actionFor.kind === 'publish' && (
                <NotesPrompt
                  label="اعتماد الملف ونشره للطالب وولي الأمر"
                  pending={publishMut.isPending}
                  onCancel={() => setActionFor(null)}
                  onConfirm={(notes) => publishMut.mutate({ id: r.id, notes })}
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
          عرض المنشورات فقط — الاعتماد يتم عبر المراجع ثم المدير.
        </p>
      )}
    </AcademicLayout>
  );
}
