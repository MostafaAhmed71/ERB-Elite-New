import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Check, Clock, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { academicObservationService } from '../../lib/academic/adminService';
import { formatGradeWithLevel } from '../../lib/academic/constants';
import type { AcademicParentRequest, AcademicParentRequestStatus } from '../../lib/academic/types';
import {
  AcademicLayout, AcademicPageHeader, AcademicEmpty, AcademicItemCard, AcademicBadge,
  academicBtnPrimary, academicBtnSecondary,
} from '../../components/academic/AcademicUi';
import { ObservationEntriesList } from '../../components/academic/ObservationEntriesList';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import clsx from 'clsx';

const STATUS_LABEL: Record<AcademicParentRequestStatus, string> = {
  pending: 'قيد المراجعة',
  assigned: 'بانتظار إفادة المعلمين',
  processed: 'تمت المعالجة',
  rejected: 'مرفوض',
};

function statusVariant(status: AcademicParentRequestStatus): 'warning' | 'success' | 'danger' | 'info' {
  if (status === 'pending') return 'warning';
  if (status === 'assigned') return 'info';
  if (status === 'processed') return 'success';
  return 'danger';
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      timeZone: 'Asia/Riyadh',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function RequestStatusTracker({ status }: { status: AcademicParentRequestStatus }) {
  const steps = [
    { id: 'sent', label: 'تم الإرسال', done: true },
    {
      id: 'review',
      label: 'مراجعة الإدارة',
      done: status !== 'pending',
      active: status === 'pending',
    },
    {
      id: 'teachers',
      label: 'إفادة المعلمين',
      done: status === 'processed' || status === 'rejected',
      active: status === 'assigned',
    },
    {
      id: 'result',
      label: status === 'rejected' ? 'مرفوض' : 'مكتمل',
      done: status === 'processed' || status === 'rejected',
      active: false,
      rejected: status === 'rejected',
    },
  ];

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.06]">
      <p className="text-white/40 text-xs mb-3">تتبع حالة الطلب</p>
      <div className="flex items-start gap-0">
        {steps.map((step, i) => (
          <div key={step.id} className="flex-1 flex flex-col items-center relative">
            {i > 0 && (
              <div
                className={clsx(
                  'absolute top-4 end-1/2 h-0.5 w-full -translate-y-1/2',
                  steps[i - 1].done ? (step.rejected ? 'bg-red-400/50' : 'bg-emerald-400/50') : 'bg-white/10'
                )}
                aria-hidden
              />
            )}
            <div
              className={clsx(
                'relative z-[1] w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs',
                step.done && !step.rejected && 'bg-emerald-500/20 border-emerald-400 text-emerald-300',
                step.done && step.rejected && 'bg-red-500/20 border-red-400 text-red-300',
                step.active && 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse',
                !step.done && !step.active && 'bg-white/5 border-white/15 text-white/30'
              )}
            >
              {step.rejected ? (
                <X className="w-3.5 h-3.5" />
              ) : step.done ? (
                <Check className="w-3.5 h-3.5" />
              ) : step.active ? (
                <Clock className="w-3.5 h-3.5" />
              ) : (
                <span>{i + 1}</span>
              )}
            </div>
            <p
              className={clsx(
                'text-[10px] sm:text-xs mt-2 text-center leading-tight px-0.5',
                step.done && !step.rejected && 'text-emerald-300/90',
                step.rejected && 'text-red-300/90',
                step.active && 'text-amber-300',
                !step.done && !step.active && 'text-white/35'
              )}
            >
              {step.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinkedReportPanel({ reportId }: { reportId: string }) {
  const [open, setOpen] = useState(false);
  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['academic-obs-report', reportId],
    queryFn: () => academicObservationService.getReport(reportId),
    enabled: open,
  });

  const observations = Array.isArray(report?.teacher_observations) ? report!.teacher_observations : [];

  return (
    <div className="mt-3">
      <button type="button" className={academicBtnSecondary} onClick={() => setOpen((v) => !v)}>
        {open ? 'إخفاء التقرير' : 'عرض تقرير الملاحظة'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm space-y-2">
          {isLoading && <p className="text-white/40">جاري التحميل...</p>}
          {isError && <p className="text-red-300">تعذّر تحميل التقرير</p>}
          {report && (
            <>
              <p>
                <span className="text-white/40">الطالب: </span>
                {report.student_name}
              </p>
              <p>
                <span className="text-white/40">الحالة: </span>
                {report.status === 'completed' ? 'مكتمل' : report.status}
              </p>
              {observations.length > 0 ? (
                <div>
                  <p className="text-white/40 mb-2">تقييمات المعلمين:</p>
                  <ObservationEntriesList raw={observations} />
                </div>
              ) : (
                <p className="text-white/45">لا توجد تقييمات في التقرير.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RequestCard({ req }: { req: AcademicParentRequest }) {
  return (
    <AcademicItemCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-white/40 text-xs">{formatDate(req.created_at)}</p>
          <h3 className="text-white font-bold mt-1">طلب ملاحظة</h3>
        </div>
        <AcademicBadge variant={statusVariant(req.status)}>{STATUS_LABEL[req.status]}</AcademicBadge>
      </div>

      <ul className="mt-3 space-y-2">
        {req.students.map((s, i) => (
          <li
            key={s.student_id ?? `${s.name}-${i}`}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm"
          >
            <p className="text-white font-semibold">{s.name}</p>
            <p className="text-white/55 mt-0.5">
              {s.grade_label
                ?? `${formatGradeWithLevel(s.education_level, s.grade)}${s.section ? ` — فصل ${s.section}` : ''}`}
            </p>
          </li>
        ))}
      </ul>

      <RequestStatusTracker status={req.status} />

      {req.status === 'assigned' && (
        <p className="text-sky-300/80 text-sm mt-3">الطلب لدى معلمي الفصل لإضافة ملاحظاتهم.</p>
      )}

      {req.status === 'rejected' && (
        <p className="text-red-300/90 text-sm mt-3">تم رفض الطلب من إدارة المدرسة. يمكنك تقديم طلب جديد إن لزم.</p>
      )}

      {req.status === 'processed' && req.linked_report_id && (
        <LinkedReportPanel reportId={req.linked_report_id} />
      )}

      {req.status === 'processed' && !req.linked_report_id && (
        <p className="text-emerald-300/80 text-sm mt-3">تمت معالجة الطلب من قبل الإدارة.</p>
      )}
    </AcademicItemCard>
  );
}

export function ParentAcademicRequestsPage() {
  const { user } = useAuthStore();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['parent-academic-requests', user?.id],
    queryFn: () => academicObservationService.listMyParentRequests(user!.id),
    enabled: !!user?.id,
  });

  return (
    <AcademicLayout size="2xl">
      <AcademicPageHeader
        title="طلباتي"
        subtitle="عرض طلبات الملاحظة المقدمة وتتبع حالتها"
        backTo="/dashboard"
        action={
          <Link to="/parent/academic/request" className={academicBtnPrimary}>
            طلب جديد
          </Link>
        }
      />

      {isLoading ? (
        <TapHandLoader />
      ) : requests.length === 0 ? (
        <AcademicEmpty message="لم تقدّم أي طلب ملاحظة بعد" icon={ClipboardList} />
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <RequestCard key={req.id} req={req} />
          ))}
        </div>
      )}
    </AcademicLayout>
  );
}
