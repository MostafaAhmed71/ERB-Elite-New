import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Printer, CheckCircle, Archive, Download } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { mergeGradeLists } from '../../lib/schoolClasses';
import { useGradeClassCatalog } from '../../hooks/useGradeClassCatalog';
import { extractErrorMessage } from '../../lib/errors';
import { exportStudentCardsZip, downloadStudentCardImage, type StudentCardExportItem } from '../../lib/exportStudentCardsZip';
import type { DbStudent } from '../../types';
import { BarsLoader } from '../ui/BarsLoader';
import { Button } from '../ui/Button';
import { StudentCard } from '../student/StudentCard';

type StudentWithAvatar = DbStudent & { photoUrl: string | null };

function toExportItem(student: StudentWithAvatar): StudentCardExportItem {
  return {
    id: student.id,
    full_name: student.full_name,
    grade: student.grade,
    class_name: student.class_name,
    admission_number: student.admission_number,
    qr_token: student.qr_token,
    photoUrl: student.photoUrl,
  };
}

export function AdminStudentCardsTab() {
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ done: 0, total: 0 });
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { data: catalog } = useGradeClassCatalog();

  const { data: students = [], isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'students', 'id-cards'],
    queryFn: async () => {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*, photo_url')
        .eq('is_active', true)
        .order('full_name');
      if (studentsError) throw studentsError;

      const rows = (studentsData ?? []) as DbStudent[];
      const userIds = [...new Set(rows.map((s) => s.user_id).filter(Boolean))] as string[];

      const avatarByUserId = new Map<string, string | null>();
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, avatar_url')
          .in('id', userIds);
        if (!usersError) {
          for (const user of usersData ?? []) {
            avatarByUserId.set(user.id, user.avatar_url);
          }
        }
      }

      return rows.map((student) => ({
        ...student,
        photoUrl:
          (student as DbStudent & { photo_url?: string | null }).photo_url ??
          (student.user_id ? avatarByUserId.get(student.user_id) ?? null : null),
      })) satisfies StudentWithAvatar[];
    },
  });

  const grades = useMemo(
    () => mergeGradeLists(catalog?.grades, students.map((s) => s.grade)),
    [catalog?.grades, students]
  );

  const filteredStudents = students.filter((s) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      s.full_name.toLowerCase().includes(q) ||
      s.admission_number.includes(search.trim());
    const matchesGrade = !gradeFilter || s.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  const toggleSelect = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredStudents.map((s) => s.id);
    const allSelected = filteredIds.every((id) => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const selectedStudents = students.filter((s) => selectedStudentIds.includes(s.id));

  const handleDownloadSingle = async (student: StudentWithAvatar) => {
    setDownloadingId(student.id);
    try {
      await downloadStudentCardImage(toExportItem(student));
      toast.success(`تم تحميل بطاقة ${student.full_name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل تحميل البطاقة');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadZip = async (targets: StudentWithAvatar[], zipLabel: string) => {
    if (targets.length === 0) {
      toast.error('لا يوجد طلاب للتصدير');
      return;
    }

    setExporting(true);
    setExportProgress({ done: 0, total: targets.length });

    try {
      await exportStudentCardsZip(targets.map(toExportItem), {
        zipFileName: `${zipLabel}-${new Date().toISOString().slice(0, 10)}.zip`,
        onProgress: (done, total) => setExportProgress({ done, total }),
      });
      toast.success(`تم تحميل ${targets.length} بطاقة في ملف مضغوط`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل تحميل البطاقات');
    } finally {
      setExporting(false);
      setExportProgress({ done: 0, total: 0 });
    }
  };

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-student-cards-area,
          #print-student-cards-area * { visibility: visible !important; }
          #print-student-cards-area {
            position: absolute;
            inset: 0;
            display: grid !important;
            grid-template-columns: repeat(2, 54mm);
            gap: 6mm;
            justify-content: center;
            align-content: start;
            padding: 10mm;
            background: white !important;
          }
        }
      `}</style>

      <div className="flex flex-wrap items-center gap-3 no-print">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم القيد..."
            className="w-full rounded-xl border border-white/10 bg-navy-900/50 py-2 pr-10 pl-3 text-xs text-white placeholder:text-white/20 focus:border-gold-400/50 focus:outline-none"
          />
        </div>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="appearance-none rounded-xl border border-white/10 bg-navy-900/50 px-3 py-2 text-xs text-white focus:border-gold-400/50 focus:outline-none"
        >
          <option value="">كل الصفوف</option>
          {grades.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <Button type="button" variant="secondary" size="sm" onClick={selectAllFiltered} disabled={exporting}>
          {filteredStudents.every((s) => selectedStudentIds.includes(s.id))
            ? 'إلغاء تحديد الكل'
            : 'تحديد كل الظاهر'}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => window.print()}
          disabled={selectedStudentIds.length === 0 || exporting}
          className="gap-2"
        >
          <Printer className="h-4 w-4" />
          طباعة ({selectedStudentIds.length})
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={selectedStudentIds.length === 0 || exporting}
          className="gap-2"
          onClick={() => void handleDownloadZip(selectedStudents, 'بطاقات-محددة')}
        >
          <Archive className="h-4 w-4" />
          {exporting && exportProgress.total === selectedStudents.length
            ? `جاري التحميل ${exportProgress.done}/${exportProgress.total}`
            : `ZIP المحدد (${selectedStudentIds.length})`}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={filteredStudents.length === 0 || exporting}
          className="gap-2"
          onClick={() => void handleDownloadZip(filteredStudents, 'بطاقات-الطلاب')}
        >
          <Archive className="h-4 w-4" />
          {exporting && exportProgress.total === filteredStudents.length
            ? `جاري التحميل ${exportProgress.done}/${exportProgress.total}`
            : `تحميل الكل ZIP (${filteredStudents.length})`}
        </Button>
      </div>

      {exporting && (
        <div className="no-print rounded-xl border border-gold-400/20 bg-gold-400/5 px-4 py-3 text-xs text-gold-200">
          جاري إنشاء البطاقات وتجميعها في ملف مضغوط… ({exportProgress.done}/{exportProgress.total})
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <BarsLoader label="جاري تحميل الطلاب..." />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-8 text-center">
          <p className="text-sm text-red-200">تعذر تحميل قائمة الطلاب</p>
          <p className="mt-1 text-xs text-red-200/70">{extractErrorMessage(error)}</p>
        </div>
      ) : students.length === 0 ? (
        <p className="py-12 text-center text-sm text-white/30">لا يوجد طلاب نشطون في النظام</p>
      ) : filteredStudents.length === 0 ? (
        <p className="py-12 text-center text-sm text-white/30">لا يوجد طلاب مطابقون للبحث أو الفلتر</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 no-print">
          {filteredStudents.map((student) => {
            const isSelected = selectedStudentIds.includes(student.id);
            const isDownloading = downloadingId === student.id;
            return (
              <div
                key={student.id}
                role="button"
                tabIndex={0}
                onClick={() => !exporting && !isDownloading && toggleSelect(student.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!exporting && !isDownloading) toggleSelect(student.id);
                  }
                }}
                className={clsx(
                  'relative flex flex-col items-center overflow-visible rounded-2xl border p-4 transition-all cursor-pointer',
                  isSelected
                    ? 'border-gold-400/60 bg-gold-400/[0.04] ring-1 ring-gold-400/30'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20',
                  (exporting || isDownloading) && 'opacity-70 pointer-events-none'
                )}
              >
                {isSelected && (
                  <span className="absolute left-3 top-3 rounded-full bg-gold-400 p-0.5 text-navy-950 shadow">
                    <CheckCircle className="h-4 w-4 fill-current" />
                  </span>
                )}
                <button
                  type="button"
                  title="تحميل البطاقة كصورة"
                  disabled={exporting || isDownloading}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDownloadSingle(student);
                  }}
                  className="absolute right-3 top-3 flex items-center gap-1 rounded-lg border border-white/15 bg-navy-900/90 px-2 py-1.5 text-[10px] font-semibold text-white/80 hover:border-gold-400/40 hover:text-gold-300 transition-colors pointer-events-auto disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  {isDownloading ? 'جاري...' : 'PNG'}
                </button>
                <StudentCard
                  studentName={student.full_name}
                  grade={student.grade}
                  studentClass={student.class_name}
                  admissionNumber={student.admission_number}
                  photoUrl={student.photoUrl}
                />
              </div>
            );
          })}
        </div>
      )}

      <div id="print-student-cards-area" className="hidden print:grid">
        {selectedStudents.map((student) => (
          <StudentCard
            key={student.id}
            studentName={student.full_name}
            grade={student.grade}
            studentClass={student.class_name}
            admissionNumber={student.admission_number}
            photoUrl={student.photoUrl}
            printSize
            wrapperClassName="shadow-none"
          />
        ))}
      </div>
    </div>
  );
}
