import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import {
  TEACHER_MESSAGE_TEMPLATES,
  fetchTeacherMessageLog,
  sendTeacherClassMessage,
} from '../../lib/teacherParentMessages';
import {
  fetchTeacherClassAssignmentsByUserId,
  formatTeacherClasses,
} from '../../lib/teacherScope';
import { Button } from '../ui/Button';
import { showSuccess, showError } from '../../lib/toast';

/** T6 — رسالة جماعية لأولياء أمور الفصل */
export function TeacherParentMessagePanel() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [grade, setGrade] = useState('');
  const [className, setClassName] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const { data: assignments = [] } = useQuery({
    queryKey: ['teacher', 'classes', user?.id],
    queryFn: () => fetchTeacherClassAssignmentsByUserId(user!.id),
    enabled: !!user,
  });

  const { data: log = [] } = useQuery({
    queryKey: ['teacher', 'message-log', user?.id],
    queryFn: () => fetchTeacherMessageLog(user!.id),
    enabled: !!user,
  });

  const grades = [...new Set(assignments.map((a) => a.grade))];
  const classesForGrade = assignments.filter((a) => a.grade === (grade || grades[0]));

  const sendMutation = useMutation({
    mutationFn: () =>
      sendTeacherClassMessage(
        grade || grades[0],
        className || classesForGrade[0]?.class_name || '',
        title,
        body,
      ),
    onSuccess: (sent) => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'message-log'] });
      showSuccess(`تم إرسال الرسالة إلى ${sent} ولي أمر`);
      setTitle('');
      setBody('');
    },
    onError: (e: Error) => {
      const msg = e.message.includes('CLASS_NOT_ASSIGNED')
        ? 'الفصل غير مسند إليك'
        : e.message.includes('MESSAGE_TOO_SHORT')
          ? 'الرسالة قصيرة جداً'
          : e.message;
      showError(new Error(msg));
    },
  });

  if (assignments.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-white/40 text-sm">
        لم يُسند إليك فصل بعد — تواصل مع الإدارة
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-blue-400" />
        <div>
          <h3 className="text-white font-semibold text-sm">رسالة لأولياء الأمور — T6</h3>
          <p className="text-white/40 text-xs">فصولك: {formatTeacherClasses(assignments)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TEACHER_MESSAGE_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTitle(t.title);
              setBody(t.body);
            }}
            className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          value={grade || grades[0] || ''}
          onChange={(e) => {
            setGrade(e.target.value);
            setClassName('');
          }}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
        >
          {grades.map((g) => (
            <option key={g} value={g} className="bg-navy-950">{g}</option>
          ))}
        </select>
        <select
          value={className || classesForGrade[0]?.class_name || ''}
          onChange={(e) => setClassName(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
        >
          {classesForGrade.map((c) => (
            <option key={c.class_name} value={c.class_name} className="bg-navy-950">
              {c.class_name}
            </option>
          ))}
        </select>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="عنوان الرسالة"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="نص الرسالة..."
        rows={4}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm resize-none"
      />

      <Button
        icon={<Send className="w-4 h-4" />}
        disabled={sendMutation.isPending || !title.trim() || !body.trim()}
        onClick={() => sendMutation.mutate()}
      >
        إرسال لأولياء الأمور
      </Button>

      {log.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-white/5">
          <p className="text-white/40 text-xs">آخر الرسائل</p>
          {log.slice(0, 5).map((row) => (
            <div key={row.id} className="text-[10px] p-2 rounded-lg bg-white/3 border border-white/5">
              {row.grade} — {row.class_name}: {row.title} ({row.recipients_count} مستلم)
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
