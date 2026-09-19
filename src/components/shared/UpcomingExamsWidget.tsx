import { useQuery } from '@tanstack/react-query';
import { Calendar, ClipboardList, PartyPopper, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { supabase } from '../../lib/supabase';
import { getExamWindowStatus } from '../../lib/examSchedule';
import {
  getUpcomingSchoolEvents,
  fetchSchoolCalendarEvents,
  buildUnifiedCalendarItems,
  SCHOOL_EVENT_TYPE_LABELS,
  type SchoolEventType,
  type UnifiedCalendarItemKind,
} from '../../lib/schoolCalendar';
import { fetchActivityWeek } from '../../lib/activityWeek';
import type { DbExam } from '../../types';

type Props = {
  grade: string;
  studentId?: string;
  examsLink?: string;
};

const EVENT_TYPE_STYLES: Record<SchoolEventType, string> = {
  event: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
  double_activity: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  holiday: 'text-white/50 bg-white/5 border-white/10',
};

const KIND_ICONS: Record<UnifiedCalendarItemKind, typeof ClipboardList> = {
  exam: ClipboardList,
  school_event: PartyPopper,
  activity_week: Sparkles,
};

const KIND_LABELS: Record<UnifiedCalendarItemKind, string> = {
  exam: 'اختبار',
  school_event: 'فعالية',
  activity_week: 'أسبوع نشاط',
};

export function UpcomingExamsWidget({ grade, studentId, examsLink = '/student/exams' }: Props) {
  const { data: exams = [] } = useQuery({
    queryKey: ['upcoming-exams', grade],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('grade', grade)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data as DbExam[]).filter((e) => {
        const status = getExamWindowStatus(e);
        return status === 'open' || status === 'not_started';
      });
    },
    enabled: !!grade,
  });

  const { data: completedIds = new Set<string>() } = useQuery({
    queryKey: ['upcoming-exams-done', studentId],
    queryFn: async () => {
      if (!studentId) return new Set<string>();
      const { data } = await supabase
        .from('exam_results')
        .select('exam_id')
        .eq('student_id', studentId);
      return new Set((data ?? []).map((r) => r.exam_id as string));
    },
    enabled: !!studentId,
  });

  const { data: schoolEvents = [] } = useQuery({
    queryKey: ['school-calendar-events'],
    queryFn: async () => {
      const events = await fetchSchoolCalendarEvents();
      return getUpcomingSchoolEvents(events, new Date(), 10);
    },
  });

  const { data: activityWeek = null } = useQuery({
    queryKey: ['activity-week'],
    queryFn: fetchActivityWeek,
  });

  const unifiedItems = buildUnifiedCalendarItems({
    exams,
    completedExamIds: completedIds,
    schoolEvents,
    activityWeek,
    limit: 8,
  });

  if (unifiedItems.length === 0) return null;

  return (
    <div className="glass-card p-5 space-y-4" dir="rtl">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <Calendar className="w-4 h-4 text-purple-400" />
        التقويم الموحّد للأسرة
      </h3>

      <ul className="space-y-2">
        {unifiedItems.map((item) => {
          const Icon = KIND_ICONS[item.kind];
          return (
            <li
              key={item.id}
              className="flex items-start justify-between gap-2 text-xs p-2.5 rounded-lg bg-white/3 border border-white/5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium flex items-center gap-1.5 flex-wrap">
                  <Icon
                    className={clsx(
                      'w-3 h-3 shrink-0',
                      item.kind === 'exam' && 'text-purple-400',
                      item.kind === 'school_event' && 'text-blue-400',
                      item.kind === 'activity_week' && 'text-amber-400',
                    )}
                  />
                  {item.title}
                </p>
                {item.subtitle && (
                  <p className="text-white/35 text-[10px] mt-0.5 line-clamp-2">{item.subtitle}</p>
                )}
                <span
                  className={clsx(
                    'inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded border',
                    item.kind === 'exam' && 'text-purple-300 bg-purple-500/10 border-purple-500/20',
                    item.kind === 'activity_week' && 'text-amber-300 bg-amber-500/10 border-amber-500/20',
                    item.kind === 'school_event' &&
                      (item.eventType ? EVENT_TYPE_STYLES[item.eventType] : 'text-blue-300 bg-blue-500/10 border-blue-500/20'),
                  )}
                >
                  {item.kind === 'school_event' && item.eventType
                    ? SCHOOL_EVENT_TYPE_LABELS[item.eventType]
                    : KIND_LABELS[item.kind]}
                </span>
              </div>
              <span className="text-white/30 text-[10px] shrink-0 pt-0.5">{item.dateLabel}</span>
            </li>
          );
        })}
      </ul>

      <Link to={examsLink} className="text-gold-400 text-[11px] hover:underline inline-flex items-center gap-1">
        <ClipboardList className="w-3 h-3" />
        عرض الاختبارات
      </Link>
    </div>
  );
}
