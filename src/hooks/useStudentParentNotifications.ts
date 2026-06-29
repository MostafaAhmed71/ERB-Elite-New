import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useParentChildren } from './useParentChildren';
import { computeAchievements } from '../lib/achievements';

/**
 * إشعارات فورية للطالب وولي الأمر عبر Supabase Realtime + toasts.
 */
export function useStudentParentNotifications(enabled: boolean) {
  const { role, user } = useAuthStore();
  const queryClient = useQueryClient();
  const { children, selectedChild } = useParentChildren();
  const knownAchievementsRef = useRef<Set<string> | null>(null);

  const studentIdRef = useRef<string | null>(null);
  const childIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!enabled || !user) return;

    let cancelled = false;

    async function resolveIds() {
      if (role === 'student') {
        const { data } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user!.id)
          .maybeSingle();
        if (!cancelled) studentIdRef.current = data?.id ?? null;
      } else if (role === 'parent') {
        childIdsRef.current = children.map((c) => c.id);
      }
    }

    void resolveIds();
    return () => {
      cancelled = true;
    };
  }, [enabled, user, role, children]);

  useEffect(() => {
    childIdsRef.current = children.map((c) => c.id);
  }, [children]);

  useEffect(() => {
    if (!enabled || !user || (role !== 'student' && role !== 'parent')) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    const pointsChannel = supabase
      .channel(`notify-points-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'points_ledger' },
        (payload) => {
          const row = payload.new as { student_id?: string; status?: string; points?: number } | null;
          if (!row?.student_id) return;

          const isRelevant =
            role === 'student'
              ? row.student_id === studentIdRef.current
              : childIdsRef.current.includes(row.student_id);

          if (!isRelevant) return;

          queryClient.invalidateQueries({ queryKey: ['student-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['student', 'points'] });
          queryClient.invalidateQueries({ queryKey: ['parent', 'points'] });

          if (payload.eventType === 'UPDATE' && row.status === 'approved') {
            toast.success(
              role === 'parent'
                ? `تم اعتماد ${row.points ?? ''} نقطة لابنك`
                : `تم اعتماد ${row.points ?? ''} نقطة جديدة!`
            );
          } else if (payload.eventType === 'UPDATE' && row.status === 'rejected') {
            toast('تم رفض طلب نقاط', { icon: '❌' });
          }
        }
      )
      .subscribe();
    channels.push(pointsChannel);

    const attendanceChannel = supabase
      .channel(`notify-attendance-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendance' },
        (payload) => {
          const row = payload.new as { student_id?: string; status?: string } | null;
          if (!row?.student_id) return;

          const isRelevant =
            role === 'student'
              ? row.student_id === studentIdRef.current
              : childIdsRef.current.includes(row.student_id);

          if (!isRelevant) return;

          queryClient.invalidateQueries({ queryKey: ['student-metrics', 'attendance'] });
          queryClient.invalidateQueries({ queryKey: ['parent', 'attendance'] });

          if (row.status === 'absent') {
            toast(
              role === 'parent' ? 'تنبيه: تم تسجيل غياب لابنك اليوم' : 'تم تسجيل غيابك اليوم',
              { icon: '⚠️', duration: 6000 }
            );
          }
        }
      )
      .subscribe();
    channels.push(attendanceChannel);

    const examChannel = supabase
      .channel(`notify-exam-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'exam_results' },
        (payload) => {
          const row = payload.new as { student_id?: string; score?: number; max_score?: number } | null;
          if (!row?.student_id) return;

          const isRelevant =
            role === 'student'
              ? row.student_id === studentIdRef.current
              : childIdsRef.current.includes(row.student_id);

          if (!isRelevant) return;

          queryClient.invalidateQueries({ queryKey: ['student-metrics', 'last-exam'] });
          queryClient.invalidateQueries({ queryKey: ['parent', 'exam_results'] });
          queryClient.invalidateQueries({ queryKey: ['student_exam_results'] });

          const pct =
            row.max_score && row.max_score > 0
              ? Math.round(((row.score ?? 0) / row.max_score) * 100)
              : 0;
          toast.success(
            role === 'parent'
              ? `نتيجة اختبار جديدة لابنك: ${pct}%`
              : `تم تسجيل نتيجة اختبارك: ${pct}%`
          );
        }
      )
      .subscribe();
    channels.push(examChannel);

    if (role === 'student') {
      const suggestionChannel = supabase
        .channel(`notify-suggestions-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'activity_suggestions' },
          (payload) => {
            const row = payload.new as { student_id?: string; status?: string; title?: string } | null;
            if (!row?.student_id || row.student_id !== studentIdRef.current) return;
            if (row.status === 'approved' || row.status === 'implemented') {
              toast.success(`تم قبول اقتراحك: «${row.title ?? 'نشاط'}»`);
            } else if (row.status === 'rejected') {
              toast('لم يُقبل اقتراح النشاط هذه المرة', { icon: '💡' });
            }
            queryClient.invalidateQueries({ queryKey: ['activity-suggestions'] });
            queryClient.invalidateQueries({ queryKey: ['student', 'my-suggestions'] });
          }
        )
        .subscribe();
      channels.push(suggestionChannel);
    }

    return () => {
      for (const ch of channels) {
        void supabase.removeChannel(ch);
      }
    };
  }, [enabled, user, role, queryClient]);

  // إشعار ولي الأمر عند حصول الابن على شارة جديدة (#39)
  useEffect(() => {
    if (!enabled || role !== 'parent' || !selectedChild?.id) return;

    const storageKey = `parent_achievements_${selectedChild.id}`;
    const stored = sessionStorage.getItem(storageKey);

    async function checkBadges() {
      const { data: ledger } = await supabase
        .from('points_ledger')
        .select('points, status, activity_id, activities(category)')
        .eq('student_id', selectedChild!.id)
        .eq('status', 'approved');

      const { count } = await supabase
        .from('activity_suggestions')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', selectedChild!.id)
        .in('status', ['approved', 'implemented']);

      const achievements = computeAchievements(
        (ledger ?? []).map((r) => ({
          id: r.activity_id ?? '',
          points: r.points as number,
          status: 'approved' as const,
          activity_id: (r.activity_id as string) ?? '',
          activities: {
            name: 'نشاط',
            category: (Array.isArray(r.activities) ? r.activities[0]?.category : (r.activities as { category?: string })?.category) ?? 'activity',
          },
        })),
        null,
        (count ?? 0) > 0
      );
      const earnedIds = new Set(achievements.filter((a) => a.earned).map((a) => a.id));

      if (stored) {
        const prev = new Set(JSON.parse(stored) as string[]);
        for (const id of earnedIds) {
          if (!prev.has(id)) {
            const badge = achievements.find((a) => a.id === id);
            if (badge) toast.success(`حصل ابنك على شارة: ${badge.title}`, { duration: 5000 });
          }
        }
      }

      sessionStorage.setItem(storageKey, JSON.stringify([...earnedIds]));
      knownAchievementsRef.current = earnedIds;
    }

    void checkBadges();
  }, [enabled, role, selectedChild?.id]);
}
