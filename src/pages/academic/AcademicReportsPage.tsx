import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Eye, FileText, Inbox, Send } from 'lucide-react';
import { academicObservationService } from '../../lib/academic/adminService';
import { formatGradeLabel, formatGradeSection } from '../../lib/academic/constants';
import {
  AcademicLayout, AcademicPageHeader, AcademicEmpty, AcademicItemCard,
  AcademicSectionTitle, AcademicBadge,
  academicBtnPrimary, academicBtnSecondary,
} from '../../components/academic/AcademicUi';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { useAuthStore } from '../../stores/authStore';

const TEACHER_TASKS_PATH = '/academic/observation-tasks';

function requestStatusVariant(status: string): 'warning' | 'success' | 'danger' | 'info' | 'default' {
  if (status === 'pending') return 'warning';
  if (status === 'assigned') return 'info';
  if (status === 'processed') return 'success';
  if (status === 'rejected') return 'danger';
  return 'default';
}

const STATUS_AR: Record<string, string> = {
  pending: 'جديد',
  assigned: 'قيد الإفادة',
  processed: 'مكتمل',
  rejected: 'مرفوض',
};

const REPORT_STATUS_AR: Record<string, string> = {
  pending: 'قيد الانتظار',
  inProgress: 'قيد الإفادة',
  completed: 'مكتمل',
  cancelled: 'ملغى',
};

