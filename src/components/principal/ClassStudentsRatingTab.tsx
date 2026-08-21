import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, Star, ChevronLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useGradeClassCatalog } from '../../hooks/useGradeClassCatalog';
import { computePrincipalStudentRating, ratingBadgeClass, ratingColor } from '../../lib/principalStudentRating';
import { classifyExamWarnings } from '../../lib/earlyWarning';
import type { DbStudent } from '../../types';
import { Panel } from '../ui/Card';
import { TapHandLoader } from '../ui/TapHandLoader';
import { EmptyState } from '../ui/EmptyState';
import { SearchInput } from '../ui/SearchInput';
import clsx from 'clsx';

export function ClassStudentsRatingTab() {
  const navigate = useNavigate();
  const [grade, setGrade] = useState('');
  const [className, setClassName] = useState('');
  const [search, setSearch] = useState('');

  const { data: catalog, isLoading: catalogLoading } = useGradeClassCatalog();

  const availableClasses = useMemo(() => {
    if (!grade || !catalog) return [];
    return catalog.classesByGrade[grade] ?? catalog.allClasses;
  }, [grade, catalog]);

  const { data, isLoading } = useQuery({
    queryKey: ['principal', 'class-students', grade, className],
    queryFn: async () => {
      const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .eq('grade', grade)
        .eq('class_name', className)
        .order('full_name');
      if (error) throw error;

      const list = students as DbStudent[];
      const ids = list.map((s) => s.id);
      if (ids.length === 0) return { students: [], ratings: new Map(), warnings: new Map() };

      const [examsRes, attRes] = await Promise.all([
        supabase.from('exam_results').select('student_id, score, max_score').in('student_id', ids),
        supabase.from('attendance').select('student_id, status').in('student_id', ids),
      ]);
      if (examsRes.error) throw examsRes.error;
      if (attRes.error) throw attRes.error;

      const examsByStudent = new Map<string, Array<{ score: number; max_score: number }>>();
      for (const row of examsRes.data ?? []) {
        if (!examsByStudent.has(row.student_id)) examsByStudent.set(row.student_id, []);
        examsByStudent.get(row.student_id)!.push({
          score: row.score as number,
          max_score: row.max_score as number,
        });
      }

      const attByStudent = new Map<string, Array<{ status: 'present' | 'absent' | 'late' }>>();
      for (const row of attRes.data ?? []) {
        if (!attByStudent.has(row.student_id)) attByStudent.set(row.student_id, []);
        attByStudent.get(row.student_id)!.push({
          status: row.status as 'present' | 'absent' | 'late',
        });
      }

      const ratings = new Map(
        list.map((s) => [
          s.id,
          computePrincipalStudentRating(
            examsByStudent.get(s.id) ?? [],
            attByStudent.get(s.id) ?? []
          ),
        ])
      );

      const warnings = classifyExamWarnings(
        list,
        (examsRes.data ?? []).map((e) => ({
          student_id: e.student_id,
          score: e.score as number,
          max_score: e.max_score as number,
        }))
      );
      const warningMap = new Map(warnings.map((w) => [w.studentId, w]));

      return { students: list, ratings, warnings: warningMap };
    },
    enabled: !!grade && !!className,
  });

  const filtered = useMemo(() => {
    const list = data?.students ?? [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.admission_number.includes(q)
    );
  }, [data?.students, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ra = data?.ratings.get(a.id)?.overall ?? -1;
      const rb = data?.ratings.get(b.id)?.overall ?? -1;
      return rb - ra;
    });
  }, [filtered, data?.ratings]);

  const openStudent = (studentId: string) => {
    navigate(`/principal/student/${studentId}?from=classes`);
  };

  if (catalogLoading) {
    return <TapHandLoader label="جاري التحميل..." />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-white/50 text-xs">الصف</label>
          <select
            value={grade}
            onChange={(e) => {
              setGrade(e.target.value);
              setClassName('');
            }}
            className="w-full bg-navy-900/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
          >
            <option value="">اختر الصف</option>
            {(catalog?.grades ?? []).map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          {catalog && catalog.grades.length === 0 && (
            <p className="text-amber-400 text-xs mt-1">لا توجد صفوف — أضف طلاباً أو حدّث الإعدادات</p>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-white/50 text-xs">الفصل</label>
          <select
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            disabled={!grade}
            className="w-full bg-navy-900/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm disabled:opacity-40"
          >
            <option value="">اختر الفصل</option>
            {(availableClasses ?? []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-white/50 text-xs">بحث</label>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="اسم أو رقم هوية..."
            disabled={!grade || !className}
          />
        </div>
      </div>

      {!grade || !className ? (
        <EmptyState
          illustration="students"
          title="اختر الصف والفصل"
          description="حدد الصف والفصل لعرض طلابه وتقييمهم الأكاديمي"
        />
      ) : isLoading ? (
        <TapHandLoader label="جاري جلب الطلاب..." />
      ) : sorted.length === 0 ? (
        <EmptyState
          illustration="students"
          title="لا يوجد طلاب"
          description="لا يوجد طلاب نشطون في هذا الفصل"
        />
      ) : (
        <Panel className="overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <Users className="w-4 h-4 text-gold-400" />
              {sorted.length} طالب — {grade} / فصل {className}
            </div>
            <span className="text-white/30 text-xs">مرتب حسب التقييم الشامل</span>
          </div>
          <div className="divide-y divide-white/5">
            {sorted.map((student) => {
              const rating = data?.ratings.get(student.id);
              const warning = data?.warnings.get(student.id);
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => openStudent(student.id)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-white/3 transition-colors text-right group"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/80 to-purple-600/80 flex items-center justify-center text-white font-bold shrink-0">
                    {student.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{student.full_name}</p>
                    <p className="text-white/35 text-xs font-mono mt-0.5">{student.admission_number}</p>
                    {warning && (
                      <p className="text-amber-400/80 text-[10px] mt-1">{warning.label}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {rating?.examPct != null && (
                      <div className="text-center hidden sm:block">
                        <p className="text-white/30 text-[10px]">اختبارات</p>
                        <p className={clsx('text-sm font-bold tabular-nums', ratingColor(rating.examPct))}>
                          {rating.examPct}%
                        </p>
                      </div>
                    )}
                    {(rating?.attendanceScore ?? 0) > 0 && (
                      <div className="text-center hidden sm:block">
                        <p className="text-white/30 text-[10px]">حضور</p>
                        <p className={clsx('text-sm font-bold tabular-nums', ratingColor(rating?.attendanceScore ?? null))}>
                          {rating?.attendanceScore}
                        </p>
                      </div>
                    )}
                    <div
                      className={clsx(
                        'min-w-[72px] px-3 py-2 rounded-xl border text-center',
                        ratingBadgeClass(rating?.overall ?? null)
                      )}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-3.5 h-3.5" />
                        <span className="font-bold text-lg tabular-nums">
                          {rating?.overall ?? '—'}
                        </span>
                      </div>
                      <p className="text-[9px] opacity-70 mt-0.5">{rating?.label}</p>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-white/20 group-hover:text-gold-400 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}
