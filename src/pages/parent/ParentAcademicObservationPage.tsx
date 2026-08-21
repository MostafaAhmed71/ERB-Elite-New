import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useParentChildren } from '../../hooks/useParentChildren';
import { academicObservationService } from '../../lib/academic/adminService';
import {
  AcademicLayout, AcademicPageHeader, AcademicFormPanel, AcademicField, AcademicSuccessPanel,
  academicInputClass, academicBtnPrimary, academicBtnSecondary,
} from '../../components/academic/AcademicUi';
import type { AcademicEducationLevel } from '../../lib/academic/types';
import type { DbStudent } from '../../types';

function mapChildToRequestStudent(child: DbStudent) {
  const gradeText = child.grade ?? '';
  const education_level: AcademicEducationLevel = /ثان/i.test(gradeText) ? 'high' : 'middle';
  let gradeNum = 1;
  if (gradeText.includes('ثالث')) gradeNum = 3;
  else if (gradeText.includes('ثاني')) gradeNum = 2;

  return {
    student_id: child.id,
    name: child.full_name,
    grade: gradeNum,
    section: child.class_name || 'أ',
    education_level,
    grade_label: `${child.grade} — فصل ${child.class_name}`,
  };
}

export function ParentAcademicObservationPage() {
  const { user } = useAuthStore();
  const { children, selectedChildId, setSelectedChildId, isLoading, selectedChild } = useParentChildren();
  const [parentName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (user?.phone) setPhone(user.phone);
  }, [user?.phone]);

  const childOptions = useMemo(
    () =>
      children.map((c) => ({
        id: c.id,
        label: `${c.full_name} — ${c.grade} / فصل ${c.class_name}`,
      })),
    [children]
  );

  const hasPhoneOnProfile = Boolean(user?.phone?.trim());

  const submit = useMutation({
    mutationFn: async () => {
      if (!selectedChild) throw new Error('اختر الطالب من القائمة');
      const phoneValue = phone.trim() || user?.phone?.trim() || '';
      if (!phoneValue) throw new Error('أضف رقم الجوال لإكمال الطلب');

      return academicObservationService.createParentRequest({
        parent_user_id: user?.id ?? null,
        parent_name: parentName || user?.full_name || 'ولي أمر',
        parent_phone: phoneValue,
        students: [mapChildToRequestStudent(selectedChild)],
      });
    },
    onSuccess: () => setDone(true),
  });

  if (done) {
    return (
      <AcademicLayout size="lg">
        <AcademicSuccessPanel
          title="تم إرسال الطلب بنجاح"
          message="يمكنك متابعة حالة الطلب ومعرفة ما يتم عليه من شاشة طلباتي."
          action={
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Link to="/parent/academic/requests" className={`${academicBtnPrimary} flex-1 text-center`}>
                متابعة طلبي
              </Link>
              <Link to="/dashboard" className={`${academicBtnSecondary} flex-1 text-center`}>
                الرئيسية
              </Link>
            </div>
          }
        />
      </AcademicLayout>
    );
  }

  return (
    <AcademicLayout size="lg">
      <AcademicPageHeader
        title="طلب ملاحظة طالب"
        subtitle="اختر ابنك المرتبط بحسابك لإرسال طلب ملاحظة لإدارة المدرسة"
        backTo="/dashboard"
        action={
          <Link to="/parent/academic/requests" className={academicBtnSecondary}>
            طلباتي
          </Link>
        }
      />

      {isLoading ? (
        <p className="text-white/40 text-sm">جاري تحميل الأبناء...</p>
      ) : children.length === 0 ? (
        <AcademicFormPanel title="لا يوجد أبناء مرتبطون">
          <p className="text-white/55 text-sm leading-relaxed">
            يجب ربط طالب واحد على الأقل بحسابك عبر كود الطالب قبل طلب ملاحظة.
          </p>
          <Link to="/parent/link-child" className={`${academicBtnPrimary} inline-flex mt-2`}>
            ربط طالب بكود
          </Link>
        </AcademicFormPanel>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
        >
          <AcademicFormPanel title="بيانات الطلب">
            <AcademicField label="اسم ولي الأمر">
              <input className={academicInputClass} value={parentName} readOnly />
            </AcademicField>

            {hasPhoneOnProfile ? (
              <AcademicField label="رقم الجوال">
                <input className={academicInputClass} dir="ltr" value={phone} readOnly />
              </AcademicField>
            ) : (
              <AcademicField label="رقم الجوال">
                <input
                  className={academicInputClass}
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  required
                />
                <p className="text-white/35 text-xs mt-1">لم يُحفظ جوال في ملفك — أدخله لإتمام الطلب</p>
              </AcademicField>
            )}

            <AcademicField label="الطالب">
              <select
                className={academicInputClass}
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                required
              >
                {childOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </AcademicField>

            {selectedChild && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70 space-y-1">
                <p>
                  <span className="text-white/40">الاسم: </span>
                  {selectedChild.full_name}
                </p>
                <p>
                  <span className="text-white/40">الصف: </span>
                  {selectedChild.grade}
                </p>
                <p>
                  <span className="text-white/40">الفصل: </span>
                  {selectedChild.class_name}
                </p>
              </div>
            )}

            {submit.isError && (
              <p className="text-red-300 text-sm">
                {submit.error instanceof Error ? submit.error.message : 'تعذّر إرسال الطلب'}
              </p>
            )}

            <button type="submit" className={`${academicBtnPrimary} w-full`} disabled={submit.isPending || !selectedChild}>
              {submit.isPending ? 'جاري الإرسال...' : 'إرسال الطلب'}
            </button>
          </AcademicFormPanel>
        </form>
      )}
    </AcademicLayout>
  );
}
