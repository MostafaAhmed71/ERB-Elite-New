import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, User, Mail, Lock, Shield, AlertCircle, BookOpen, Coins } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAction, createUser, toArabicErrorMessage } from '../../lib/auth';
import { StudentClassFields } from './StudentClassFields';
import { TeacherClassFields } from './TeacherClassFields';
import {
  fetchTeacherClassAssignments,
  saveTeacherClassAssignments,
  type TeacherClassAssignment,
} from '../../lib/teacherScope';
import { fetchTeacherPointsLimits } from '../../lib/teacherPointsLimits';
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
  });
  
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

  useEffect(() => {
    if (editUser) {
      setForm({
        full_name: editUser.full_name,
        email: editUser.email,
        password: '',
        role: editUser.role,
      });

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

      if (isEdit) {
        // Update existing user profile
        const { error } = await supabase
          .from('users')
          .update({ full_name: form.full_name, role: form.role })
          .eq('id', editUser!.id);
        if (error) throw error;
        await logAction('USER_UPDATED', 'users', editUser!.id, { role: form.role });
      } else {
        targetUserId = await createUser({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          role: form.role,
          subject: form.role === 'teacher' ? subject : undefined,
          points_budget: form.role === 'teacher' ? pointsBudget : undefined,
          admission_number: form.role === 'student' ? admissionNumber : undefined,
          grade: form.role === 'student' ? grade : undefined,
          class_name: form.role === 'student' ? className : undefined,
        });
      }

      if (form.role === 'student' && targetUserId) {
        const { error: studentErr } = await supabase
          .from('students')
          .upsert({
            user_id: targetUserId,
            admission_number: admissionNumber.trim(),
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
      toast.success(isEdit ? 'تم تحديث المستخدم بنجاح' : 'تم إنشاء المستخدم بنجاح');
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
    if (!isEdit && !form.email.trim()) { setError('البريد الإلكتروني مطلوب'); return; }
    if (!isEdit && form.password.length < 8) { setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }
    if (!isEdit && form.role === 'student') {
      if (!admissionNumber.trim() || !grade || !className) {
        setError('للطلاب: رقم القيد والصف والفصل مطلوبة');
        return;
      }
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

          {/* Email (create only) */}
          {!isEdit && (
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

          {/* Password (create only) */}
          {!isEdit && (
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

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-white/60 text-sm">الدور</label>
            <select
              id="modal-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/20 transition-all text-sm appearance-none"
            >
              {roleOptions.map((r) => (
                <option key={r} value={r} className="bg-navy-900">
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          {/* Teacher Specific Fields */}
          {form.role === 'teacher' && (
            <div className="p-4 bg-white/3 border border-white/5 rounded-xl space-y-4 animate-fade-in">
              <div className="space-y-1.5">
                <label className="text-white/60 text-xs flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-gold-400" /> المادة الدراسية
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="مثال: الرياضيات، الفيزياء"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-gold-400/50 text-sm"
                />
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
            <StudentClassFields
              admissionNumber={admissionNumber}
              grade={grade}
              className={className}
              onAdmissionNumberChange={setAdmissionNumber}
              onGradeChange={setGrade}
              onClassNameChange={setClassName}
              compact
            />
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
                isEdit ? 'حفظ التغييرات' : 'إنشاء المستخدم'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
