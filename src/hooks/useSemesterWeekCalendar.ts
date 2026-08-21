import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { academicConfigService } from '../lib/academic/adminService';
import {
  resolveCurrentWeekFromCalendar,
  isWeekOpenForEntry,
  isWeekExpired,
  getWeekRange,
  hasWeekCalendar,
  formatWeekDateRange,
} from '../lib/academic/semesterWeekCalendar';
import { getDefaultSemesterWeek } from '../lib/academic/constants';
import type { AcademicSemester } from '../lib/academic/types';

export function useSemesterWeekCalendar() {
  const { data: calendars, isLoading } = useQuery({
    queryKey: ['semester-week-calendars'],
    queryFn: () => academicConfigService.getSemesterWeekCalendars(),
    staleTime: 60_000,
  });

  const config = calendars ?? { calendars: {} };

  const current = useMemo(
    () => resolveCurrentWeekFromCalendar(config) ?? getDefaultSemesterWeek(),
    [config],
  );

  return {
    config,
    isLoading,
    current,
    hasCalendar: (semester: AcademicSemester) => hasWeekCalendar(config, semester),
    isWeekOpen: (semester: AcademicSemester, week: number) =>
      isWeekOpenForEntry(config, semester, week),
    isWeekExpired: (semester: AcademicSemester, week: number) =>
      isWeekExpired(config, semester, week),
    getRange: (semester: AcademicSemester, week: number) =>
      getWeekRange(config, semester, week),
    formatRange: formatWeekDateRange,
  };
}
