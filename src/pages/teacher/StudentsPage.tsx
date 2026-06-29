import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Award, Eye, Trophy, MessageSquare } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { DbStudent } from '../../types';
import { DataTable, SearchInput, SelectFilter } from '../../components/ui';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { StudentQuickProfile } from '../../components/teacher/StudentQuickProfile';
import { TeacherParentMessagePanel } from '../../components/teacher/TeacherParentMessagePanel';
import { ClassBoardPage } from './ClassBoardPage';
import clsx from 'clsx';

type Tab = 'list' | 'board' | 'messages';

export function StudentsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab: Tab = location.pathname.includes('class-board')
    ? 'board'
    : location.pathname.includes('messages')
      ? 'messages'
      : 'list';

  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [profileStudent, setProfileStudent] = useState<DbStudent | null>(null);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['teacher', 'students'],
    queryFn: async () => {
      const { data: studentsData, error: studentErr } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (studentErr) throw studentErr;

      const { data: ledgerData, error: ledgerErr } = await supabase
        .from('points_ledger')
        .select('student_id, points')
        .eq('status', 'approved');

      if (ledgerErr) throw ledgerErr;

      const pointsMap: Record<string, number> = {};
      ledgerData.forEach(item => {
        pointsMap[item.student_id] = (pointsMap[item.student_id] || 0) + item.points;
      });

      return (studentsData as DbStudent[]).map(s => ({
        ...s,
        totalPoints: pointsMap[s.id] || 0,
      }));
    },
  });

  const grades = [...new Set(students.map(s => s.grade))].sort();

  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.admission_number.includes(search);
    const matchesGrade = gradeFilter === '' || s.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  const isFiltered = search !== '' || gradeFilter !== '';

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
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <PageHeader
        title="إدارة طلابي"
        subtitle="قائمة الطلاب وتفاصيل نقاط التميز الخاصة بهم"
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

      <TabBar activeTab={activeTab} onTabChange={setTab} />

      <div className="flex gap-3 flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="بحث بالاسم أو الرقم الأكاديمي..."
        />
        <SelectFilter
          value={gradeFilter}
          onChange={setGradeFilter}
          placeholder="كل الصفوف"
          options={grades.map(g => ({ value: g, label: g }))}
        />
      </div>

      <DataTable
        loading={isLoading}
        empty={!isLoading && filteredStudents.length === 0}
        emptyTitle={isFiltered ? 'لا توجد نتائج مطابقة' : 'لا يوجد طلاب مسجلون'}
        emptyDescription={
          isFiltered
            ? 'جرّب تغيير معايير البحث أو الفلترة'
            : 'سيظهر طلاب فصولك هنا بعد ربطهم بحسابك'
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
                <th className="px-5 py-3 text-right">الصف والدفعة</th>
                <th className="px-5 py-3 text-right">النقاط الحالية</th>
                <th className="px-5 py-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/70">
              {filteredStudents.map(student => (
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
                    {(student as DbStudent & { totalPoints: number }).totalPoints} ن
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
    <div className="flex gap-2">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onTabChange(key)}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all',
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
