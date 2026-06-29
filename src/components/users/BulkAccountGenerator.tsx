import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import {
  UserPlus,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Mail,
  RefreshCw,
  ListPlus,
} from 'lucide-react';
import clsx from 'clsx';
import type { StudentExcelRow } from '../../types';
import { ExcelUploader } from '../upload/ExcelUploader';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui';
import { HorizonCard } from '../dashboard/horizon/HorizonDashboard';
import {
  fetchGradeClassOptions,
  getClassesForGrade,
  getGradesFromOptions,
} from '../../lib/schoolClasses';
import { bulkCreateClassAccounts, type BulkAccountResultRow } from '../../lib/bulkAccounts';
import { exportRowsToExcel } from '../../lib/exportExcel';
import { logAction } from '../../lib/auth';
import { showError, showSuccess } from '../../lib/toast';
import { supabase } from '../../lib/supabase';

type InputMode = 'manual' | 'excel' | 'class';

type PendingStudent = {
  full_name: string;
  admission_number?: string;
};

function parseManualNames(text: string): PendingStudent[] {
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(/[,;،]/))
    .map((part) => part.trim())
    .filter(Boolean)
    .map((full_name) => ({ full_name }));
}

function excelRowsToPending(rows: StudentExcelRow[]): PendingStudent[] {
  return rows
    .filter((r) => r.full_name?.trim())
    .map((r) => ({
      full_name: r.full_name.trim(),
      admission_number: r.admission_number?.trim() || undefined,
    }));
}

function accountNamesTemplateRows(): Record<string, string>[] {
  return [
    { الاسم: 'أحمد محمد العتيبي', 'رقم القيد': '1448001' },
    { الاسم: 'سعد عبدالله القحطاني', 'رقم القيد': '1448002' },
  ];
}

