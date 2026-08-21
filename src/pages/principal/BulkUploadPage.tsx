import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAction } from '../../lib/auth';
import { ExcelUploader } from '../../components/upload/ExcelUploader';
import { studentTemplateRows } from '../../lib/studentImport';
import type { StudentExcelRow } from '../../types';
import clsx from 'clsx';
import { Button } from '../../components/ui';
import { showError, showSuccess } from '../../lib/toast';
import { PageHeader } from '../../components/ui/PageHeader';
import { AddStudentRosterForm } from '../../components/users/AddStudentRosterForm';

interface ParsedStudent extends StudentExcelRow {
  _valid: boolean;
  _error?: string;
  _index: number;
}

function validateRow(row: StudentExcelRow, index: number): ParsedStudent {
  const errors: string[] = [];
  if (!row.admission_number) errors.push('رقم الهوية مطلوب');
  if (!row.full_name) errors.push('الاسم الكامل مطلوب');
  if (!row.grade) errors.push('الصف مطلوب');
  if (!row.class_name) errors.push('الفصل مطلوب');
  return {
    ...row,
    _index: index,
    _valid: errors.length === 0,
    _error: errors.join('، '),
  };
}

export function BulkUploadPage() {
  const queryClient = useQueryClient();
  const [parsedRows, setParsedRows] = useState<ParsedStudent[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  const handleFileParsed = useCallback((rows: StudentExcelRow[]) => {
    const validated = rows.map((row, i) => validateRow(row, i));
    setParsedRows(validated);
    setResult(null);
  }, []);

  const handleUpload = async () => {
    const validRows = parsedRows.filter((r) => r._valid);
    if (validRows.length === 0) {
      showError(null, 'لا توجد صفوف صالحة للرفع');
      return;
    }

    setUploading(true);
    let success = 0;
    let failed = 0;

    // Insert in batches of 50
    const batches: StudentExcelRow[][] = [];
    for (let i = 0; i < validRows.length; i += 50) {
      batches.push(validRows.slice(i, i + 50));
    }

    for (const batch of batches) {
      const inserts = batch.map((row) => ({
        admission_number: String(row.admission_number),
        national_id: String(row.admission_number),
        full_name: row.full_name,
        grade: row.grade,
        class_name: row.class_name,
        date_of_birth: row.date_of_birth ?? null,
        phone: row.phone ?? null,
        academic_year: new Date().getFullYear().toString(),
      })) as Array<{
        admission_number: string;
        national_id: string;
        full_name: string;
        grade: string;
        class_name: string;
        date_of_birth: string | null;
        phone: string | null;
        academic_year: string;
      }>;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('students') as any).upsert(inserts, {
        onConflict: 'admission_number',
        ignoreDuplicates: false,
      });

      if (error) {
        console.error('Batch insert error:', error);
        failed += batch.length;
      } else {
        success += batch.length;
      }
    }

    await logAction('BULK_STUDENT_UPLOAD', 'students', undefined, {
      total: validRows.length,
      success,
      failed,
    });

    queryClient.invalidateQueries({ queryKey: ['students'] });
    setResult({ success, failed });
    setUploading(false);

    if (success > 0) showSuccess(`تم رفع ${success} طالب بنجاح`);
    if (failed > 0) showError(null, `فشل رفع ${failed} طالب — تحقق من الاتصال`);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(studentTemplateRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الطلاب');
    XLSX.writeFile(wb, 'نموذج_رفع_الطلاب.xlsx');
  };

  const validCount = parsedRows.filter((r) => r._valid).length;
  const invalidCount = parsedRows.filter((r) => !r._valid).length;

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="إدارة قائمة الطلاب"
        subtitle="أضف طالباً يدوياً أو ارفع ملف Excel — رقم الهوية يمنع تسجيل طلاب من خارج المدرسة"
        icon={FileSpreadsheet}
        actions={
          <Button variant="secondary" size="md" icon={<Download className="w-4 h-4" />} onClick={downloadTemplate}>
            تحميل نموذج Excel
          </Button>
        }
      />

      <AddStudentRosterForm />

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
        <div>
          <h3 className="text-white font-bold text-sm">رفع جماعي من Excel</h3>
          <p className="text-white/40 text-xs mt-1">الأعمدة: nationalId · name · class · grade · phone</p>
        </div>
        <ExcelUploader onParsed={handleFileParsed} />
      </div>
      {/* Results Summary */}
      {parsedRows.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            {validCount} صف صالح
          </div>
          {invalidCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {invalidCount} صف غير صالح
            </div>
          )}
          <div className="text-white/40 text-sm">
            إجمالي {parsedRows.length} صف
          </div>
        </div>
      )}

      {/* Upload Result */}
      {result && (
        <div className="bg-navy-900/50 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-white font-medium">نتيجة الرفع</p>
            <p className="text-emerald-400 text-sm">✓ تم رفع {result.success} طالب بنجاح</p>
            {result.failed > 0 && (
              <p className="text-red-400 text-sm">✗ فشل رفع {result.failed} طالب</p>
            )}
          </div>
          <button
            onClick={() => { setParsedRows([]); setResult(null); }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Preview Table */}
      {parsedRows.length > 0 && (
        <div className="bg-navy-900/50 border border-white/5 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <h2 className="text-white font-semibold text-sm">معاينة البيانات</h2>
            <Button
              id="bulk-upload-submit"
              onClick={handleUpload}
              disabled={uploading || validCount === 0}
              loading={uploading}
              icon={!uploading ? <Upload className="w-4 h-4" /> : undefined}
              size="md"
            >
              {uploading ? 'جاري الرفع...' : `رفع ${validCount} طالب`}
            </Button>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-white/5 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-right text-white/50 font-medium">#</th>
                  <th className="px-4 py-3 text-right text-white/50 font-medium">الحالة</th>
                  <th className="px-4 py-3 text-right text-white/50 font-medium">رقم الهوية</th>
                  <th className="px-4 py-3 text-right text-white/50 font-medium">الاسم الكامل</th>
                  <th className="px-4 py-3 text-right text-white/50 font-medium">الصف</th>
                  <th className="px-4 py-3 text-right text-white/50 font-medium">الفصل</th>
                  <th className="px-4 py-3 text-right text-white/50 font-medium">الجوال</th>
                  <th className="px-4 py-3 text-right text-white/50 font-medium">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {parsedRows.map((row) => (
                  <tr
                    key={row._index}
                    className={clsx(
                      'transition-colors',
                      row._valid
                        ? 'hover:bg-white/3'
                        : 'bg-red-500/5 hover:bg-red-500/8'
                    )}
                  >
                    <td className="px-4 py-3 text-white/30">{row._index + 1}</td>
                    <td className="px-4 py-3">
                      {row._valid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/80 font-mono text-xs">{row.admission_number}</td>
                    <td className="px-4 py-3 text-white">{row.full_name}</td>
                    <td className="px-4 py-3 text-white/60">{row.grade}</td>
                    <td className="px-4 py-3 text-white/60">{row.class_name}</td>
                    <td className="px-4 py-3 text-white/50 text-xs font-mono" dir="ltr">
                      {row.phone ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-red-400 text-xs">{row._error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
