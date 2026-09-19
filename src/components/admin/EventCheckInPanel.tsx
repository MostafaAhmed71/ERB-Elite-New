import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QrCode, Plus, Power, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { QRQuickGrant } from '../teacher/QRQuickGrant';
import { showSuccess, showError } from '../../lib/toast';
import { filterOlympiadMiddleStudents } from '../../lib/olympiadMiddleScope';
import type { DbActivity, DbStudent } from '../../types';
import clsx from 'clsx';

export function EventCheckInPanel() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [activityId, setActivityId] = useState('');
  const [pointsOverride, setPointsOverride] = useState<number | ''>('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', 'event-checkin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as DbActivity[];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students', 'olympiad-middle-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return filterOlympiadMiddleStudents(data as DbStudent[]);
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['event-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_event_sessions')
        .select('*, activities(name)')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return data ?? [];
    },
  });

  const activeSession = sessions.find((s) => s.id === activeSessionId && s.is_active);

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !activityId) throw new Error('أدخل عنوان الجلسة واختر النشاط');
      const { data, error } = await supabase
        .from('activity_event_sessions')
        .insert({
          title: title.trim(),
          activity_id: activityId,
          created_by: user!.id,
          points_override: pointsOverride === '' ? null : Number(pointsOverride),
          is_active: true,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      setActiveSessionId(id);
      setTitle('');
      queryClient.invalidateQueries({ queryKey: ['event-sessions'] });
      showSuccess('بدأت جلسة الفعالية — امسح QR الطلاب');
    },
    onError: (e: Error) => showError(e),
  });

  const endMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('activity_event_sessions')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      setActiveSessionId(null);
      queryClient.invalidateQueries({ queryKey: ['event-sessions'] });
      showSuccess('انتهت الجلسة');
    },
    onError: (e: Error) => showError(e),
  });

  const checkinMutation = useMutation({
    mutationFn: async (studentId: string) => {
      if (!activeSessionId) throw new Error('لا توجد جلسة نشطة');
      const { data, error } = await supabase.rpc('register_event_checkin', {
        p_session_id: activeSessionId,
        p_student_id: studentId,
      });
      if (error) throw error;
      return data as { student_name: string; points: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['points_ledger'] });
      showSuccess(`تم تسجيل ${data.student_name} — +${data.points} نقطة معتمدة`);
    },
    onError: (e: Error) => {
      const msg = e.message.includes('STUDENT_ALREADY_CHECKED_IN')
        ? 'سجّل الطالب حضوره مسبقاً في هذه الجلسة'
        : e.message;
      showError(new Error(msg));
    },
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="glass-card p-5 space-y-4">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <QrCode className="w-5 h-5 text-emerald-400" />
          حضور الفعالية بمسح QR
        </h2>
        <p className="text-white/40 text-xs">
          أنشئ جلسة فعالية، ثم امسح بطاقة كل طالب لمنح نقاط الحضور تلقائياً
        </p>

        {!activeSession ? (
          <div className="space-y-3 max-w-md">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان الفعالية (مثال: معرض العلوم)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
            />
            <select
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
            >
              <option value="">اختر النشاط...</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id} className="bg-navy-900">
                  {a.name} ({a.default_points} ن)
                </option>
              ))}
            </select>
            <input
              type="number"
              value={pointsOverride}
              onChange={(e) => setPointsOverride(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="نقاط مخصصة (اختياري)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
            />
            <button
              type="button"
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-semibold disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              بدء الجلسة
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
              <div>
                <p className="text-emerald-300 text-sm font-semibold">{activeSession.title}</p>
                <p className="text-white/40 text-xs mt-1 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {activeSession.checkin_count ?? 0} طالب مسجّل
                </p>
              </div>
              <button
                type="button"
                onClick={() => endMutation.mutate(activeSession.id)}
                disabled={endMutation.isPending}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-xs"
              >
                <Power className="w-3.5 h-3.5" />
                إنهاء الجلسة
              </button>
            </div>
            <QRQuickGrant
              students={students}
              onStudentFound={(id) => checkinMutation.mutate(id)}
            />
          </div>
        )}
      </div>

      {sessions.length > 0 && (
        <div className="glass-card p-5 space-y-2">
          <p className="text-white/50 text-xs font-medium">جلسات سابقة</p>
          {sessions.map((s) => (
            <div
              key={s.id}
              className={clsx(
                'flex items-center justify-between p-3 rounded-xl border text-xs',
                s.is_active ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/5 bg-white/2',
              )}
            >
              <span className="text-white/70">{s.title}</span>
              <span className="text-white/35">{s.checkin_count ?? 0} حضور</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
