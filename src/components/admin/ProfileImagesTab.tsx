import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageIcon, School, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import {
  classProfileKey,
  fetchClassProfiles,
  uploadClassPhoto,
  uploadStudentPhoto,
} from '../../lib/mediaUpload';
import { mergeGradeLists } from '../../lib/schoolClasses';
import { useGradeClassCatalog } from '../../hooks/useGradeClassCatalog';
import type { DbStudent } from '../../types';
import { BarsLoader } from '../ui/BarsLoader';
import { SearchInput } from '../ui/SearchInput';
import { ImageUploadChip } from '../ui/ImageUploadChip';

export function ProfileImagesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const { data: catalog } = useGradeClassCatalog();

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['admin', 'profile-images', 'students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, grade, class_name, admission_number, photo_url, user_id')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return (data ?? []) as (DbStudent & { photo_url?: string | null })[];
    },
  });

  const { data: classProfiles = [], isLoading: classesLoading } = useQuery({
    queryKey: ['admin', 'profile-images', 'classes'],
    queryFn: fetchClassProfiles,
  });

  const classPhotoByKey = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const row of classProfiles) {
      map.set(classProfileKey(row.grade, row.class_name), row.photo_url);
    }
    return map;
  }, [classProfiles]);

  const grades = useMemo(
    () => mergeGradeLists(catalog?.grades, students.map((s) => s.grade)),
    [catalog?.grades, students]
  );

  const classesInGrade = useMemo(() => {
    if (!gradeFilter) return [];
    const fromStudents = students.filter((s) => s.grade === gradeFilter).map((s) => s.class_name);
    const fromCatalog = catalog?.classesByGrade?.[gradeFilter] ?? [];
    return [...new Set([...fromCatalog, ...fromStudents])].sort();
  }, [gradeFilter, students, catalog?.classesByGrade]);

  const filteredStudents = students.filter((s) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      s.full_name.toLowerCase().includes(q) ||
      s.admission_number.includes(search.trim());
    const matchesGrade = !gradeFilter || s.grade === gradeFilter;
    const matchesClass = !classFilter || s.class_name === classFilter;
    return matchesSearch && matchesGrade && matchesClass;
  });

  const classRows = useMemo(() => {
    if (!gradeFilter) return [];
    const names = classFilter
      ? [classFilter]
      : [...new Set(students.filter((s) => s.grade === gradeFilter).map((s) => s.class_name))].sort();
    return names.map((class_name) => ({
      grade: gradeFilter,
      class_name,
      photo_url: classPhotoByKey.get(classProfileKey(gradeFilter, class_name)) ?? null,
    }));
  }, [gradeFilter, classFilter, students, classPhotoByKey]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'profile-images'] });
    queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'students', 'id-cards'] });
  };

  const handleStudentUpload = async (studentId: string, file: File) => {
    try {
      await uploadStudentPhoto(studentId, file);
      toast.success('تم رفع صورة الطالب');
      invalidateAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل رفع الصورة');
      throw err;
    }
  };

  const handleClassUpload = async (grade: string, className: string, file: File) => {
    try {
      await uploadClassPhoto(grade, className, file);
      toast.success('تم رفع صورة الفصل');
      invalidateAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل رفع الصورة');
      throw err;
    }
  };

  const isLoading = studentsLoading || classesLoading;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100/90">
        <ImageIcon className="w-4 h-4 inline ml-1.5 -mt-0.5" />
        الصور التي ترفعها هنا تظهر في <strong>بطاقة الطالب</strong> وفي <strong>لوحة المتصدرين</strong> (شاشة
        العرض والإدارة).
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="بحث بالاسم أو رقم القيد..."
          className="min-w-[200px] flex-1"
        />
        <select
          value={gradeFilter}
          onChange={(e) => {
            setGradeFilter(e.target.value);
            setClassFilter('');
          }}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
        >
          <option value="" className="bg-navy-900">
            كل الصفوف
          </option>
          {grades.map((g) => (
            <option key={g} value={g} className="bg-navy-900">
              {g}
            </option>
          ))}
        </select>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          disabled={!gradeFilter}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm disabled:opacity-40"
        >
          <option value="" className="bg-navy-900">
            كل الفصول
          </option>
          {classesInGrade.map((c) => (
            <option key={c} value={c} className="bg-navy-900">
              {c}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <BarsLoader label="جاري التحميل..." />
      ) : (
        <>
          {gradeFilter && classRows.length > 0 && (
            <section className="glass-card p-5 space-y-4">
              <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
                <School className="w-4 h-4 text-gold-400" />
                صور الفصول — {gradeFilter}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {classRows.map((row) => (
                  <div
                    key={`${row.grade}-${row.class_name}`}
                    className="rounded-xl border border-white/8 bg-white/[0.03] p-4"
                  >
                    <ImageUploadChip
                      label={`فصل ${row.class_name}`}
                      imageUrl={row.photo_url}
                      fallback={<School className="w-6 h-6" />}
                      shape="rounded"
                      size="lg"
                      onUpload={(file) => handleClassUpload(row.grade, row.class_name, file)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="glass-card p-5 space-y-4">
            <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-gold-400" />
              صور الطلاب ({filteredStudents.length})
            </h3>
            {filteredStudents.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-8">لا يوجد طلاب مطابقون للفلتر</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3"
                  >
                    <ImageUploadChip
                      label={student.full_name}
                      imageUrl={(student as { photo_url?: string | null }).photo_url}
                      fallback={
                        <span className="text-lg font-bold text-white/50">
                          {student.full_name.charAt(0)}
                        </span>
                      }
                      onUpload={(file) => handleStudentUpload(student.id, file)}
                    />
                    <p className="text-[11px] text-white/35 mt-2 mr-[4.25rem]">
                      {student.grade} — فصل {student.class_name} · {student.admission_number}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
