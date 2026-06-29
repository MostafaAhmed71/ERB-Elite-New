import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/Button';
import { showSuccess, showError } from '../../lib/toast';
import type { DbSkill } from '../../types';
import {
  downloadQuestionTemplate,
  parseQuestionExcelRows,
  readQuestionExcelFile,
  type QuestionImportRow,
} from '../../lib/questionImport';

type Props = {
  skills: DbSkill[];
  subjectLabel: string;
  defaultSkillId?: string;
};

export function QuestionImportPanel({ skills, subjectLabel, defaultSkillId }: Props) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [parsed, setParsed] = useState<QuestionImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [skillOverride, setSkillOverride] = useState(defaultSkillId ?? '');

  const validRows = parsed.filter((r) => r._valid);
  const invalidRows = parsed.filter((r) => !r._valid);

  const parseFile = useCallback(
    async (file: File) => {
      setFileName(file.name);
      try {
        const rows = await readQuestionExcelFile(file);
        const skillId = skillOverride || defaultSkillId;
        setParsed(parseQuestionExcelRows(rows, skills, skillId));
      } catch {
        showError('تعذّر قراءة الملف');
      }
    },
    [skills, skillOverride, defaultSkillId],
  );

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('غير مصرح');
      if (validRows.length === 0) throw new Error('لا توجد صفوف صالحة');

      const payload = validRows.map((r) => ({
        skill_id: skillOverride || r.skill_id,
        type: r.type,
        question_text: r.question_text,
        options: r.options,
        correct_answer: r.correct_answer,
        difficulty: r.difficulty,
        sub_skill_label: r.sub_skill_label,
        created_by: user.id,
      }));

      const { error } = await supabase.from('questions').insert(payload);
      if (error) throw error;
      return payload.length;
    },
    onSuccess: (count) => {
      showSuccess(`تم استيراد ${count} سؤالاً`);
      setParsed([]);
      setFileName(null);
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: (e: Error) => showError(e),
  });

  return (
    <div className="bg-navy-900/40 border border-white/10 rounded-2xl p-4 space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-white font-semibold text-sm">استيراد من Excel</p>
            <p className="text-white/40 text-xs">{subjectLabel}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={() => downloadQuestionTemplate()}
          >
            تنزيل النموذج
          </Button>
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gold-500/15 text-gold-400 border border-gold-500/25 text-sm font-semibold cursor-pointer hover:bg-gold-500/25 transition-colors">
            <Upload className="w-4 h-4" />
            اختيار ملف
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void parseFile(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      {skills.length > 1 && (
        <label className="block space-y-1">
          <span className="text-white/50 text-xs">مهارة افتراضية (إن لم تُذكر في الملف)</span>
          <select
            value={skillOverride}
            onChange={(e) => setSkillOverride(e.target.value)}
            className="w-full max-w-md bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
          >
            <option value="" className="bg-navy-900">— من الملف —</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id} className="bg-navy-900">
                {s.skill_name}
              </option>
            ))}
          </select>
        </label>
      )}

      {fileName && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">{fileName}</span>
            <button
              type="button"
              onClick={() => { setParsed([]); setFileName(null); }}
              className="text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {validRows.length} صالح
            </span>
            {invalidRows.length > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <AlertCircle className="w-3.5 h-3.5" />
                {invalidRows.length} يحتاج تصحيح
              </span>
            )}
          </div>

          {invalidRows.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
              {invalidRows.slice(0, 8).map((r) => (
                <p key={r._row} className="text-red-300/80">
                  صف {r._row}: {r._errors.join(' · ')}
                </p>
              ))}
            </div>
          )}

          <Button
            size="sm"
            onClick={() => importMutation.mutate()}
            disabled={validRows.length === 0 || importMutation.isPending}
            className="!bg-emerald-500/20 !text-emerald-400 !border-emerald-500/30"
          >
            {importMutation.isPending ? 'جاري الاستيراد...' : `استيراد ${validRows.length} سؤال`}
          </Button>
        </div>
      )}
    </div>
  );
}
