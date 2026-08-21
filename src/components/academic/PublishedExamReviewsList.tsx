import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { academicExamReviewService } from '../../lib/academic/adminService';
import {
  EXAM_REVIEW_TYPE_LABELS,
  gradesForLevel,
  formatGradeLabel,
} from '../../lib/academic/constants';
import type { AcademicEducationLevel, AcademicExamReviewType } from '../../lib/academic/types';
import {
  AcademicEmpty,
  AcademicItemCard,
  AcademicBadge,
  academicInputClass,
  academicBtnPrimary,
} from '../academic/AcademicUi';
import { TapHandLoader } from '../ui/TapHandLoader';
import { downloadFileFromUrl } from '../../lib/downloadFile';

export function PublishedExamReviewsList({
  enabled = true,
  defaultLevel = '',
  defaultGrade = '',
}: {
  enabled?: boolean;
  defaultLevel?: AcademicEducationLevel | '';
  defaultGrade?: number | '';
}) {
  const [level, setLevel] = useState<AcademicEducationLevel | ''>(defaultLevel);
  const [grade, setGrade] = useState<number | ''>(defaultGrade);
  const [type, setType] = useState<AcademicExamReviewType | ''>('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['published-academic-reviews'],
    queryFn: academicExamReviewService.listPublished,
    enabled,
  });

  const filtered = useMemo(
    () =>
      reviews.filter((r) => {
        if (level && r.education_level !== level) return false;
        if (grade && r.grade !== grade) return false;
        if (type && r.type !== type) return false;
        return true;
      }),
    [reviews, level, grade, type],
  );

  const grades = level ? gradesForLevel(level) : [];

  const onDownload = async (id: string, url: string, name: string) => {
    setBusyId(id);
    try {
      await downloadFileFromUrl(url, name || 'review.pdf');
      toast.success('بدأ التحميل');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'تعذّر التحميل');
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        <select
          className={`${academicInputClass} max-w-[160px]`}
          value={level}
          onChange={(e) => {
            setLevel(e.target.value as AcademicEducationLevel | '');
            setGrade('');
          }}
        >
          <option value="">كل المراحل</option>
          <option value="middle">متوسط</option>
          <option value="high">ثانوي</option>
        </select>
        <select
          className={`${academicInputClass} max-w-[140px]`}
          value={grade}
          onChange={(e) => setGrade(e.target.value ? +e.target.value : '')}
          disabled={!level}
        >
          <option value="">كل الصفوف</option>
          {grades.map((g) => (
            <option key={g} value={g}>
              {level ? formatGradeLabel(level, g) : g}
            </option>
          ))}
        </select>
        <select
          className={`${academicInputClass} max-w-[180px]`}
          value={type}
          onChange={(e) => setType(e.target.value as AcademicExamReviewType | '')}
        >
          <option value="">كل الأنواع</option>
          {Object.entries(EXAM_REVIEW_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <TapHandLoader />
      ) : filtered.length === 0 ? (
        <AcademicEmpty message="لا ملفات متاحة حالياً" icon={FileText} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <AcademicItemCard key={r.id} className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-gold-500/15 text-gold-400 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-white font-bold">{r.subject}</h3>
              <p className="text-[#A3AED0] text-sm mt-1">
                {formatGradeLabel(r.education_level, r.grade)}
              </p>
              <AcademicBadge variant="gold">{EXAM_REVIEW_TYPE_LABELS[r.type]}</AcademicBadge>
              <button
                type="button"
                className={`${academicBtnPrimary} mt-4 w-full`}
                disabled={busyId === r.id}
                onClick={() => void onDownload(r.id, r.file_url, r.file_name)}
              >
                <Download className="w-4 h-4" />
                {busyId === r.id ? 'جاري التحميل...' : 'تحميل PDF'}
              </button>
            </AcademicItemCard>
          ))}
        </div>
      )}
    </div>
  );
}
