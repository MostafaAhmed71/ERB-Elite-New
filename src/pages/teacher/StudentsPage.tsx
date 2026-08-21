import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Award, Eye, Trophy, MessageSquare } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { DbStudent } from '../../types';
import { DataTable, SearchInput, SelectFilter } from '../../components/ui';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { StudentQuickProfile } from '../../components/teacher/StudentQuickProfile';
import { TeacherParentMessagePanel } from '../../components/teacher/TeacherParentMessagePanel';
import { ClassBoardPage } from './ClassBoardPage';
import {
  fetchTeacherClassAssignmentsByUserId,
  filterStudentsByAssignments,
  gradesFromAssignments,
  classesFromAssignments,
} from '../../lib/teacherScope';
import { syncTeacherOlympiadFromAcademic } from '../../lib/academic/olympiadSyncService';
import { showSuccess, showError } from '../../lib/toast';
import { classesMatch, gradesMatch } from '../../lib/academic/gradeBridge';
import clsx from 'clsx';

type Tab = 'list' | 'board' | 'messages';
type StudentWithPoints = DbStudent & { totalPoints: number };

export function StudentsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab: Tab = location.pathname.includes('class-board')
    ? 'board'
    : location.pathname.includes('messages')
      ? 'messages'
      : 'list';

  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [profileStudent, setProfileStudent] = useState<DbStudent | null>(null);
  const [syncingClasses, setSyncingClasses] = useState(false);

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['teacher', 'classes', user?.id],
    queryFn: () => fetchTeacherClassAssignmentsByUserId(user!.id),
    enabled: !!user,
  });

  const handleSyncClasses = async () => {
    if (!user) return;
    setSyncingClasses(true);
    try {
      const result = await syncTeacherOlympiadFromAcademic(user.id);
      await queryClient.invalidateQueries({ queryKey: ['teacher', 'classes', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['teacher', 'students'] });
      if (result.synced && result.classes > 0) {
        showSuccess(`تمت مزامنة ${result.classes} فصل من الإعداد الأكاديمي`);
      } else if (result.reason === 'empty_payload') {
        showError(null, 'لا يوجد إعداد أكاديمي مكتمل — أكمل إعداد المعلم أو اطلب الإسناد من الإدارة');
      } else if (result.reason === 'rpc_missing') {
        showError(null, 'يلزم تطبيق ترحيل قاعدة البيانات 114 أولاً');
      } else {
        showError(null, 'لم تُضف فصول بعد المزامنة');
      }
    } catch (e) {
      showError(e instanceof Error ? e : new Error('تعذرت المزامنة'));
    } finally {
      setSyncingClasses(false);
    }
  };

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['teacher', 'students', user?.id, assignments],
    queryFn: async () => {
      const { data: studentsData, error: studentErr } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (studentErr) throw studentErr;

      const scoped = filterStudentsByAssignments(studentsData as DbStudent[], assignments);
      if (scoped.length === 0) return [] as StudentWithPoints[];

      const ids = scoped.map((s) => s.id);
      const { data: ledgerData, error: ledgerErr } = await supabase
        .from('points_ledger')
        .select('student_id, points')
        .eq('status', 'approved')
        .in('student_id', ids);

      if (ledgerErr) throw ledgerErr;

      const pointsMap: Record<string, number> = {};
      (ledgerData ?? []).forEach((item) => {
        pointsMap[item.student_id] = (pointsMap[item.student_id] || 0) + item.points;
      });

      return scoped.map((s) => ({
        ...s,
        totalPoints: pointsMap[s.id] || 0,
      }));
    },
    enabled: !!user && !assignmentsLoading,
  });

  const grades = gradesFromAssignments(assignments).length
    ? gradesFromAssignments(assignments)
    : [...new Set(students.map((s) => s.grade))].sort();

  const classOptions = gradeFilter
    ? classesFromAssignments(assignments, gradeFilter)
    : [...new Set(assignments.map((a) => a.class_name))];

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.admission_number.includes(search);
    const matchesGrade = gradeFilter === '' || gradesMatch(s.grade, gradeFilter);
    const matchesClass = classFilter === '' || classesMatch(s.class_name, classFilter);
    return matchesSearch && matchesGrade && matchesClass;
  });

  const isFiltered = search !== '' || gradeFilter !== '' || classFilter !== '';
  const loading = isLoading || assignmentsLoading;

  const setTab = (tab: Tab) => {
    if (tab === 'board') navigate('/students/class-board');
    else if (tab === 'messages') navigate('/students/messages');
    else navigate('/students');
  };

  if (activeTab === 'board') {
    return (
      <div className="space-y-6" dir="rtl">
        <TabBar activeTab={activeTab} onTabChange={setTab} />
        <ClassBoardPage />
      </div>
    );
  }

  if (activeTab === 'messages') {
    return (
      <div className="space-y-6" dir="rtl">
        <PageHeader
          title="تواصل أولياء الأمور"
          subtitle="T6 — رسائل جماعية رسمية لفصلك"
          icon={MessageSquare}
        />
        <TabBar activeTab={activeTab} onTabChange={setTab} />
        <TeacherParentMessagePanel />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-4" dir="rtl">
      <div className="sm:hidden">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h1 className="text-lg font-bold text-white">طلابي</h1>
          {students.length > 0 && (
            <span className="text-[11px] px-2 py-1 rounded-full bg-gold-500/15 text-gold-300 border border-gold-500/25">
              {students.length} طالب
            </span>
          )}
        </div>
        <p className="text-xs text-white/45 line-clamp-2 mb-1">
          قائمة الطلاب في فصولك المسندة
        </p>
      </div>

      <div className="hidden sm:block">
        <PageHeader
          title="إدارة طلابي"
          subtitle="قائمة الطلاب في فصولك المسندة"
          icon={Users}
          badge={students.length > 0 ? `${students.length} طالب` : undefined}
          actions={
            <Link to="/students/class-board">
              <Button variant="secondary" size="sm" icon={<Trophy className="w-4 h-4" />}>
                لوحة الفصل
              </Button>
            </Link>
          }
        />
      </div>

      <TabBar activeTab={activeTab} onTabChange={setTab} />

      {assignments.length === 0 && !assignmentsLoading && (
        <div className="glass-card p-4 border border-amber-500/25 bg-amber-500/5 text-sm text-amber-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold">لم تُسند فصول لحسابك بعد</p>
            <p className="text-amber-100/75 text-xs mt-1 leading-relaxed">
              إن أكملت الإعداد الأكاديمي اضغط «مزامنة فصولي». وإلا اطلب من الإدارة ربط الصفوف من إدارة المستخدمين أو الإسناد الأكاديمي.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            loading={syncingClasses}
            onClick={() => void handleSyncClasses()}
          >
            مزامنة فصولي
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="بحث بالاسم أو الرقم…"
        />
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:hidden">
          <button
            type="button"
            onClick={() => {
              setGradeFilter('');
              setClassFilter('');
            }}
            className={clsx(
              'shrink-0 min-h-[40px] px-3 rounded-full text-xs font-semibold border',
              !gradeFilter
                ? 'bg-gold-500/20 border-gold-500/40 text-gold-200'
                : 'border-white/10 text-white/50',
            )}
          >
            الكل
          </button>
          {grades.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                setGradeFilter(g);
                setClassFilter('');
              }}
              className={clsx(
                'shrink-0 min-h-[40px] px-3 rounded-full text-xs font-semibold border',
                gradeFilter && gradesMatch(gradeFilter, g)
                  ? 'bg-gold-500/20 border-gold-500/40 text-gold-200'
                  : 'border-white/10 text-white/50',
              )}
            >
              {g}
            </button>
          ))}
        </div>
        {gradeFilter && classOptions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:hidden">
            <button
              type="button"
              onClick={() => setClassFilter('')}
              className={clsx(
                'shrink-0 min-h-[40px] px-3 rounded-full text-xs border',
                !classFilter
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'border-white/10 text-white/45',
              )}
            >
              كل الفصول
            </button>
            {classOptions.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setClassFilter(c)}
                className={clsx(
                  'shrink-0 min-h-[40px] px-3 rounded-full text-xs border',
                  classFilter && classesMatch(classFilter, c)
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'border-white/10 text-white/45',
                )}
              >
                فصل {c}
              </button>
            ))}
          </div>
        )}
        <div className="hidden sm:flex gap-3 flex-wrap">
          <SelectFilter
            value={gradeFilter}
            onChange={(v) => {
              setGradeFilter(v);
              setClassFilter('');
            }}
            placeholder="كل صفوفي"
            options={grades.map((g) => ({ value: g, label: g }))}
          />
          {gradeFilter && (
            <SelectFilter
              value={classFilter}
              onChange={setClassFilter}
              placeholder="كل الفصول"
              options={classOptions.map((c) => ({ value: c, label: `فصل ${c}` }))}
            />
          )}
        </div>
      </div>

      <div className="sm:hidden space-y-2">
        {loading ? (
          <p className="text-center text-white/40 text-sm py-8">جاري التحميل…</p>
        ) : filteredStudents.length === 0 ? (
          <p className="text-center text-white/40 text-sm py-8">
            {isFiltered ? 'لا نتائج مطابقة' : 'لا طلاب في فصولك المسندة'}
          </p>
        ) : (
          filteredStudents.map((student) => (
            <div
              key={student.id}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 space-y-3"
            >
              <button
                type="button"
                onClick={() => setProfileStudent(student)}
                className="flex items-center gap-3 w-full text-right min-h-[48px]"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {student.full_name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold text-sm truncate">{student.full_name}</p>
                  <p className="text-white/40 text-[11px] mt-0.5">
                    {student.grade} — {student.class_name}
                  </p>
                  <p className="text-gold-400 text-xs font-bold mt-1">{student.totalPoints} نقطة</p>
                </div>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setProfileStudent(student)}
                  className="min-h-[44px] rounded-xl border border-white/10 text-white/80 text-xs font-semibold hover:bg-white/5"
                >
                  الملف
                </button>
                <Link
                  to={`/points/grant?studentId=${student.id}`}
                  className="min-h-[44px] rounded-xl bg-gold-500/20 border border-gold-500/30 text-gold-200 text-xs font-semibold inline-flex items-center justify-center gap-1"
                >
                  <Award className="w-3.5 h-3.5" />
                  منح نقاط
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* جدول لسطح المكتب */}
      <div className="hidden sm:block">
        <DataTable
          loading={loading}
          empty={!loading && filteredStudents.length === 0}
          emptyTitle={isFiltered ? 'لا توجد نتائج مطابقة' : 'لا يوجد طلاب في فصولك'}
          emptyDescription={
            isFiltered
              ? 'جرّب تغيير معايير البحث أو الفلترة'
              : assignments.length === 0
                ? 'اربط فصولك من الإدارة أولاً'
                : 'سيظهر طلاب فصولك المسندة هنا'
          }
          emptyIcon={Users}
          skeletonRows={5}
          skeletonColumns={4}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-white/5 text-white/40 font-medium">
                <tr>
                  <th className="px-5 py-3 text-right">الاسم والرقم الأكاديمي</th>
                  <th className="px-5 py-3 text-right">الصف والفصل</th>
                  <th className="px-5 py-3 text-right">النقاط الحالية</th>
                  <th className="px-5 py-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/70">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setProfileStudent(student)}
                        className="flex items-center gap-3 text-right hover:opacity-80 transition-opacity"
                      >
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                          {student.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{student.full_name}</p>
                          <p className="text-white/30 text-xs font-mono">{student.admission_number}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-white/70 font-medium">{student.grade}</p>
                      <p className="text-white/30 text-xs">{student.class_name}</p>
                    </td>
                    <td className="px-5 py-4 font-bold text-gold-400">
                      {student.totalPoints} ن
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setProfileStudent(student)}
                          icon={<Eye className="w-3.5 h-3.5" />}
                        >
                          الملف
                        </Button>
                        <Link to={`/points/grant?studentId=${student.id}`}>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Award className="w-3.5 h-3.5" />}
                            className="!text-gold-400 !border-gold-500/20 !bg-gold-500/10"
                          >
                            منح
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataTable>
      </div>

      <StudentQuickProfile
        student={profileStudent}
        open={!!profileStudent}
        onClose={() => setProfileStudent(null)}
      />
    </div>
  );
}

function TabBar({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'list', label: 'قائمة الطلاب', icon: Users },
    { key: 'board', label: 'لوحة الفصل', icon: Trophy },
    { key: 'messages', label: 'أولياء الأمور', icon: MessageSquare },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onTabChange(key)}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border text-sm font-medium transition-all shrink-0',
            activeTab === key
              ? 'text-gold-400 border-gold-500/25 bg-gold-500/10'
              : 'border-white/10 text-white/40 hover:text-white/70 bg-transparent'
          )}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
