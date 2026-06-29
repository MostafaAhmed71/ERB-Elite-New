import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Search, Printer, Shield, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { mergeGradeLists } from '../../lib/schoolClasses';
import { useGradeClassCatalog } from '../../hooks/useGradeClassCatalog';
import { getStudentQRUrl } from '../../lib/qr';
import { getApprovedPointsTotal, getLevelInfo } from '../../lib/calculations';
import type { DbStudent } from '../../types';
import { showSuccess, showError } from '../../lib/toast';
import { BarsLoader } from '../ui/BarsLoader';
import { ScreenGuideButton } from '../admin/ScreenGuideButton';
import clsx from 'clsx';
import { PLATFORM_NAME, PLATFORM_NAME_SHORT } from '../../lib/branding';

type Branding = { school_name: string; tagline: string; logo_url: string };

type StudentQRGeneratorProps = {
  embedded?: boolean;
};

export function StudentQRGenerator({ embedded = false }: StudentQRGeneratorProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const { data: catalog } = useGradeClassCatalog();

  // 1. Fetch Students and their points to display on the card
  const { data: students = [], isLoading } = useQuery({
    queryKey: ['admin', 'students', 'qr'],
    queryFn: async () => {
      const { data: studentsData, error: studentErr } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (studentErr) throw studentErr;

      const { data: ledgerData, error: ledgerErr } = await supabase
        .from('points_ledger')
        .select('student_id, points, status, activity_id, activities(category)')
        .eq('status', 'approved');

      if (ledgerErr) throw ledgerErr;

      // Group entries by student
      const studentEntries: Record<string, any[]> = {};
      ledgerData.forEach(item => {
        if (!studentEntries[item.student_id]) studentEntries[item.student_id] = [];
        studentEntries[item.student_id].push(item);
      });

      return (studentsData as DbStudent[]).map(s => {
        const entries = studentEntries[s.id] || [];
        const score = getApprovedPointsTotal(entries);
        const level = getLevelInfo(score);
        return {
          ...s,
          score,
          level,
        };
      });
    },
  });

  const { data: branding } = useQuery({
    queryKey: ['school-branding'],
    queryFn: async () => {
      const { data } = await supabase.from('school_settings').select('value').eq('key', 'school_branding').maybeSingle();
      return (data?.value ?? { school_name: PLATFORM_NAME_SHORT, tagline: PLATFORM_NAME, logo_url: '' }) as Branding;
    },
  });

  const rotateMutation = useMutation({
    mutationFn: async () => {
      const term = `term-${new Date().getFullYear()}-${new Date().getMonth() < 6 ? 1 : 2}`;
      const { data, error } = await supabase.rpc('rotate_student_qr_tokens', { p_term: term });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      showSuccess(`تم تجديد رموز QR لـ ${count} طالب`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'students', 'qr'] });
    },
    onError: (e: Error) => showError(e),
  });

  const grades = useMemo(
    () => mergeGradeLists(catalog?.grades, students.map((s) => s.grade)),
    [catalog?.grades, students]
  );

  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.admission_number.includes(search);
    const matchesGrade = gradeFilter === '' || s.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  const toggleSelect = (id: string) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredStudents.map(s => s.id);
    const allSelected = filteredIds.every(id => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-white" dir="rtl">
      {/* Print Stylesheet (only active during print) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background-color: white !important;
            color: black !important;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: grid !important;
            grid-template-cols: 1fr 1fr !important;
            gap: 20px !important;
            background-color: white !important;
            padding: 10px !important;
          }
          .card-container {
            border: 2px solid #000 !important;
            border-radius: 12px !important;
            padding: 15px !important;
            background: white !important;
            color: black !important;
            page-break-inside: avoid;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            height: 280px !important;
            box-shadow: none !important;
          }
          .card-header-print {
            border-bottom: 1px solid #ccc !important;
            padding-bottom: 5px !important;
            margin-bottom: 5px !important;
          }
          .qr-img-print {
            border: 1px solid #ccc !important;
          }
        }
      `}</style>

      {/* Screen Interface */}
      <div className={clsx('flex items-center justify-between flex-wrap gap-4 no-print', embedded && 'pt-1')}>
        {!embedded && (
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-gold-400" />
            بطاقات التعريف الذكية (QR)
          </h1>
          <p className="text-white/40 text-sm mt-1">توليد وطباعة بطاقات التعريف للطلاب التي تحتوي على رموز QR</p>
        </div>
        )}
        <div className={clsx('flex gap-2 flex-wrap items-center', embedded && 'w-full justify-between')}>
          {!embedded && <ScreenGuideButton path="/admin/id-cards" />}
        <button
          type="button"
          onClick={() => rotateMutation.mutate()}
          disabled={rotateMutation.isPending}
          className="flex items-center gap-2 px-4 py-2.5 border border-cyan-500/30 text-cyan-300 rounded-xl text-sm hover:bg-cyan-500/10 disabled:opacity-50"
        >
          <RefreshCw className={clsx('w-4 h-4', rotateMutation.isPending && 'animate-spin')} />
          تجديد QR للفصل
        </button>
        <button
          onClick={handlePrint}
          disabled={selectedStudentIds.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 rounded-xl font-bold text-sm hover:shadow-lg disabled:opacity-50 transition-all"
        >
          <Printer className="w-4 h-4" />
          طباعة البطاقات المحددة ({selectedStudentIds.length})
        </button>
        </div>
      </div>

      {/* Filters (Screen only) */}
      <div className="flex gap-3 flex-wrap no-print">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute top-1/2 -translate-y-1/2 right-3.5 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الرقم الأكاديمي..."
            className="w-full bg-navy-900/50 border border-white/10 rounded-xl px-4 pr-10 py-2 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 text-xs"
          />
        </div>
        <select
          value={gradeFilter}
          onChange={e => setGradeFilter(e.target.value)}
          className="bg-navy-900/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-gold-400/50 appearance-none"
        >
          <option value="">كل الصفوف</option>
          {grades.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <button
          onClick={selectAllFiltered}
          className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-xs transition-colors"
        >
          {filteredStudents.every(s => selectedStudentIds.includes(s.id)) ? 'إلغاء تحديد الكل' : 'تحديد كل الظاهر'}
        </button>
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
        {isLoading ? (
          <div className="col-span-full py-8 flex justify-center">
            <BarsLoader label="جاري تحميل الطلاب..." />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="col-span-full text-center text-white/30 py-8">لا يوجد طلاب متطابقين</div>
        ) : (
          filteredStudents.map(student => {
            const isSelected = selectedStudentIds.includes(student.id);
            const qrUrl = getStudentQRUrl(student.id, (student as DbStudent).qr_token);
            const qrCodeApi = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrUrl)}`;

            return (
              <div
                key={student.id}
                onClick={() => toggleSelect(student.id)}
                className={clsx(
                  'bg-navy-900/40 border rounded-2xl p-5 flex flex-col justify-between h-64 cursor-pointer hover:-translate-y-0.5 transition-all select-none relative',
                  isSelected ? 'border-gold-400 bg-gold-400/[0.02]' : 'border-white/5 hover:border-white/10'
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-white font-bold text-sm">{student.full_name}</h3>
                    <p className="text-white/40 text-xs mt-1">{student.grade} • {student.class_name}</p>
                    <p className="text-white/20 text-[10px] font-mono mt-0.5">{student.admission_number}</p>
                  </div>
                  <div className="w-16 h-16 bg-white p-1 rounded-lg shrink-0">
                    <img src={qrCodeApi} alt="QR Code" className="w-full h-full object-contain" />
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-white/40">إجمالي النقاط:</span>
                    <span className="text-gold-400">{student.score} ن</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">المستوى الحالي:</span>
                    <span className={student.level.color}>{student.level.name}</span>
                  </div>
                </div>

                {isSelected && (
                  <div className="absolute top-3 left-3 bg-gold-400 text-navy-950 p-0.5 rounded-full shadow">
                    <CheckCircle className="w-4 h-4 fill-current" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Hidden Print Area (only rendered during printing) */}
      <div id="print-area" className="hidden">
        {students
          .filter(s => selectedStudentIds.includes(s.id))
          .map(student => {
            const qrUrl = getStudentQRUrl(student.id, (student as DbStudent).qr_token);
            const qrCodeApi = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrUrl)}`;
            const scorePercent = student.level.nextMin
              ? Math.round(((student.score - student.level.min) / (student.level.nextMin - student.level.min)) * 100)
              : 100;

            return (
              <div key={student.id} className="card-container border-2 border-black p-4 flex flex-col justify-between h-[280px] bg-white text-black rounded-xl shadow-none">
                <div className="flex justify-between items-start card-header-print border-b pb-2">
                  <div className="text-right">
                    <h2 className="text-black font-extrabold text-base leading-tight">{student.full_name}</h2>
                    <p className="text-black/60 text-xs mt-1">{student.grade} • {student.class_name}</p>
                    <p className="text-black/40 text-[9px] font-mono mt-0.5">الرقم: {student.admission_number}</p>
                  </div>
                  <div className="text-center font-bold text-[10px] text-black shrink-0 border border-black/20 p-1.5 rounded-lg bg-slate-50 max-w-[90px]">
                    {branding?.school_name ?? PLATFORM_NAME_SHORT}
                    <p className="text-[7px] font-normal text-black/50 mt-0.5">{branding?.tagline}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2">
                  <div className="space-y-1.5 flex-1 pr-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-black/60">إجمالي النقاط:</span>
                      <strong className="text-black">{student.score} ن</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-black/60">المستوى:</span>
                      <strong className="text-black">{student.level.name}</strong>
                    </div>
                    <div className="w-full h-1 bg-black/10 rounded-full overflow-hidden">
                      <div className="h-full bg-black" style={{ width: `${Math.min(scorePercent, 100)}%` }} />
                    </div>
                  </div>
                  <div className="w-20 h-20 p-1 border border-black/15 rounded-lg shrink-0 bg-white qr-img-print">
                    <img src={qrCodeApi} alt="QR Code" className="w-full h-full object-contain" />
                  </div>
                </div>

                <div className="text-center text-[8px] border-t pt-1.5 text-black/50 border-black/10">
                  امسح رمز الاستجابة QR لعرض البطاقة والمحاور التعليمية للتميز
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