export function BulkAccountGenerator({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const [grade, setGrade] = useState('');
  const [className, setClassName] = useState('');
  const [emailDomain, setEmailDomain] = useState('elite.com');
  const [inputMode, setInputMode] = useState<InputMode>('class');
  const [manualText, setManualText] = useState('');
  const [excelRows, setExcelRows] = useState<StudentExcelRow[]>([]);
  const [studentList, setStudentList] = useState<PendingStudent[]>([]);
  const [classOptions, setClassOptions] = useState<Awaited<ReturnType<typeof fetchGradeClassOptions>>>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [loadingClass, setLoadingClass] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<BulkAccountResultRow[] | null>(null);
  const [classLoadHint, setClassLoadHint] = useState<string | null>(null);

  useEffect(() => {
    fetchGradeClassOptions()
      .then(setClassOptions)
      .finally(() => setOptionsLoading(false));
  }, []);

  const grades = useMemo(() => getGradesFromOptions(classOptions), [classOptions]);
  const classes = useMemo(
    () => (grade ? getClassesForGrade(classOptions, grade) : []),
    [classOptions, grade]
  );

  const pendingStudents = useMemo(() => {
    if (inputMode === 'manual') return parseManualNames(manualText);
    if (inputMode === 'excel') return excelRowsToPending(excelRows);
    return studentList;
  }, [inputMode, manualText, excelRows, studentList]);

  const loadStudentsFromClass = useCallback(async () => {
    if (!grade || !className) {
      showError(null, 'اختر الصف والفصل أولاً');
      return;
    }

    setLoadingClass(true);
    setClassLoadHint(null);
    setResults(null);

    try {
      const { data, error } = await supabase
        .from('students')
        .select('full_name, admission_number, user_id')
        .eq('grade', grade)
        .eq('class_name', className)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;

      if (!data?.length) {
        setStudentList([]);
        setClassLoadHint(
          'لا يوجد طلاب مسجّلون في هذا الفصل. استخدم «الرفع الجماعي» لإضافة الطلاب أولاً، أو أدخل الأسماء يدوياً.'
        );
        return;
      }

      const withoutAccounts = data.filter((s) => !s.user_id);
      const source = withoutAccounts.length > 0 ? withoutAccounts : data;

      const list = source.map((s) => ({
        full_name: s.full_name,
        admission_number: s.admission_number || undefined,
      }));

      setStudentList(list);
      setManualText(list.map((s) => s.full_name).join('\n'));
      setClassLoadHint(
        withoutAccounts.length > 0
          ? `تم تحميل ${list.length} طالباً بدون حساب في هذا الفصل`
          : `تم تحميل ${list.length} طالباً (كلهم لديهم حسابات مسبقاً — يمكنك التوليد مجدداً بحذر)`
      );
      showSuccess(`تم تحميل ${list.length} طالب`);
    } catch (err) {
      showError(err, 'فشل تحميل طلاب الفصل');
    } finally {
      setLoadingClass(false);
    }
  }, [grade, className]);

  useEffect(() => {
    if (inputMode === 'class' && grade && className) {
      void loadStudentsFromClass();
    } else if (inputMode === 'class') {
      setStudentList([]);
      setClassLoadHint(null);
    }
  }, [grade, className, inputMode, loadStudentsFromClass]);

  const handleExcelParsed = useCallback((rows: StudentExcelRow[]) => {
    setExcelRows(rows);
    setResults(null);
  }, []);

  const downloadNamesTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(accountNamesTemplateRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'أسماء الطلاب');
    XLSX.writeFile(wb, 'نموذج-أسماء-الطلاب.xlsx');
  };

  const canGenerate = Boolean(grade && className && pendingStudents.length > 0);

  const handleGenerate = async () => {
    if (!grade || !className) {
      showError(null, 'اختر الصف والفصل أولاً');
      return;
    }
    if (pendingStudents.length === 0) {
      showError(null, 'أدخل أسماء الطلاب أو ارفع ملف Excel');
      return;
    }

    setGenerating(true);
    setResults(null);

    try {
      const response = await bulkCreateClassAccounts({
        grade,
        class_name: className,
        students: pendingStudents,
        email_domain: emailDomain.trim() || 'elite.com',
      });

      setResults(response.results);

      await logAction('BULK_CLASS_ACCOUNTS_CREATED', 'students', undefined, {
        grade,
        class_name: className,
        total: pendingStudents.length,
        success: response.success_count,
        failed: response.failed_count,
      });

      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['managed-account-credentials'] });

      if (response.success_count > 0) {
        showSuccess(
          `تم إنشاء ${response.success_count} حساب بنجاح` +
            (response.failed_count > 0 ? ` (فشل ${response.failed_count})` : '')
        );
      } else if (response.failed_count > 0) {
        const firstErr = response.results.find((r) => !r.success)?.error;
        showError(
          firstErr ? new Error(firstErr) : null,
          `فشل إنشاء جميع الحسابات (${response.failed_count}) — راجع الجدول`
        );
      }
    } catch (err) {
      showError(err, 'فشل توليد الحسابات — تأكد من نشر دالة create-user على Supabase');
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = () => {
    if (!results?.length) return;

    const rows = results
      .filter((r) => r.success)
      .map((r) => ({
        'اسم الطالب': r.student_name,
        'رقم القيد': r.admission_number,
        'إيميل الطالب': r.student_email,
        'كلمة مرور الطالب': r.student_password,
        'إيميل ولي الأمر': r.parent_email,
        'كلمة مرور ولي الأمر': r.parent_password,
      }));

    exportRowsToExcel(
      rows,
      'حسابات الفصل',
      `حسابات-${grade}-${className}-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const successResults = results?.filter((r) => r.success) ?? [];
  const failedResults = results?.filter((r) => !r.success) ?? [];

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {!embedded && (
        <PageHeader
          title="توليد حسابات الفصل"
          subtitle="إنشاء حسابات الطلاب وأولياء الأمور تلقائياً مع كلمات مرور مؤقتة"
          icon={UserPlus}
        />
      )}

      <HorizonCard>
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#f0b429]" />
          اختيار الصف والفصل
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm text-[#A3AED0]">الصف الدراسي</label>
            <select
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value);
                setClassName('');
              }}
              disabled={optionsLoading}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
            >
              <option value="">{optionsLoading ? 'جاري التحميل...' : 'اختر الصف'}</option>
              {grades.map((g) => (
                <option key={g} value={g} className="bg-navy-900">
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-[#A3AED0]">الفصل / الشعبة</label>
            <select
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              disabled={!grade || optionsLoading}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
            >
              <option value="">{!grade ? 'اختر الصف أولاً' : 'اختر الفصل'}</option>
              {classes.map((c) => (
                <option key={c} value={c} className="bg-navy-900">
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-[#A3AED0] flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              نطاق البريد الإلكتروني
            </label>
            <input
              type="text"
              value={emailDomain}
              onChange={(e) => setEmailDomain(e.target.value)}
              placeholder="elite.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
              dir="ltr"
            />
            <p className="text-xs text-[#A3AED0]">
              مثال: رقم القيد 1166283984 → طالب{' '}
              <span className="font-mono text-white/80" dir="ltr">
                s1166283984@elite.com
              </span>
              ، ولي أمر{' '}
              <span className="font-mono text-white/80" dir="ltr">
                p1166283984@elite.com
              </span>
            </p>
          </div>
        </div>
      </HorizonCard>

      <HorizonCard>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => setInputMode('class')}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5',
              inputMode === 'class'
                ? 'bg-[#422AFB] text-white'
                : 'bg-white/5 text-[#A3AED0] hover:bg-white/10'
            )}
          >
            <Users className="w-4 h-4" />
            من سجلات الفصل
          </button>
          <button
            type="button"
            onClick={() => setInputMode('manual')}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
              inputMode === 'manual'
                ? 'bg-[#422AFB] text-white'
                : 'bg-white/5 text-[#A3AED0] hover:bg-white/10'
            )}
          >
            إدخال يدوي
          </button>
          <button
            type="button"
            onClick={() => setInputMode('excel')}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5',
              inputMode === 'excel'
                ? 'bg-[#422AFB] text-white'
                : 'bg-white/5 text-[#A3AED0] hover:bg-white/10'
            )}
          >
            <FileSpreadsheet className="w-4 h-4" />
            رفع Excel
          </button>
        </div>

        {inputMode === 'class' && (
          <div className="space-y-4">
            <p className="text-sm text-[#A3AED0]">
              يُحمَّل تلقائياً طلاب الصف والفصل المختارين من قاعدة البيانات (الذين لا يملكون حساباً أولاً).
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void loadStudentsFromClass()}
                disabled={!grade || !className || loadingClass}
                className="gap-2"
              >
                {loadingClass ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                تحديث قائمة الفصل
              </Button>
            </div>
            {classLoadHint && (
              <p className={clsx(
                'text-xs px-3 py-2 rounded-lg border',
                pendingStudents.length > 0
                  ? 'text-[#01B574] bg-[#01B574]/10 border-[#01B574]/20'
                  : 'text-amber-300 bg-amber-500/10 border-amber-500/20'
              )}>
                {classLoadHint}
              </p>
            )}
            {pendingStudents.length > 0 ? (
              <div className="rounded-xl border border-white/[0.06] overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.04] text-[#A3AED0] sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-right">#</th>
                      <th className="px-3 py-2 text-right">اسم الطالب</th>
                      <th className="px-3 py-2 text-right">رقم القيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingStudents.map((s, i) => (
                      <tr key={`${s.admission_number ?? i}-${s.full_name}`} className="border-t border-white/[0.04]">
                        <td className="px-3 py-2 text-[#A3AED0]">{i + 1}</td>
                        <td className="px-3 py-2 text-white">{s.full_name}</td>
                        <td className="px-3 py-2 text-[#A3AED0] font-mono text-xs">{s.admission_number ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              grade &&
              className &&
              !loadingClass && (
                <div className="text-center py-8 rounded-xl bg-white/[0.03] border border-dashed border-white/10">
                  <ListPlus className="w-8 h-8 text-[#A3AED0]/40 mx-auto mb-2" />
                  <p className="text-sm text-[#A3AED0]">لا يوجد طلاب في هذا الفصل بعد</p>
                  <p className="text-xs text-[#A3AED0]/70 mt-1">
                    اذهب إلى «الرفع الجماعي» لإضافة الطلاب، أو استخدم «إدخال يدوي»
                  </p>
                </div>
              )
            )}
            <p className="text-xs font-semibold text-[#f0b429]">
              {pendingStudents.length} طالب جاهز للتوليد
            </p>
          </div>
        )}

        {inputMode === 'manual' ? (
          <div className="space-y-2">
            <label className="text-sm text-[#A3AED0]">أسماء الطلاب (سطر لكل طالب)</label>
            <textarea
              value={manualText}
              onChange={(e) => {
                setManualText(e.target.value);
                setResults(null);
              }}
              rows={8}
              placeholder={'أحمد محمد العتيبي\nسعد عبدالله القحطاني\n...'}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm resize-y"
            />
            <p className="text-xs text-[#A3AED0]">
              أدخل اسماً في كل سطر (أو افصل بفاصلة). العدد:{' '}
              <span className="text-[#f0b429] font-bold">{pendingStudents.length}</span>
            </p>
          </div>
        ) : inputMode === 'excel' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={downloadNamesTemplate} className="gap-2">
                <Download className="w-4 h-4" />
                تحميل نموذج Excel
              </Button>
            </div>
            <ExcelUploader onParsed={handleExcelParsed} />
            <p className="text-xs text-[#A3AED0]">
              الأعمدة المدعومة: <strong className="text-white">الاسم</strong> أو name، و{' '}
              <strong className="text-white">رقم القيد</strong> (اختياري). الصف والفصل من الاختيار أعلاه.
            </p>
            <p className="text-xs font-semibold text-[#f0b429]">
              {pendingStudents.length} طالب من الملف
            </p>
          </div>
        ) : null}
      </HorizonCard>

      {!canGenerate && grade && className && (
        <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm">
          الخطوة 1 ✓ الصف والفصل — الخطوة 2: أضف أسماء الطلاب (تحميل من الفصل / يدوي / Excel)
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleGenerate}
          disabled={generating || !canGenerate}
          className="gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              جاري التوليد...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              توليد الحسابات ({pendingStudents.length})
            </>
          )}
        </Button>

        {successResults.length > 0 && (
          <Button variant="secondary" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            تصدير إلى Excel
          </Button>
        )}
      </div>

      {results && (
        <HorizonCard>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h3 className="text-base font-bold text-white">نتائج التوليد</h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[#01B574] flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                {successResults.length} نجح
              </span>
              {failedResults.length > 0 && (
                <span className="text-[#EE5D50] flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {failedResults.length} فشل
                </span>
              )}
            </div>
          </div>

          {failedResults.length > 0 && (
            <div className="mb-4 rounded-xl border border-[#EE5D50]/30 bg-[#EE5D50]/10 px-4 py-3 text-sm text-[#EE5D50]">
              <p className="font-semibold mb-1">سبب الفشل الأكثر شيوعاً:</p>
              <p>{failedResults[0]?.error ?? 'خطأ غير معروف'}</p>
              {/fix-bulk-accounts|is_first_login|Database error|link_bulk_student_account/i.test(
                failedResults[0]?.error ?? ''
              ) && (
                <p className="mt-2 text-[#A3AED0]">
                  الحل: افتح Supabase → SQL Editor وشغّل الملف{' '}
                  <code className="text-white/90">supabase/fix-bulk-accounts.sql</code>
                </p>
              )}
              {/already registered|مسجّل مسبقاً/i.test(failedResults[0]?.error ?? '') && (
                <p className="mt-2 text-[#A3AED0]">
                  الحل: احذف الحسابات المكررة من Supabase → Authentication، أو غيّر نطاق البريد (مثل
                  school1448.demo).
                </p>
              )}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.04] text-[#A3AED0]">
                  <th className="px-3 py-2.5 text-right font-semibold">اسم الطالب</th>
                  <th className="px-3 py-2.5 text-right font-semibold">إيميل الطالب</th>
                  <th className="px-3 py-2.5 text-right font-semibold">كلمة مرور الطالب</th>
                  <th className="px-3 py-2.5 text-right font-semibold">إيميل ولي الأمر</th>
                  <th className="px-3 py-2.5 text-right font-semibold">كلمة مرور ولي الأمر</th>
                  <th className="px-3 py-2.5 text-center font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <tr
                    key={`${row.admission_number}-${i}`}
                    className={clsx(
                      'border-t border-white/[0.04]',
                      row.success ? 'hover:bg-white/[0.02]' : 'bg-[#EE5D50]/5'
                    )}
                  >
                    <td className="px-3 py-2.5 text-white font-medium">{row.student_name}</td>
                    <td className="px-3 py-2.5 text-[#A3AED0] font-mono text-xs" dir="ltr">
                      {row.student_email || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[#f0b429] font-mono text-xs" dir="ltr">
                      {row.success ? row.student_password : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[#A3AED0] font-mono text-xs" dir="ltr">
                      {row.parent_email || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[#f0b429] font-mono text-xs" dir="ltr">
                      {row.success ? row.parent_password : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {row.success ? (
                        <CheckCircle2 className="w-4 h-4 text-[#01B574] inline" />
                      ) : (
                        <span className="text-xs text-[#EE5D50]" title={row.error}>
                          {row.error ?? 'فشل'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {successResults.length > 0 && (
            <p className="text-xs text-[#A3AED0] mt-4">
              سيُطلب من المستخدمين تغيير كلمة المرور عند أول تسجيل دخول. احفظ هذا الجدول ووزّعه على الطلاب وأولياء الأمور.
            </p>
          )}
        </HorizonCard>
      )}
    </div>
  );
}
