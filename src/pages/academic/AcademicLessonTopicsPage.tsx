import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { academicTeacherService } from '../../lib/academic/teacherService';
import { DEFAULT_SECTIONS, ACADEMIC_LEVEL_LABELS, gradesForLevel, formatGradeLabel, formatGradeSection } from '../../lib/academic/constants';
import type { AcademicEducationLevel, AcademicLessonTopics } from '../../lib/academic/types';
import { AcademicLayout, AcademicPageHeader, AcademicEmpty, academicInputClass, academicBtnPrimary, academicBtnSecondary } from '../../components/academic/AcademicUi';
import { AcademicSubjectSelect } from '../../components/academic/AcademicSubjectSelect';

export function AcademicLessonTopicsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [level, setLevel] = useState<AcademicEducationLevel>('middle');
  const [grade, setGrade] = useState(1);
  const [section, setSection] = useState('أ');
  const [editing, setEditing] = useState<AcademicLessonTopics | null>(null);

  const { data: setup } = useQuery({
    queryKey: ['academic-teacher-setup', user?.id],
    queryFn: () => academicTeacherService.getSetup(user!.id),
    enabled: !!user,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['academic-lesson-topics', user?.id],
    queryFn: () => academicTeacherService.listLessonTopics(user!.id),
    enabled: !!user,
  });

  const resetForm = () => {
    setEditing(null);
    setTopics([]);
    setSubject('');
    setTopic('');
  };

  const startEdit = (lt: AcademicLessonTopics) => {
    setEditing(lt);
    setSubject(lt.subject);
    setLevel(lt.education_level);
    setGrade(lt.grade);
    setSection(lt.section);
    setTopics([...lt.topics]);
  };

  const saveMut = useMutation({
    mutationFn: () => academicTeacherService.saveLessonTopics({
      id: editing?.id,
      teacher_id: user!.id,
      education_level: level,
      grade,
      section,
      subject,
      topics,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['academic-lesson-topics'] }); resetForm(); },
  });

  const deleteMut = useMutation({
    mutationFn: academicTeacherService.deleteLessonTopics,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-lesson-topics'] }),
  });

  return (
    <AcademicLayout size="4xl">
      <AcademicPageHeader title="مواضيع الدروس" backTo="/academic" />
      <div className="horizon-card rounded-[20px] bg-[#111c44] p-4 mb-4 space-y-2">
        <h2 className="text-white font-semibold">{editing ? 'تعديل المواضيع' : 'مواضيع جديدة'}</h2>
        <div className="grid grid-cols-3 gap-2">
          <select className={academicInputClass} value={level} onChange={(e) => { setLevel(e.target.value as AcademicEducationLevel); setSubject(''); }}>
            <option value="middle">متوسط</option><option value="high">ثانوي</option>
          </select>
          <select className={academicInputClass} value={grade} onChange={(e) => { setGrade(+e.target.value); setSubject(''); }}>
            {gradesForLevel(level).map((g) => <option key={g} value={g}>{formatGradeLabel(level, g)}</option>)}
          </select>
          <select className={academicInputClass} value={section} onChange={(e) => setSection(e.target.value)}>
            {DEFAULT_SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <AcademicSubjectSelect
          level={level}
          grade={grade}
          value={subject}
          onChange={setSubject}
          teacherSetupSubjects={setup?.subjects}
          required
        />
        <div className="flex gap-2">
          <input className={academicInputClass} placeholder="موضوع" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <button type="button" className={academicBtnPrimary} onClick={() => { if (topic.trim()) { setTopics([...topics, topic.trim()]); setTopic(''); } }}>إضافة</button>
        </div>
        <ul className="text-white text-sm">{topics.map((t, i) => <li key={i}>{t}</li>)}</ul>
        <div className="flex gap-2">
          <button type="button" className={academicBtnPrimary} disabled={!subject || topics.length === 0} onClick={() => saveMut.mutate()}>{editing ? 'تحديث' : 'حفظ'}</button>
          {editing && <button type="button" className={academicBtnSecondary} onClick={resetForm}>إلغاء</button>}
        </div>
      </div>
      {items.length === 0 ? <AcademicEmpty message="لا مواضيع" /> : items.map((lt) => (
        <div key={lt.id} className="horizon-card rounded-xl bg-[#111c44] p-3 mb-2 text-white flex justify-between gap-2">
          <div>
            <strong>{lt.subject}</strong>
            <p className="text-[#A3AED0] text-xs">{formatGradeSection(lt.education_level, lt.grade, lt.section)}</p>
            <ol className="text-sm text-[#A3AED0] mt-1">{lt.topics.map((t, i) => <li key={i}>{t}</li>)}</ol>
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" className="text-gold-400" onClick={() => startEdit(lt)}><Pencil className="w-4 h-4" /></button>
            <button type="button" className="text-red-400" onClick={() => { if (confirm('حذف؟')) deleteMut.mutate(lt.id); }}><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      ))}
    </AcademicLayout>
  );
}