export function AcademicReportsPage() {
  const { role, user } = useAuthStore();
  const isTeacher = role === 'teacher';
  const [q, setQ] = useState('');
  const qc = useQueryClient();

  const { data: reports = [], isLoading: rLoad } = useQuery({
    queryKey: ['academic-obs-reports'],
    queryFn: academicObservationService.listReports,
  });

  const { data: requests = [], isLoading: qLoad, refetch } = useQuery({
    queryKey: ['academic-parent-requests'],
    queryFn: academicObservationService.listParentRequests,
    enabled: !isTeacher,
  });

  const { data: myAssignments = [], isLoading: aLoad } = useQuery({
    queryKey: ['teacher-obs-assignments', user?.id],
    queryFn: () => academicObservationService.listMyTeacherAssignments(user!.id),
    enabled: isTeacher && !!user?.id,
  });

  useEffect(() => {
    if (isTeacher || !requests.length) return;
    let cancelled = false;
    (async () => {
      const n = await academicObservationService.repairStuckAssignedRequests(requests);
      if (!cancelled && n > 0) {
        await refetch();
        qc.invalidateQueries({ queryKey: ['academic-obs-reports'] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isTeacher, requests, refetch, qc]);

  const active = useMemo(
    () => requests.filter((r) => r.status === 'pending' || r.status === 'assigned'),
    [requests],
  );

  const myPending = useMemo(() => myAssignments.filter((a) => a.status === 'pending'), [myAssignments]);

  const reportById = useMemo(() => new Map(reports.map((r) => [r.id, r])), [reports]);

  /** المعلم يرى فقط تقارير الطلاب المرسلة إليه */
  const visibleReports = useMemo(() => {
    if (!isTeacher) return reports;
    const mine = new Set(myAssignments.map((a) => a.report_id));
    return reports.filter((r) => mine.has(r.id));
  }, [isTeacher, reports, myAssignments]);

  const filteredReports = useMemo(() => {
    const term = q.trim();
    if (!term) return visibleReports;
    return visibleReports.filter((r) => r.student_name.includes(term) || (r.parent_name ?? '').includes(term));
  }, [visibleReports, q]);

  return (
    <AcademicLayout>
      <AcademicPageHeader
        title="التقارير المحفوظة"
        subtitle={
          isTeacher
            ? 'تقارير الطلاب المرسلة إليك وطلبات الإفادة المتبقية'
            : 'عرض تقارير الملاحظات المكتملة ومتابعة الطلبات قيد المعالجة'
        }
        backTo="/academic"
        action={
          isTeacher ? (
            <Link to={TEACHER_TASKS_PATH} className={academicBtnPrimary}>
              <Send className="w-4 h-4" />
              طلبات الإفادة
            </Link>
          ) : (
            <Link to="/academic/observation-inbox" className={academicBtnPrimary}>
              <Inbox className="w-4 h-4" />
              إدارة الطلبات
            </Link>
          )
        }
      />

      {isTeacher ? (
        <>
          <AcademicSectionTitle count={myPending.length}>طلبات بانتظار إفادتك</AcademicSectionTitle>
          {aLoad ? (
            <TapHandLoader />
          ) : myPending.length === 0 ? (
            <AcademicEmpty message="لا توجد طلبات بانتظار إفادتك" icon={ClipboardList} />
          ) : (
            <div className="space-y-3 mb-8">
              {myPending.slice(0, 8).map((a) => {
                const report = reportById.get(a.report_id);
                return (
                  <AcademicItemCard key={a.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-white font-bold">{report?.student_name ?? 'طالب'}</h3>
                        {a.subject && <p className="text-[#A3AED0] text-sm mt-0.5">المادة: {a.subject}</p>}
                      </div>
                      <AcademicBadge variant="warning">بانتظار إفادتك</AcademicBadge>
                    </div>
                    <Link to={TEACHER_TASKS_PATH} className={`${academicBtnSecondary} mt-3 inline-flex`}>
                      <Eye className="w-4 h-4" />
                      إضافة الإفادة
                    </Link>
                  </AcademicItemCard>
                );
              })}
              {myPending.length > 8 && (
                <Link to={TEACHER_TASKS_PATH} className="text-gold-400 text-sm hover:underline">
                  عرض كل الطلبات ({myPending.length}) ←
                </Link>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <AcademicSectionTitle count={active.length}>طلبات قيد المعالجة</AcademicSectionTitle>
          {qLoad ? (
            <TapHandLoader />
          ) : active.length === 0 ? (
            <AcademicEmpty message="لا توجد طلبات قيد المعالجة" icon={ClipboardList} />
          ) : (
            <div className="space-y-3 mb-8">
              {active.slice(0, 8).map((req) => (
                <AcademicItemCard key={req.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-white font-bold">{req.students[0]?.name ?? req.parent_name}</h3>
                      <p className="text-[#A3AED0] text-sm mt-0.5">ولي الأمر: {req.parent_name}</p>
                    </div>
                    <AcademicBadge variant={requestStatusVariant(req.status)}>
                      {STATUS_AR[req.status] ?? req.status}
                    </AcademicBadge>
                  </div>
                  <Link
                    to={`/academic/observation-inbox?request=${req.id}`}
                    className={`${academicBtnSecondary} mt-3 inline-flex`}
                  >
                    <Eye className="w-4 h-4" />
                    عرض تفاصيل الطلب
                  </Link>
                </AcademicItemCard>
              ))}
              {active.length > 8 && (
                <Link to="/academic/observation-inbox" className="text-gold-400 text-sm hover:underline">
                  عرض كل الطلبات ({active.length}) ←
                </Link>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <AcademicSectionTitle count={filteredReports.length}>التقارير</AcademicSectionTitle>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="بحث باسم الطالب أو ولي الأمر"
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 w-full sm:w-64"
        />
      </div>

      {rLoad || (isTeacher && aLoad) ? (
        <TapHandLoader />
      ) : filteredReports.length === 0 ? (
        <AcademicEmpty message="لا توجد تقارير" icon={FileText} />
      ) : (
        <div className="space-y-3">
          {filteredReports.map((r) => (
            <AcademicItemCard key={r.id} to={`/academic/reports/${r.id}`}>
              <h3 className="text-white font-bold">{r.student_name}</h3>
              <p className="text-[#A3AED0] text-sm mt-1">
                {r.section
                  ? formatGradeSection(r.education_level, r.grade, r.section)
                  : formatGradeLabel(r.education_level, r.grade)}
              </p>
              <AcademicBadge variant={r.status === 'completed' ? 'success' : 'info'}>
                {REPORT_STATUS_AR[r.status] ?? r.status}
              </AcademicBadge>
            </AcademicItemCard>
          ))}
        </div>
      )}
    </AcademicLayout>
  );
}
