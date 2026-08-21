import clsx from 'clsx';
import type { AcademicTeacherObservationEntry } from '../../lib/academic/types';
import {
  formatObservationRating,
  parseObservationEntry,
} from '../../lib/academic/observationHelpers';

function EntryCard({ entry }: { entry: AcademicTeacherObservationEntry }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 space-y-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-white font-semibold">
          {entry.teacher}
          {entry.subject ? <span className="text-white/40 font-normal"> — {entry.subject}</span> : null}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-lg bg-sky-500/10 border border-sky-400/20 px-3 py-2">
          <p className="text-sky-300/80 text-xs mb-0.5">التقييم السلوكي</p>
          <p className="text-white font-bold">{formatObservationRating(entry.behavioral_rating)}</p>
          {entry.behavioral_comment?.trim() && (
            <p className="text-white/60 text-xs mt-1 leading-relaxed">{entry.behavioral_comment}</p>
          )}
        </div>
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-400/20 px-3 py-2">
          <p className="text-emerald-300/80 text-xs mb-0.5">التقييم الأكاديمي</p>
          <p className="text-white font-bold">{formatObservationRating(entry.academic_rating)}</p>
          {entry.academic_comment?.trim() && (
            <p className="text-white/60 text-xs mt-1 leading-relaxed">{entry.academic_comment}</p>
          )}
        </div>
      </div>
      {entry.note?.trim() && !(entry.behavioral_rating || entry.academic_rating) && (
        <p className={clsx('text-white/70')}>{entry.note}</p>
      )}
      {entry.note?.trim() && (entry.behavioral_rating || entry.academic_rating) && (
        <p className="text-white/55 text-xs">ملاحظة إضافية: {entry.note}</p>
      )}
    </div>
  );
}

export function ObservationEntriesList({
  raw,
  emptyMessage = 'لا توجد تقييمات بعد',
}: {
  raw: unknown[] | unknown;
  emptyMessage?: string;
}) {
  const list = Array.isArray(raw) ? raw : [];
  const entries = list.map(parseObservationEntry).filter(Boolean) as AcademicTeacherObservationEntry[];

  if (entries.length === 0) {
    return <p className="text-white/45 text-sm">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <EntryCard key={`${entry.teacher}-${entry.at ?? i}`} entry={entry} />
      ))}
    </div>
  );
}
