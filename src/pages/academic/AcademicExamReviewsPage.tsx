import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, Send, RotateCcw, CheckCircle2, FileText, Download, Eye, EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { academicExamReviewService } from '../../lib/academic/adminService';
import { academicTeacherService } from '../../lib/academic/teacherService';
import {
  EXAM_REVIEW_TYPE_LABELS,
  REVIEW_STATUS_LABELS,
  gradesForLevel,
  formatGradeLabel,
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
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { downloadFileFromUrl } from '../../lib/downloadFile';

function buildForcedDownloadUrl(fileUrl: string, fileName: string): string | null {
  try {
    const u = new URL(fileUrl);
    const parts = u.pathname.split('/').filter(Boolean);
    const stored = parts[parts.length - 1];
    if (!stored || !/\.pdf$/i.test(stored)) return null;
    // .../uploads/exam-reviews/file.pdf → .../uploads/exam-reviews/download.php?f=file.pdf
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
  if (r.status === 'pending') return 'بانتظار إجراء المراجع';
  if (r.status === 'needsRevision') return 'أُعيد للمعلم للتعديل';
  if (r.status === 'awaitingPrincipal') return 'أُرسل للمدير للاعتماد';
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
  const [downloading, setDownloading] = useState(false);
  const fileUrl = review.file_url?.trim() || '';

  const handleDownload = async () => {
    if (!fileUrl || downloading) return;
    setDownloading(true);
    try {
      await downloadFileFromUrl(fileUrl, review.file_name || 'review.pdf');
      toast.success('بدأ التحميل');
    } catch (e) {
      // مسار احتياطي: رابط تنزيل إجباري على Hostinger
      try {
        const forced = buildForcedDownloadUrl(fileUrl, review.file_name || 'review.pdf');
        if (forced) {
          await downloadFileFromUrl(forced, review.file_name || 'review.pdf');
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
          {(review.reviewer_notes || review.principal_notes) && (
            <div className="mt-2 space-y-1 text-xs text-white/55">
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

      {previewOpen && fileUrl && (
        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40">
          <iframe
            title={`معاينة ${review.file_name || 'PDF'}`}
            src={`${fileUrl}#toolbar=1&navpanes=0`}
            className="w-full h-[min(70vh,640px)] bg-white"
          />
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
}: {
  label: string;
  onConfirm: (notes: string) => void;
  onCancel: () => void;
  pending?: boolean;
}) {
  const [notes, setNotes] = useState('');
  return (
    <div className="w-full rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
      <p className="text-white/60 text-xs">{label}</p>
      <textarea
        className={academicInputClass}
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="ملاحظات (اختياري)"
      />
      <div className="flex gap-2">
        <button type="button" className={academicBtnPrimary} disabled={pending} onClick={() => onConfirm(notes)}>
          تأكيد
        </button>
        <button type="button" className={academicBtnSecondary} onClick={onCancel}>
          إلغاء
        </button>
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
  const isPrincipal = role === 'principal';
  const isDeputy = role === 'deputy';

  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState<AcademicEducationLevel>('middle');
  const [grade, setGrade] = useState(1);
  const [type, setType] = useState<AcademicExamReviewType>('exam');
  const [principalTab, setPrincipalTab] = useState<PrincipalTab>('inbox');
  const [reviewerTab, setReviewerTab] = useState<ReviewerTab>('inbox');
  const [actionFor, setActionFor] = useState<{ id: string; kind: 'revise' | 'submit' | 'publish' } | null>(null);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);

  const { data: setup } = useQuery({
    queryKey: ['academic-teacher-setup', user?.id],
    queryFn: () => academicTeacherService.getSetup(user!.id),
    enabled: isTeacher && !!user,
  });

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['academic-reviews', user?.id, role, principalTab, reviewerTab],
    queryFn: () => {
      if (isTeacher && user) return academicExamReviewService.listByTeacher(user.id);
      if (isReviewer) {
        return reviewerTab === 'inbox'
          ? academicExamReviewService.listForReviewer()
          : academicExamReviewService.listAllForReviewer();
      }
      if (isPrincipal) {
        return principalTab === 'inbox'
          ? academicExamReviewService.listForPrincipal()
          : academicExamReviewService.listPublishedRecent();
      }
      return academicExamReviewService.listPublished();
    },
    enabled: !!user,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['academic-reviews'] });

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!file || !user || !subject) throw new Error('أكمل البيانات والملف');
      return academicExamReviewService.uploadReview(file, {
        teacher_id: user.id,
        teacher_name: user.full_name,
        subject,
        education_level: level,
        grade,
        type,
      });
    },
    onSuccess: () => {
      toast.success('تم الرفع — بانتظار المراجع');
      setFile(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const replaceMut = useMutation({
    mutationFn: async () => {
      if (!replaceId || !replaceFile || !user) throw new Error('اختر ملفاً');
      return academicExamReviewService.replaceReviewFile(replaceId, user.id, replaceFile);
    },
    onSuccess: () => {
      toast.success('تم إعادة الرفع للمراجع');
      setReplaceId(null);
      setReplaceFile(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitMut = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      academicExamReviewService.submitToPrincipal(id, user!.id, notes),
    onSuccess: () => {
      toast.success('أُرسل للمدير للاعتماد');
      setActionFor(null);
      setReviewerTab('all');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviseMut = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      academicExamReviewService.requestRevision(id, notes, {
        role: isReviewer ? 'reviewer' : 'principal',
        userId: user!.id,
      }),
    onSuccess: () => {
      toast.success('أُعيد للمعلم للتعديل');
      setActionFor(null);
      if (isReviewer) setReviewerTab('all');
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

  const subtitle = isTeacher
    ? 'ارفع الملف ليراجعه المراجع ثم يعتمد المدير النشر'
    : isReviewer
      ? 'راجع الملفات، عاينها داخل الشاشة، وتابع كل الطلبات والإجراءات'
      : isPrincipal
        ? 'اعتماد الملفات المرسلة من المراجع ونشرها للطالب وولي الأمر'
        : 'متابعة الملفات المنشورة';

  const emptyMessage = isReviewer
    ? reviewerTab === 'inbox'
      ? 'لا ملفات بانتظار المراجعة'
      : 'لا توجد طلبات بعد'
    : isPrincipal && principalTab === 'inbox'
      ? 'لا ملفات بانتظار اعتمادك'
      : 'لا توجد مراجعات';

  return (
    <AcademicLayout size="6xl">
      <AcademicPageHeader title="مراجعات وملفات الاختبارات" subtitle={subtitle} />

      {isTeacher && (
        <div className="rounded-2xl border border-white/10 bg-[#111c44] p-5 mb-6 space-y-3">
          <p className="text-white/50 text-xs">مسار الاعتماد: معلم → مراجع → مدير → نشر</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <AcademicSubjectSelect
              level={level}
              grade={grade}
              value={subject}
              onChange={setSubject}
              teacherSetupSubjects={setup?.subjects}
              required
            />
            <select
              className={academicInputClass}
              value={level}
              onChange={(e) => {
                setLevel(e.target.value as AcademicEducationLevel);
                setSubject('');
              }}
            >
              <option value="middle">متوسط</option>
              <option value="high">ثانوي</option>
            </select>
            <select
              className={academicInputClass}
              value={grade}
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
            <select
              className={academicInputClass}
              value={type}
              onChange={(e) => setType(e.target.value as AcademicExamReviewType)}
            >
              {Object.entries(EXAM_REVIEW_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              type="file"
              accept=".pdf,application/pdf"
              className={academicInputClass}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <button
            type="button"
            className={academicBtnPrimary}
            onClick={() => uploadMut.mutate()}
            disabled={!file || !subject || uploadMut.isPending}
          >
            <Upload className="w-4 h-4" />
            {uploadMut.isPending ? 'جاري الرفع...' : 'رفع ملف PDF للمراجع'}
          </button>
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
        <div className="flex flex-wrap gap-2 mb-4">
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
      )}

      {isLoading ? (
        <TapHandLoader label="جاري التحميل..." />
      ) : reviews.length === 0 ? (
        <AcademicEmpty message={emptyMessage} />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="space-y-2">
              <ReviewCard
                review={r}
                showActionTaken={isReviewer && reviewerTab === 'all'}
                actions={
                  <>
                    {isReviewer && reviewerTab === 'inbox' && r.status === 'pending' && (
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
                  </>
                }
              />

              {actionFor?.id === r.id && actionFor.kind === 'submit' && (
                <NotesPrompt
                  label="إرسال للمدير للاعتماد والنشر"
                  pending={submitMut.isPending}
                  onCancel={() => setActionFor(null)}
                  onConfirm={(notes) => submitMut.mutate({ id: r.id, notes })}
                />
              )}
              {actionFor?.id === r.id && actionFor.kind === 'revise' && (
                <NotesPrompt
                  label="سبب طلب التعديل من المعلم"
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
              {isTeacher && replaceId === r.id && (
                <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className={academicInputClass}
                    onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={academicBtnPrimary}
                      disabled={!replaceFile || replaceMut.isPending}
                      onClick={() => replaceMut.mutate()}
                    >
                      رفع النسخة الجديدة
                    </button>
                    <button type="button" className={academicBtnSecondary} onClick={() => setReplaceId(null)}>
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
