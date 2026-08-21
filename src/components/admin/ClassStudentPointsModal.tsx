import { Fragment } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { X, Award, Sparkles, Heart, Trophy, Zap, UserCheck, UserX } from 'lucide-react';
import type { ClassStudentPointsRow } from '../../lib/classReport';
import clsx from 'clsx';

const AXIS_META = [
  { key: 'activity' as const, label: 'النشاط', icon: Sparkles, color: 'text-blue-400' },
  { key: 'behavior' as const, label: 'السلوك', icon: Heart, color: 'text-emerald-400' },
  { key: 'achievement' as const, label: 'الإنجاز', icon: Trophy, color: 'text-purple-400' },
  { key: 'initiative' as const, label: 'المبادرة', icon: Zap, color: 'text-amber-400' },
];

const CATEGORY_LABELS: Record<string, string> = {
  activity: 'نشاط',
  behavior: 'سلوك',
  achievement: 'إنجاز',
  initiative: 'مبادرة',
};

type Props = {
  student: ClassStudentPointsRow;
  onClose: () => void;
};

export function ClassStudentPointsModal({ student, onClose }: Props) {
  return (
    <Transition show as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel
              className="w-full sm:max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-navy-950 border border-white/10 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden"
              dir="rtl"
            >
              <div className="relative flex-shrink-0 overflow-hidden border-b border-white/10">
                <div className="absolute inset-0 bg-gradient-to-l from-gold-950/40 via-navy-900 to-navy-950" />
                <div className="relative px-5 pt-5 pb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-navy-950 text-xl font-bold shadow-lg shadow-gold-500/20 flex-shrink-0">
                      {student.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h2 className="text-white font-bold text-lg leading-tight truncate">
                        {student.full_name}
                      </h2>
                      <p className="text-white/45 text-sm mt-1">
                        {student.grade} — فصل {student.class_name}
                      </p>
                      <p className="text-white/30 text-xs mt-1">
                        رقم القيد: {student.admission_number}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
                      aria-label="إغلاق"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center gap-4 p-3 rounded-xl bg-black/20 border border-white/8">
                    <div className="w-12 h-12 rounded-xl bg-gold-500/15 border border-gold-500/25 flex items-center justify-center">
                      <Award className="w-6 h-6 text-gold-400" />
                    </div>
                    <div>
                      <p className="text-white/50 text-xs">الدرجة الموزونة</p>
                      <p className="text-gold-400 font-bold text-2xl tabular-nums">{student.weighted}</p>
                    </div>
                    <div className="mr-auto text-left">
                      <p className="text-white/40 text-xs">عمليات المنح</p>
                      <p className="text-white font-semibold tabular-nums">{student.grantCount}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5 min-h-0">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                    <UserCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-white/40 text-[10px]">أيام الحضور</p>
                      <p className="text-emerald-400 font-bold text-lg tabular-nums">{student.attendancePresent}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                    <UserX className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-white/40 text-[10px]">أيام الغياب</p>
                      <p className="text-red-400 font-bold text-lg tabular-nums">{student.attendanceAbsent}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-white/50 text-xs font-medium mb-3">توزيع المحاور</p>
                  <div className="grid grid-cols-2 gap-2">
                    {AXIS_META.map((axis) => (
                      <div
                        key={axis.key}
                        className="p-3 rounded-xl bg-navy-900/60 border border-white/8 flex items-center gap-3"
                      >
                        <axis.icon className={clsx('w-4 h-4 flex-shrink-0', axis.color)} />
                        <div className="min-w-0">
                          <p className="text-white/40 text-[10px]">{axis.label}</p>
                          <p className={clsx('font-bold text-sm tabular-nums', axis.color)}>
                            {student[axis.key]}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-white/50 text-xs font-medium mb-3">الأنشطة والنقاط</p>
                  {student.grants.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-white/30 text-sm">
                      لا توجد نقاط معتمدة لهذا الطالب
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {student.grants.map((grant) => (
                        <div
                          key={`${grant.name}-${grant.category}`}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-navy-900/50 border border-white/8"
                        >
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{grant.name}</p>
                            <p className="text-white/35 text-[10px] mt-0.5">
                              {CATEGORY_LABELS[grant.category] ?? grant.category}
                            </p>
                          </div>
                          <span className="text-gold-400 font-bold tabular-nums flex-shrink-0">
                            {grant.points} ن
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
