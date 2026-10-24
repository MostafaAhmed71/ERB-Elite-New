import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Eye, FileText, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { academicExamReviewService } from '../../lib/academic/adminService';
import {
  EXAM_REVIEW_TYPE_LABELS,
  EXAM_REVIEW_TYPES,
  formatGradeLabel,
} from '../../lib/academic/constants';
import type { AcademicEducationLevel, AcademicExamReview, AcademicExamReviewType } from '../../lib/academic/types';
import {
  AcademicEmpty,
  AcademicBadge,
  academicBtnPrimary,
  academicBtnSecondary,
} from '../academic/AcademicUi';
import { TapHandLoader } from '../ui/TapHandLoader';
import { downloadFileFromUrl } from '../../lib/downloadFile';

const TONES = {
  dark: {
    banner: 'border-gold-400/20 bg-gold-500/10',
    bannerTitle: 'text-gold-200',
    bannerText: 'text-white/60',
    chipOn: 'bg-gold-500/20 text-gold-200 border-gold-400/40',
    chipOff: 'bg-white/[0.04] text-white/55 border-white/10',
    subject: 'text-white',
    card: 'border-white/10 bg-[#111c44]',
    thumb: 'bg-black/30 border-white/10',
    title: 'text-white',
    muted: 'text-[#A3AED0]',
    badge: '',
    btnSecondary: academicBtnSecondary,
    modal: 'border-white/10 bg-[#0b1228]',
    modalHead: 'border-white/10',
    empty: '',
  },
  light: {
    banner: 'border-amber-200 bg-amber-50',
    bannerTitle: 'text-amber-800',
    bannerText: 'text-slate-500',
    chipOn: 'bg-amber-100 text-amber-800 border-amber-300',
    chipOff: 'bg-white text-slate-600 border-slate-200',
    subject: 'text-slate-800',
    card: 'border-slate-200 bg-white shadow-sm',
    thumb: 'bg-slate-50 border-slate-200',
    title: 'text-slate-900',
    muted: 'text-slate-500',
    badge: 'inline-flex text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800',
    btnSecondary:
      'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 text-slate-700 font-semibold px-5 py-3 sm:py-2.5 min-h-[48px] sm:min-h-[44px] hover:bg-slate-200 border border-slate-200 transition-colors w-full sm:w-auto',
    modal: 'border-slate-200 bg-white',
    modalHead: 'border-slate-200',
    empty: 'rounded-2xl border border-slate-200 bg-white py-14 text-center text-slate-500 text-sm shadow-sm',
  },
} as const;

function isImageReview(review: AcademicExamReview): boolean {
  if (review.file_type?.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|gif)$/i.test(review.file_name || review.file_url || '');
}

