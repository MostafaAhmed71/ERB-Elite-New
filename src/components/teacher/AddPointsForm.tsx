import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Check, User, Search, BookOpen, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAction } from '../../lib/auth';
import { useAuthStore } from '../../stores/authStore';
import { mergeGradeLists } from '../../lib/schoolClasses';
import { useGradeClassCatalog } from '../../hooks/useGradeClassCatalog';
import type { DbStudent, DbActivity } from '../../types';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';
import { ScreenGuideButton } from '../admin/ScreenGuideButton';

interface AddPointsFormProps {
  adminMode?: boolean;
}

const CATEGORIES = [
  { key: 'activity', label: 'النشاط (40%)' },
  { key: 'behavior', label: 'السلوك (30%)' },
  { key: 'achievement', label: 'الإنجاز (20%)' },
  { key: 'initiative', label: 'المبادرة (10%)' },
];

export function AddPointsForm({ adminMode = false }: AddPointsFormProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Tab mode: 'individual' | 'weekly'
  const [tab, setTab] = useState<'individual' | 'weekly'>('individual');

  // Form states - Individual
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('activity');
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [points, setPoints] = useState<number | ''>('');
  const [note, setNote] = useState('');

  // Form states - Weekly Behavior
  const [weeklyDate, setWeeklyDate] = useState(new Date().toISOString().split('T')[0]);
  const [weeklyStudents, setWeeklyStudents] = useState<string[]>([]);
  const [selectedWeeklyBehaviors, setSelectedWeeklyBehaviors] = useState<string[]>([]);
  const [deductions, setDeductions] = useState<number>(0);

  // Queries
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*').eq('is_active', true).order('full_name');
      if (error) throw error;
      return data as DbStudent[];
    },
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['activities', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('activities').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data as DbActivity[];
    },
  });

  const { data: catalog } = useGradeClassCatalog();

  // Filters and listings
  const grades = useMemo(
    () => mergeGradeLists(catalog?.grades, students.map((s) => s.grade)),
    [catalog?.grades, students]
  );
  const uniqueClasses = useMemo(() => {
    const fromStudents = students
      .filter((s) => s.grade === selectedGrade)
      .map((s) => s.class_name);
    const fromCatalog = selectedGrade
      ? catalog?.classesByGrade[selectedGrade] ?? []
      : [];
    return mergeGradeLists(fromCatalog, fromStudents);
  }, [students, selectedGrade, catalog]);

  const studentsInClass = students.filter(
    s => s.grade === selectedGrade && s.class_name === selectedClass
  );

  const activitiesInCategory = activities.filter(a => a.category === selectedCategory);
  const selectedActivityObj = activities.find(a => a.id === selectedActivityId);
  const finalPoints = points !== '' ? points : (selectedActivityObj?.default_points ?? 0);

  // Mutation for individual submission
  const individualMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('غير مصرح');
      if (!selectedStudentId) throw new Error('يرجى اختيار الطالب');
      if (!selectedActivityId) throw new Error('يرجى اختيار النشاط');
      if (Number(finalPoints) <= 0) throw new Error('النقاط يجب أن تكون أكبر من 0');

      const entry = {
        student_id: selectedStudentId,
        granted_by: user.id,
        activity_id: selectedActivityId,
        points: Number(finalPoints),
        note: note.trim() || null,
        status: adminMode ? ('approved' as const) : ('pending' as const),
        approved_by: adminMode ? user.id : null,
        approved_at: adminMode ? new Date().toISOString() : null,
        academic_year: new Date().getFullYear().toString(),
      };

      const { error } = await supabase.from('points_ledger').insert([entry]);
      if (error) throw error;

      await logAction('POINTS_ADDED_FORM', 'points_ledger', undefined, {
        student_id: selectedStudentId,
        points: finalPoints,
        adminMode,
      });
    },
    onSuccess: () => {
      toast.success(adminMode ? 'تمت إضافة النقاط واعتمادها فوراً بنجاح' : 'أُرسل طلب رصد النقاط للمراجعة');
      setSelectedStudentId('');
      setSelectedActivityId('');
      setPoints('');
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['points_ledger'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutation for weekly behavior
  const weeklyMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('غير مصرح');
      if (weeklyStudents.length === 0) throw new Error('يرجى تحديد طالب واحد على الأقل');
      if (selectedWeeklyBehaviors.length === 0) throw new Error('يرجى تحديد سلوك واحد على الأقل');

      const entries: any[] = [];
      weeklyStudents.forEach(studentId => {
        selectedWeeklyBehaviors.forEach(activityId => {
          const act = activities.find(a => a.id === activityId);
          if (act) {
            entries.push({
              student_id: studentId,
              granted_by: user.id,
              activity_id: activityId,
              points: act.default_points,
              note: `سلوك أسبوعي - ${new Date(weeklyDate).toLocaleDateString('ar-EG')}`,
              status: adminMode ? 'approved' : 'pending',
              approved_by: adminMode ? user.id : null,
              approved_at: adminMode ? new Date().toISOString() : null,
              academic_year: new Date().getFullYear().toString(),
              created_at: new Date(weeklyDate).toISOString(),
            });
          }
        });

        // Optional deduction entry
        if (deductions > 0) {
          entries.push({
            student_id: studentId,
            granted_by: user.id,
            points: -Number(deductions),
            note: `خصم سلوكي أسبوعي - ${new Date(weeklyDate).toLocaleDateString('ar-EG')}`,
            status: adminMode ? 'approved' : 'pending',
            approved_by: adminMode ? user.id : null,
            approved_at: adminMode ? new Date().toISOString() : null,
            academic_year: new Date().getFullYear().toString(),
            created_at: new Date(weeklyDate).toISOString(),
          });
        }
      });

      const { error } = await supabase.from('points_ledger').insert(entries);
      if (error) throw error;

      await logAction('WEEKLY_BEHAVIOR_ADDED', 'points_ledger', undefined, {
        students: weeklyStudents.length,
        behaviors: selectedWeeklyBehaviors.length,
        adminMode,
      });
    },
    onSuccess: () => {
      toast.success(adminMode ? 'تم تسجيل وتفعيل السلوك الأسبوعي بنجاح' : 'تم إرسال سجل السلوك الأسبوعي للمراجعة');
      setWeeklyStudents([]);
      setSelectedWeeklyBehaviors([]);
      setDeductions(0);
      queryClient.invalidateQueries({ queryKey: ['points_ledger'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleWeeklyStudent = (id: string) => {
    setWeeklyStudents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleWeeklyBehavior = (id: string) => {
    setSelectedWeeklyBehaviors(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const weeklyBehaviorActivities = activities.filter(a => a.category === 'behavior');

  return (
    <div className="space-y-6 animate-fade-in text-white" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="w-6 h-6 text-gold-400" />
          {adminMode ? 'إضافة نقاط يدوية (رائد النشاط)' : 'رصد نقاط الطلاب'}
        </h1>
        <p className="text-white/40 text-sm mt-1">
          {adminMode ? 'رصد نقاط مع اعتماد فوري ومباشر لأي طالب بالملعب التعليمي' : 'رصد نقاط ترسل للمشرف للموافقة'}
        </p>
        </div>
        {adminMode && <ScreenGuideButton path="/admin/add-points" />}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-0.5">
        <button
          onClick={() => setTab('individual')}
          className={clsx('px-4 py-2 text-sm font-semibold border-b-2 transition-all',
            tab === 'individual' ? 'border-gold-400 text-gold-400' : 'border-transparent text-white/40 hover:text-white/80'
          )}
        >
          رصد فردي بالأنشطة
        </button>
        <button
          onClick={() => setTab('weekly')}
          className={clsx('px-4 py-2 text-sm font-semibold border-b-2 transition-all',
            tab === 'weekly' ? 'border-gold-400 text-gold-400' : 'border-transparent text-white/40 hover:text-white/80'
          )}
        >
          رصد السلوك الأسبوعي
        </button>
      </div>

      {tab === 'individual' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Picker */}
          <div className="lg:col-span-2 bg-navy-900/50 border border-white/5 rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-white font-semibold flex items-center gap-2 text-base">
              <User className="w-4 h-4 text-gold-400" /> 1. اختيار الطالب
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-white/60 text-xs">الصف الدراسي</label>
                <select
                  value={selectedGrade}
                  onChange={e => { setSelectedGrade(e.target.value); setSelectedClass(''); setSelectedStudentId(''); }}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none"
                >
                  <option value="" className="bg-navy-900">اختر الصف</option>
                  {grades.map(g => <option key={g} value={g} className="bg-navy-900">{g}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-white/60 text-xs">الفصل</label>
                <select
                  value={selectedClass}
                  onChange={e => { setSelectedClass(e.target.value); setSelectedStudentId(''); }}
                  disabled={!selectedGrade}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none disabled:opacity-50"
                >
                  <option value="" className="bg-navy-900">اختر الفصل</option>
                  {uniqueClasses.map(c => <option key={c} value={c} className="bg-navy-900">{c}</option>)}
                </select>
              </div>
            </div>

            {selectedClass && (
              <div className="space-y-1.5 pt-2">
                <label className="text-white/60 text-xs">اختر الطالب</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {studentsInClass.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudentId(s.id)}
                      className={clsx('px-4 py-2.5 rounded-xl border text-right transition-all text-sm flex justify-between items-center',
                        selectedStudentId === s.id
                          ? 'bg-gold-500/15 border-gold-400 text-gold-400'
                          : 'bg-white/3 border-white/5 hover:border-white/15 text-white'
                      )}
                    >
                      <span>{s.full_name}</span>
                      <span className="text-[10px] text-white/30 font-mono">{s.admission_number}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Activity & Points Picker */}
          <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-6 space-y-4 shadow-xl h-fit">
            <h2 className="text-white font-semibold flex items-center gap-2 text-base">
              <BookOpen className="w-4 h-4 text-gold-400" /> 2. النشاط والنقاط
            </h2>

            <div className="space-y-1.5">
              <label className="text-white/60 text-xs">محور التميز</label>
              <select
                value={selectedCategory}
                onChange={e => { setSelectedCategory(e.target.value); setSelectedActivityId(''); }}
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none"
              >
                {CATEGORIES.map(cat => <option key={cat.key} value={cat.key} className="bg-navy-900">{cat.label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-white/60 text-xs">النشاط الفرعي</label>
              <select
                value={selectedActivityId}
                onChange={e => setSelectedActivityId(e.target.value)}
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none"
              >
                <option value="" className="bg-navy-900">اختر النشاط</option>
                {activitiesInCategory.map(a => (
                  <option key={a.id} value={a.id} className="bg-navy-900">
                    {a.name} ({a.default_points} ن)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-white/60 text-xs">النقاط (اختياري، اتركه للافتراضي)</label>
              <input
                type="number"
                min={1}
                value={points}
                onChange={e => setPoints(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={selectedActivityObj ? String(selectedActivityObj.default_points) : 'اختر نشاطاً'}
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-white/60 text-xs">ملاحظات</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                placeholder="تفاصيل التميز..."
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 text-sm resize-none"
              />
            </div>

            {selectedStudentId && selectedActivityId && (
              <div className="p-3 bg-white/3 border border-white/5 rounded-xl text-xs space-y-1">
                <p className="text-white/40">ملخص العملية:</p>
                <p className="text-white font-medium">
                  منح الطالب نقاط بقيمة <span className="text-gold-400 font-bold">{finalPoints} ن</span>
                </p>
                <p className="text-white/30 text-[10px]">
                  {adminMode ? 'سيتم اعتمادها وتفعيلها بالرصيد فوراً' : 'سيتطلب ذلك موافقة المشرف التربوي'}
                </p>
              </div>
            )}

            <button
              onClick={() => individualMutation.mutate()}
              disabled={individualMutation.isPending || !selectedStudentId || !selectedActivityId}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 font-bold text-sm hover:shadow-lg hover:shadow-gold-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {individualMutation.isPending ? 'جاري الرصد...' : (
                <>
                  <Check className="w-4 h-4" />
                  {adminMode ? 'رصد واعتماد فوري' : 'إرسال للمراجعة'}
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Weekly Behavior Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Class and Student Selection */}
          <div className="lg:col-span-2 bg-navy-900/50 border border-white/5 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h2 className="text-white font-semibold flex items-center gap-2 text-base">
                <Calendar className="w-4 h-4 text-gold-400" /> رصد السلوك لأسبوع
              </h2>
              <input
                type="date"
                value={weeklyDate}
                onChange={e => setWeeklyDate(e.target.value)}
                className="bg-navy-950 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-gold-400/50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-white/60 text-xs">الصف الدراسي</label>
                <select
                  value={selectedGrade}
                  onChange={e => { setSelectedGrade(e.target.value); setSelectedClass(''); setWeeklyStudents([]); }}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none"
                >
                  <option value="" className="bg-navy-900">اختر الصف</option>
                  {grades.map(g => <option key={g} value={g} className="bg-navy-900">{g}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-white/60 text-xs">الفصل</label>
                <select
                  value={selectedClass}
                  onChange={e => { setSelectedClass(e.target.value); setWeeklyStudents([]); }}
                  disabled={!selectedGrade}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none disabled:opacity-50"
                >
                  <option value="" className="bg-navy-900">اختر الفصل</option>
                  {uniqueClasses.map(c => <option key={c} value={c} className="bg-navy-900">{c}</option>)}
                </select>
              </div>
            </div>

            {selectedClass && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-white/60 text-xs">حدد الطلاب (متعدد)</label>
                  <button
                    onClick={() => {
                      const ids = studentsInClass.map(s => s.id);
                      if (weeklyStudents.length === ids.length) {
                        setWeeklyStudents([]);
                      } else {
                        setWeeklyStudents(ids);
                      }
                    }}
                    className="text-xs text-gold-400/80 hover:text-gold-400"
                  >
                    {weeklyStudents.length === studentsInClass.length ? 'إلغاء التحديد' : 'تحديد الكل'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {studentsInClass.map(s => (
                    <button
                      key={s.id}
                      onClick={() => toggleWeeklyStudent(s.id)}
                      className={clsx('px-4 py-2.5 rounded-xl border text-right transition-all text-sm flex justify-between items-center',
                        weeklyStudents.includes(s.id)
                          ? 'bg-gold-500/15 border-gold-400 text-gold-400'
                          : 'bg-white/3 border-white/5 hover:border-white/15 text-white'
                      )}
                    >
                      <span>{s.full_name}</span>
                      <span className="text-[10px] text-white/30 font-mono">{s.admission_number}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Behavior Criteria and Deductions */}
          <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-6 space-y-4 shadow-xl h-fit">
            <h2 className="text-white font-semibold flex items-center gap-2 text-base">
              <Check className="w-4 h-4 text-gold-400" /> السلوك والخصومات
            </h2>

            <div className="space-y-2">
              <label className="text-white/60 text-xs">معايير السلوك الأسبوعية المتوفرة</label>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {weeklyBehaviorActivities.map(a => (
                  <button
                    key={a.id}
                    onClick={() => toggleWeeklyBehavior(a.id)}
                    className={clsx('w-full px-3 py-2 border rounded-xl text-xs text-right flex justify-between items-center transition-all',
                      selectedWeeklyBehaviors.includes(a.id)
                        ? 'bg-emerald-500/10 border-emerald-400/50 text-emerald-300'
                        : 'bg-white/3 border-white/5 text-white/60 hover:text-white'
                    )}
                  >
                    <span>{a.name}</span>
                    <span className="font-bold shrink-0">+{a.default_points} ن</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-white/60 text-xs">خصومات سلوكية (إذا وجد مخالفة)</label>
              <input
                type="number"
                min={0}
                value={deductions}
                onChange={e => setDeductions(Number(e.target.value))}
                placeholder="0"
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 text-sm"
              />
              <p className="text-[10px] text-red-400/80">سيتم تسجيلها كخصم أسبوعي بالرصيد</p>
            </div>

            {weeklyStudents.length > 0 && selectedWeeklyBehaviors.length > 0 && (
              <div className="p-3 bg-white/3 border border-white/5 rounded-xl text-xs space-y-1">
                <p className="text-white/40">ملخص الرصد الأسبوعي:</p>
                <p className="text-white">{weeklyStudents.length} طلاب محددين</p>
                <p className="text-white">{selectedWeeklyBehaviors.length} معايير سلوكية محددة</p>
                {deductions > 0 && <p className="text-red-400">سيتم خصم {deductions} نقاط من كل طالب</p>}
              </div>
            )}

            <button
              onClick={() => weeklyMutation.mutate()}
              disabled={weeklyMutation.isPending || weeklyStudents.length === 0 || selectedWeeklyBehaviors.length === 0}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 font-bold text-sm hover:shadow-lg hover:shadow-gold-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {weeklyMutation.isPending ? 'جاري الحفظ...' : (
                <>
                  <Check className="w-4 h-4" />
                  {adminMode ? 'رصد واعتماد أسبوعي فوري' : 'إرسال السلوك للمراجعة'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
