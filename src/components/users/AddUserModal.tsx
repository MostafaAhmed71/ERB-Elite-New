import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, User, Mail, Lock, Shield, AlertCircle, BookOpen, Coins, Phone, School } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAction, createUser, toArabicErrorMessage } from '../../lib/auth';
import { upsertStudentRosterRecord } from '../../lib/studentRoster';
import { StudentClassFields } from './StudentClassFields';
import { TeacherClassFields } from './TeacherClassFields';
import {
  fetchTeacherClassAssignments,
  saveTeacherClassAssignments,
  type TeacherClassAssignment,
} from '../../lib/teacherScope';
import { fetchTeacherPointsLimits } from '../../lib/teacherPointsLimits';
import { academicAdminService } from '../../lib/academic/adminService';
import { ACADEMIC_LEVEL_LABELS } from '../../lib/academic/constants';
import type { AcademicEducationLevel } from '../../lib/academic/types';
import type { DbUser, UserRole } from '../../types';
import { ROLE_LABELS, SELECTABLE_USER_ROLES } from '../../types';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';
import { motion } from 'framer-motion';

interface AddUserModalProps {
  editUser: DbUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

const LEGACY_ROLE: UserRole = 'activity_leader';

export function AddUserModal({ editUser, onClose, onSuccess }: AddUserModalProps) {
  const isEdit = !!editUser;

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'student' as UserRole,
    phone: '',
  });
  const [staffEducationLevel, setStaffEducationLevel] = useState<AcademicEducationLevel | ''>('');
  
  // Teacher specific states
  const [subject, setSubject] = useState('');
  const [pointsBudget, setPointsBudget] = useState<number>(100);
  const [teacherWeeklyLimit, setTeacherWeeklyLimit] = useState<number>(100);
  const [teacherClasses, setTeacherClasses] = useState<Pick<TeacherClassAssignment, 'grade' | 'class_name'>[]>([]);
  // Student specific states
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [grade, setGrade] = useState('');
  const [className, setClassName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: academicSubjects = [] } = useQuery({
    queryKey: ['academic-subjects'],
    queryFn: academicAdminService.listSubjects,
    enabled: form.role === 'teacher',
  });

  const uniqueSubjectNames = useMemo(() => {
    return [...new Set(academicSubjects.filter((s) => s.is_active).map((s) => s.name))]
      .sort((a, b) => a.localeCompare(b, 'ar'));
  }, [academicSubjects]);

  useEffect(() => {
    if (editUser) {
      setForm({
        full_name: editUser.full_name,
        email: editUser.email,
        password: '',
        role: editUser.role,
        phone: editUser.phone ?? '',
      });
      setStaffEducationLevel(
        editUser.staff_education_level === 'middle' || editUser.staff_education_level === 'high'
          ? editUser.staff_education_level
          : '',
      );

      // Fetch teacher details if role is teacher
      if (editUser.role === 'teacher') {
        fetchTeacherPointsLimits().then((limits) => setTeacherWeeklyLimit(limits.weekly_limit));
        supabase
          .from('teachers')
          .select('id, subject, points_budget, weekly_points_limit')
          .eq('user_id', editUser.id)
          .single()
          .then(async ({ data }) => {
            if (data) {
              setSubject(data.subject ?? '');
              setPointsBudget(data.points_budget ?? 100);
              setTeacherWeeklyLimit(data.weekly_points_limit ?? 100);
              const assignments = await fetchTeacherClassAssignments(data.id);
              setTeacherClasses(assignments.map((a) => ({ grade: a.grade, class_name: a.class_name })));
            }
          });
      }

      if (editUser.role === 'student') {
        supabase
          .from('students')
          .select('admission_number, grade, class_name')
          .eq('user_id', editUser.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setAdmissionNumber(data.admission_number ?? '');
              setGrade(data.grade ?? '');
              setClassName(data.class_name ?? '');
            }
          });
      }
    }
  }, [editUser]);

  useEffect(() => {
    if (!isEdit && form.role === 'teacher') {
      fetchTeacherPointsLimits().then((limits) => setTeacherWeeklyLimit(limits.weekly_limit));
    }
  }, [isEdit, form.role]);

  const roleOptions: UserRole[] =
    isEdit && editUser?.role === LEGACY_ROLE
      ? [...SELECTABLE_USER_ROLES, LEGACY_ROLE]
      : SELECTABLE_USER_ROLES;

  const mutation = useMutation({
    mutationFn: async () => {
      let targetUserId = editUser?.id;

      // إضافة طالب للقائمة المدرسية فقط — بدون حساب دخول
      if (!isEdit && form.role === 'student') {
        await upsertStudentRosterRecord({
          full_name: form.full_name,
          national_id: admissionNumber,
          grade,
          class_name: className,
          phone: form.phone,
        });
        return;
      }

      if (isEdit) {
        // Update existing user profile
        const { error } = await supabase
          .from('users')
          .update({
            full_name: form.full_name,
            role: form.role,
            phone: form.phone.trim() || null,
            staff_education_level:
              form.role === 'deputy' || form.role === 'supervisor'
                ? staffEducationLevel || null
                : null,
          })
          .eq('id', editUser!.id);
        if (error) throw error;
        await logAction('USER_UPDATED', 'users', editUser!.id, {
          role: form.role,
          staff_education_level: staffEducationLevel || null,
        });
      } else {
        targetUserId = await createUser({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          role: form.role,
          subject: form.role === 'teacher' ? subject : undefined,
          points_budget: form.role === 'teacher' ? pointsBudget : undefined,
          staff_education_level:
            form.role === 'deputy' || form.role === 'supervisor'
              ? staffEducationLevel || null
              : null,
        });
      }

      if (targetUserId && !isEdit) {
        const profilePatch: Record<string, unknown> = {
          is_active: true,
          role: form.role,
        };
        if (form.phone.trim()) profilePatch.phone = form.phone.trim();
        if (form.role === 'deputy' || form.role === 'supervisor') {
          profilePatch.staff_education_level = staffEducationLevel || null;
        }
        await supabase.from('users').update(profilePatch).eq('id', targetUserId);
      }

      if (form.role === 'student' && targetUserId) {
        const { error: studentErr } = await supabase
          .from('students')
          .upsert({
            user_id: targetUserId,
            admission_number: admissionNumber.trim(),
            national_id: admissionNumber.trim(),
            full_name: form.full_name.trim(),
            grade,
            class_name: className,
          }, { onConflict: 'admission_number' });
        if (studentErr) {
          console.warn('Student profile upsert failed:', studentErr);
        }
      }

      // بيانات المعلم تُنشأ ضمن createUser عند استخدام المسار البديل
      if (form.role === 'teacher' && targetUserId) {
        const { data: teacherRow, error: teacherErr } = await supabase
          .from('teachers')
          .upsert({
            user_id: targetUserId,
            subject: subject || null,
            points_budget: Number(pointsBudget) || 0,
            weekly_points_limit: teacherWeeklyLimit,
          }, { onConflict: 'user_id' })
          .select('id')
          .single();
        if (teacherErr) {
          console.warn('Teacher profile upsert failed:', teacherErr);
        } else if (teacherRow) {
          await saveTeacherClassAssignments(teacherRow.id, teacherClasses);
        }
      }
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? 'تم تحديث المستخدم بنجاح'
          : form.role === 'student'
            ? 'تمت إضافة الطالب للقائمة — سيربط حسابه لاحقاً برقم الهوية'
            : 'تم إنشاء المستخدم بنجاح'
      );
      onSuccess();
    },
    onError: (err: unknown) => {
      setError(toArabicErrorMessage(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.full_name.trim()) { setError('الاسم الكامل مطلوب'); return; }
    if (!isEdit && form.role === 'student') {
      if (!admissionNumber.trim() || !grade || !className) {
        setError('للطلاب: رقم الهوية والصف والفصل مطلوبة');
        return;
      }
    } else if (!isEdit) {
      if (!form.email.trim()) { setError('البريد الإلكتروني مطلوب'); return; }
      if (form.password.length < 8) { setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }
    }
    if (form.role === 'deputy' && !staffEducationLevel) {
      setError('اختر مرحلة الوكيل: متوسط أو ثانوي — ليظهر له فصول مرحلته فقط');
      return;
    }
    mutation.mutate();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <motion.div
        initial={{ scale: 0.9, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 15, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-gold-400" />
            {isEdit ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-white/60 text-sm">الاسم الكامل</label>
            <div className="relative">
              <User className="absolute top-1/2 -translate-y-1/2 right-3.5 w-4 h-4 text-white/30" />
              <input
                id="modal-full-name"
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="اسم المستخدم كاملاً"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pr-10 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/20 transition-all text-sm"
              />
            </div>
          </div>

          {/* Phone — للتذكيرات عبر واتساب */}
          {(form.role === 'teacher' || form.role === 'student' || form.role === 'deputy' || isEdit) && (
            <div className="space-y-1.5">
              <label className="text-white/60 text-sm">رقم الجوال (واتساب)</label>
              <div className="relative">
                <Phone className="absolute top-1/2 -translate-y-1/2 right-3.5 w-4 h-4 text-white/30" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pr-10 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/20 transition-all text-sm text-left"
                />
              </div>
              {form.role === 'teacher' && (
                <p className="text-white/35 text-xs">يُستخدم لإرسال تذكيرات الواجب والخطة وملاحظات ولي الأمر</p>
              )}
              {form.role === 'deputy' && (
                <p className="text-white/35 text-xs">يُستخدم لتذكير واتساب بفصول الغياب المتبقية</p>
              )}
              {form.role === 'student' && !isEdit && (
                <p className="text-white/35 text-xs">اختياري — يمكن للطالب إدخاله لاحقاً عند ربط الحساب</p>
              )}
            </div>
          )}

          {/* Role — قبل البريد حتى يظهر مسار الطالب بدون حساب */}
          <div className="space-y-1.5">
            <label className="text-white/60 text-sm">الدور</label>
            <select
              id="modal-role"
              value={form.role}
              onChange={(e) => {
                const role = e.target.value as UserRole;
                setForm({ ...form, role });
                if (role !== 'deputy' && role !== 'supervisor') setStaffEducationLevel('');
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/20 transition-all text-sm appearance-none"
            >
              {roleOptions.map((r) => (
                <option key={r} value={r} className="bg-navy-900">
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            {!isEdit && form.role === 'student' && (
              <p className="text-amber-200/80 text-xs leading-relaxed">
                الطالب يُضاف للقائمة المدرسية فقط بدون بريد أو كلمة مرور. سيربط حسابه لاحقاً برقم الهوية.
              </p>
            )}
          </div>

          {(form.role === 'deputy' || form.role === 'supervisor') && (
            <div className="space-y-1.5 p-4 rounded-xl border border-gold-400/25 bg-gold-500/5">
              <label className="text-white/80 text-sm font-semibold flex items-center gap-1.5">
                <School className="w-4 h-4 text-gold-400" />
                مرحلة {form.role === 'deputy' ? 'الوكيل' : 'المشرف'}
                {form.role === 'deputy' ? ' *' : ''}
              </label>
              <select
                value={staffEducationLevel}
                onChange={(e) =>
                  setStaffEducationLevel(e.target.value as AcademicEducationLevel | '')
                }
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none"
                required={form.role === 'deputy'}
              >
                <option value="" className="bg-navy-900">
                  اختر المرحلة
                </option>
                <option value="middle" className="bg-navy-900">
                  {ACADEMIC_LEVEL_LABELS.middle}
                </option>
                <option value="high" className="bg-navy-900">
                  {ACADEMIC_LEVEL_LABELS.high}
                </option>
              </select>
              <p className="text-white/40 text-xs leading-relaxed">
                يحدد الفصول والغياب والشؤون الأكاديمية التي يراها هذا الحساب فقط.
              </p>
            </div>
          )}

          {/* Email (create only — ليس للطالب) */}
          {!isEdit && form.role !== 'student' && (
            <div className="space-y-1.5">
              <label className="text-white/60 text-sm">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute top-1/2 -translate-y-1/2 right-3.5 w-4 h-4 text-white/30" />
                <input
                  id="modal-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="example@school.sa"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pr-10 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/20 transition-all text-sm"
                />
              </div>
            </div>
          )}

          {/* Password (create only — ليس للطالب) */}
          {!isEdit && form.role !== 'student' && (
            <div className="space-y-1.5">
              <label className="text-white/60 text-sm">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute top-1/2 -translate-y-1/2 right-3.5 w-4 h-4 text-white/30" />
                <input
                  id="modal-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="8 أحرف على الأقل"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pr-10 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/20 transition-all text-sm"
                />
              </div>
            </div>
          )}
          {/* Teacher Specific Fields */}
          {form.role === 'teacher' && (
            <div className="p-4 bg-white/3 border border-white/5 rounded-xl space-y-4 animate-fade-in">
              <div className="space-y-1.5">
                <label className="text-white/60 text-xs flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-gold-400" /> المادة الدراسية
                </label>
                {uniqueSubjectNames.length > 0 ? (
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none"
                  >
                    <option value="" className="bg-navy-900">اختر المادة</option>
                    {uniqueSubjectNames.map((name) => (
                      <option key={name} value={name} className="bg-navy-900">
                        {name}
                      </option>
                    ))}
                    {subject && !uniqueSubjectNames.includes(subject) && (
                      <option value={subject} className="bg-navy-900">
                        {subject} (محفوظ سابقاً)
                      </option>
                    )}
                  </select>
                ) : (
                  <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5 space-y-1.5">
                    <p className="text-amber-100 text-xs leading-relaxed">
                      لا توجد مواد مسجّلة بعد. أضف المواد من الإدارة الأكاديمية أولاً لتظهر هنا كقائمة.
                    </p>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="أو أدخل المادة يدوياً مؤقتاً"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-gold-400/50 text-sm"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-white/60 text-xs flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-gold-400" /> ميزانية النقاط للمعلم
                </label>
                <input
                  type="number"
                  min={0}
                  value={pointsBudget}
                  onChange={(e) => setPointsBudget(Number(e.target.value))}
                  placeholder="100"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-gold-400/50 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-white/60 text-xs flex items-center gap-1.5">
                  الحد الأسبوعي للمنح (نقطة)
                </label>
                <input
                  type="number"
                  min={1}
                  value={teacherWeeklyLimit}
                  onChange={(e) => setTeacherWeeklyLimit(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-gold-400/50 text-sm"
                />
              </div>
              <p className="text-white/35 text-xs leading-relaxed">
                يمكن تعديل حدود جميع المعلمين دفعة واحدة أو لكل معلم من{' '}
                <span className="text-white/50">إعدادات البرنامج → حدود المعلمين</span>
              </p>
              <TeacherClassFields
                assignments={teacherClasses}
                onChange={setTeacherClasses}
              />
            </div>
          )}

          {form.role === 'student' && (
            <div className="space-y-2">
              <StudentClassFields
                admissionNumber={admissionNumber}
                grade={grade}
                className={className}
                onAdmissionNumberChange={setAdmissionNumber}
                onGradeChange={setGrade}
                onClassNameChange={setClassName}
                compact
              />
              <p className="text-white/35 text-xs">رقم القيد = رقم الهوية الوطنية</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-sm font-medium transition-all"
            >
              إلغاء
            </button>
            <button
              id="modal-submit"
              type="submit"
              disabled={mutation.isPending}
              className={clsx(
                'flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all',
                'bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950',
                'hover:shadow-lg hover:shadow-gold-500/20',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            >
              {mutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-navy-900/40 border-t-navy-900 rounded-full animate-spin" />
                  جاري الحفظ...
                </span>
              ) : (
                isEdit
                  ? 'حفظ التغييرات'
                  : form.role === 'student'
                    ? 'إضافة للقائمة المدرسية'
                    : 'إنشاء المستخدم'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