export function PublishedExamReviewsList({
  enabled = true,
  lockLevel,
  lockGrade,
  lockLabel,
  scopeTitle = 'ملفات صفك فقط',
  lockType,
  tone = 'dark',
}: {
  enabled?: boolean;
  lockLevel?: AcademicEducationLevel;
  lockGrade?: number;
  lockLabel?: string;
  scopeTitle?: string;
  lockType?: AcademicExamReviewType;
  tone?: keyof typeof TONES;
}) {
  const ui = TONES[tone];
  const locked = Boolean(lockLevel && lockGrade);
  const [type, setType] = useState<AcademicExamReviewType | ''>('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<AcademicExamReview | null>(null);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['published-academic-reviews'],
    queryFn: academicExamReviewService.listPublished,
    enabled,
  });

  const inScope = useMemo(
    () =>
      reviews.filter((r) => {
        if (lockLevel && r.education_level !== lockLevel) return false;
        if (lockGrade && r.grade !== lockGrade) return false;
        if (lockType && r.type !== lockType) return false;
        return true;
      }),
    [reviews, lockLevel, lockGrade, lockType],
  );

  const availableTypes = useMemo(() => {
    const present = new Set(inScope.map((r) => r.type));
    return EXAM_REVIEW_TYPES.filter((t) => present.has(t));
  }, [inScope]);

  const activeType = type && availableTypes.includes(type) ? type : '';

  const filtered = useMemo(
    () => (activeType ? inScope.filter((r) => r.type === activeType) : inScope),
    [inScope, activeType],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, AcademicExamReview[]>();
    for (const r of filtered) {
      const key = r.subject?.trim() || 'بدون مادة';
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ar'));
  }, [filtered]);

  const onDownload = async (r: AcademicExamReview) => {
    setBusyId(r.id);
    try {
      await downloadFileFromUrl(r.file_url, r.file_name || (isImageReview(r) ? 'review.jpg' : 'review.pdf'));
      toast.success('بدأ التحميل');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'تعذّر التحميل');
      window.open(r.file_url, '_blank', 'noopener,noreferrer');
    } finally {
      setBusyId(null);
    }
  };

  const scopeText = lockLabel
    || (lockLevel && lockGrade ? formatGradeLabel(lockLevel, lockGrade) : '');

  return (
    <div dir="rtl">
      {locked && scopeText && (
        <div className={clsx('mb-5 rounded-2xl border px-4 py-3', ui.banner)}>
          <p className={clsx('text-sm font-semibold', ui.bannerTitle)}>{scopeTitle}</p>
          <p className={clsx('text-xs mt-0.5', ui.bannerText)}>{scopeText}</p>
        </div>
      )}

      {availableTypes.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => setType('')}
            className={clsx(
              'px-3 py-1.5 rounded-full text-xs font-semibold border',
              activeType === '' ? ui.chipOn : ui.chipOff,
            )}
          >
            كل الأنواع
          </button>
          {availableTypes.map((reviewType) => (
            <button
              key={reviewType}
              type="button"
              onClick={() => setType(reviewType)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-semibold border',
                activeType === reviewType ? ui.chipOn : ui.chipOff,
              )}
            >
              {EXAM_REVIEW_TYPE_LABELS[reviewType]}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <TapHandLoader />
      ) : filtered.length === 0 ? (
        ui.empty ? (
          <div className={ui.empty}>
            <FileText className="w-8 h-8 mx-auto mb-3 text-slate-400" strokeWidth={1.5} />
            {locked ? 'لا توجد ملفات منشورة لصفك حالياً' : 'لا ملفات متاحة حالياً'}
          </div>
        ) : (
          <AcademicEmpty
            message={locked ? 'لا توجد ملفات منشورة لصفك حالياً' : 'لا ملفات متاحة حالياً'}
            icon={FileText}
          />
        )
      ) : (
        <div className="space-y-6">
          {grouped.map(([subject, items]) => (
            <section key={subject}>
              <h3 className={clsx('font-bold text-sm mb-3 px-1', ui.subject)}>{subject}</h3>
              <div className="space-y-3">
                {items.map((r) => {
                  const image = isImageReview(r);
                  return (
                    <article
                      key={r.id}
                      className={clsx('flex items-center gap-3 sm:gap-4 rounded-2xl border p-3 sm:p-4', ui.card)}
                    >
                      <div className={clsx('w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border shrink-0 flex items-center justify-center', ui.thumb)}>
                        {image ? (
                          <img src={r.file_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <FileText className="w-6 h-6 text-gold-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-right">
                        <p className={clsx('font-bold truncate', ui.title)}>
                          {EXAM_REVIEW_TYPE_LABELS[r.type]}
                        </p>
                        <p className={clsx('text-xs mt-0.5 truncate', ui.muted)}>
                          {r.file_name || (image ? 'صورة' : 'ملف PDF')}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {ui.badge ? (
                            <span className={ui.badge}>{image ? 'صورة' : 'PDF'}</span>
                          ) : (
                            <AcademicBadge variant="gold">{image ? 'صورة' : 'PDF'}</AcademicBadge>
                          )}
                          {!locked && (
                            <AcademicBadge>
                              {formatGradeLabel(r.education_level, r.grade)}
                            </AcademicBadge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                        <button
                          type="button"
                          className={ui.btnSecondary}
                          onClick={() => setPreview(r)}
                        >
                          <Eye className="w-4 h-4" />
                          عرض
                        </button>
                        <button
                          type="button"
                          className={academicBtnPrimary}
                          disabled={busyId === r.id}
                          onClick={() => void onDownload(r)}
                        >
                          {image ? <ImageIcon className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                          {busyId === r.id ? '...' : 'تحميل'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className={clsx('w-full max-w-3xl rounded-2xl border overflow-hidden', ui.modal)}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={clsx('flex items-center justify-between gap-3 px-4 py-3 border-b', ui.modalHead)}>
              <p className={clsx('font-bold text-sm truncate', ui.title)}>
                {preview.subject} · {EXAM_REVIEW_TYPE_LABELS[preview.type]}
              </p>
              <button type="button" className={ui.btnSecondary} onClick={() => setPreview(null)}>
                إغلاق
              </button>
            </div>
            {isImageReview(preview) ? (
              <img
                src={preview.file_url}
                alt={preview.file_name || 'معاينة'}
                className="w-full max-h-[70vh] object-contain bg-black"
              />
            ) : (
              <iframe
                title={preview.file_name || 'معاينة'}
                src={`${preview.file_url}#toolbar=1&navpanes=0`}
                className="w-full h-[70vh] bg-white"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
