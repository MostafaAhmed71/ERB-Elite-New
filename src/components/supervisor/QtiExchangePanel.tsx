import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileCode, Download, Upload } from 'lucide-react';
import type { DbQuestion, DbSkill } from '../../types';
import { exportQuestionsToQti, parseQtiXml, downloadQtiFile } from '../../lib/qtiExchange';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/Button';
import { showSuccess, showError } from '../../lib/toast';

type Props = {
  questions: DbQuestion[];
  skills: DbSkill[];
  subjectLabel: string;
  defaultSkillId?: string;
};

/** S10 — تصدير/استيراد QTI */
export function QtiExchangePanel({ questions, skills, subjectLabel, defaultSkillId }: Props) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [skillId, setSkillId] = useState(defaultSkillId ?? skills[0]?.id ?? '');

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('غير مصرح');
      const text = await file.text();
      const rows = parseQtiXml(text);
      if (rows.length === 0) throw new Error('لم يُعثر على أسئلة في الملف');
      const sid = skillId || skills[0]?.id;
      if (!sid) throw new Error('اختر مهارة');

      const payload = rows.map((r) => ({
        skill_id: sid,
        type: r.type,
        question_text: r.question_text,
        options: r.options,
        correct_answer: r.correct_answer,
        difficulty: r.difficulty,
        created_by: user.id,
      }));
      const { error } = await supabase.from('questions').insert(payload);
      if (error) throw error;
      return payload.length;
    },
    onSuccess: (n) => {
      showSuccess(`تم استيراد ${n} سؤالاً من QTI`);
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: (e: Error) => showError(e),
  });

  const handleExport = () => {
    if (questions.length === 0) {
      showError(new Error('لا توجد أسئلة للتصدير'));
      return;
    }
    const xml = exportQuestionsToQti(questions, subjectLabel);
    downloadQtiFile(xml, `questions-${Date.now()}.xml`);
    showSuccess('تم تنزيل ملف QTI');
  };

  return (
    <div className="bg-navy-900/40 border border-blue-500/20 rounded-2xl p-4 space-y-3" dir="rtl">
      <div className="flex items-center gap-2">
        <FileCode className="w-5 h-5 text-blue-400" />
        <div>
          <h3 className="text-white font-semibold text-sm">تبادل QTI — S10</h3>
          <p className="text-white/40 text-[10px]">معيار IMS QTI 1.2 مبسّط (MCQ/TF)</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={skillId}
          onChange={(e) => setSkillId(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
        >
          {skills.map((s) => (
            <option key={s.id} value={s.id} className="bg-navy-950">{s.skill_name}</option>
          ))}
        </select>
        <Button size="sm" variant="secondary" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
          تصدير ({questions.length})
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".xml,text/xml"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importMutation.mutate(f);
            e.target.value = '';
          }}
        />
        <Button
          size="sm"
          icon={<Upload className="w-4 h-4" />}
          disabled={importMutation.isPending}
          onClick={() => fileRef.current?.click()}
        >
          استيراد QTI
        </Button>
      </div>
    </div>
  );
}
