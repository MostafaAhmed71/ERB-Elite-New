import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Plus } from 'lucide-react';
import type { DbSkill, Difficulty } from '../../types';
import { generateAiQuestionDrafts } from '../../lib/questionAiSuggest';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/Button';
import { showSuccess, showError } from '../../lib/toast';

type Props = {
  skills: DbSkill[];
  defaultSkillId?: string;
};

/** S9 — اقتراح أسئلة (مراجعة بشرية) */
export function AiQuestionSuggestPanel({ skills, defaultSkillId }: Props) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [skillId, setSkillId] = useState(defaultSkillId ?? skills[0]?.id ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [drafts, setDrafts] = useState<ReturnType<typeof generateAiQuestionDrafts>>([]);

  const skill = skills.find((s) => s.id === skillId);

  const saveMutation = useMutation({
    mutationFn: async (indices: number[]) => {
      if (!user || !skill) throw new Error('اختر مهارة');
      const payload = indices.map((i) => {
        const d = drafts[i];
        return {
          skill_id: skill.id,
          type: d.type,
          question_text: d.question_text,
          options: d.options,
          correct_answer: d.correct_answer,
          difficulty: d.difficulty,
          sub_skill_label: d.sub_skill_label,
          created_by: user.id,
        };
      });
      const { error } = await supabase.from('questions').insert(payload);
      if (error) throw error;
      return payload.length;
    },
    onSuccess: (n) => {
      showSuccess(`تم حفظ ${n} سؤالاً بعد المراجعة`);
      setDrafts([]);
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: (e: Error) => showError(e),
  });

  const handleGenerate = () => {
    if (!skill) return;
    setDrafts(generateAiQuestionDrafts(skill, 3, difficulty));
  };

  return (
    <div className="bg-navy-900/40 border border-purple-500/20 rounded-2xl p-4 space-y-3" dir="rtl">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <div>
          <h3 className="text-white font-semibold text-sm">اقتراح أسئلة — S9</h3>
          <p className="text-white/40 text-[10px]">مسودات ذكية — راجع قبل الحفظ (لا تُحفظ تلقائياً)</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={skillId}
          onChange={(e) => setSkillId(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
        >
          {skills.map((s) => (
            <option key={s.id} value={s.id} className="bg-navy-950">{s.skill_name}</option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
        >
          <option value="easy" className="bg-navy-950">سهل</option>
          <option value="medium" className="bg-navy-950">متوسط</option>
          <option value="hard" className="bg-navy-950">صعب</option>
        </select>
        <Button size="sm" variant="secondary" onClick={handleGenerate}>
          توليد 3 مسودات
        </Button>
      </div>

      {drafts.length > 0 && (
        <div className="space-y-2">
          {drafts.map((d, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/3 border border-white/5 text-xs space-y-1">
              <p className="text-white">{d.question_text}</p>
              <ul className="text-white/40 list-disc pr-4">
                {d.options.map((o) => (
                  <li key={o} className={o === d.correct_answer ? 'text-emerald-400' : ''}>{o}</li>
                ))}
              </ul>
            </div>
          ))}
          <Button
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate(drafts.map((_, i) => i))}
          >
            حفظ الكل بعد المراجعة
          </Button>
        </div>
      )}
    </div>
  );
}
