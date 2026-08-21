import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { logAction } from '../../lib/auth';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Card';
import { showSuccess, showError } from '../../lib/toast';
import {
  parseAttendanceExcelRows,
  detectPeriodType,
  attendanceTemplateRows,
  attendanceListTemplateRows,
  type AttendanceImportRow,
} from '../../lib/attendanceImport';
import { invalidateAttendanceQueries } from '../../lib/attendanceQueries';
import clsx from 'clsx';

type TemplateMode = 'matrix' | 'list';

export function AttendanceUploadTab() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [parsedRows, setParsedRows] = useState<AttendanceImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [templateMode, setTemplateMode] = useState<TemplateMode>('matrix');

  const validRows = parsedRows.filter((r) => r._valid);
  const invalidRows = parsedRows.filter((r) => !r._valid);

  const parseFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
        raw: false,
      });
      setParsedRows(parseAttendanceExcelRows(rows));
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('غير مصرح');
      if (validRows.length === 0) throw new Error('لا توجد صفوف صالحة');

      const admissionNumbers = [...new Set(validRows.map((r) => r.admission_number))];
      const { data: students, error: stuErr } = await supabase
        .from('students')
        .select('id, admission_number')
        .in('admission_number', admissionNumbers);
      if (stuErr) throw stuErr;

      const studentMap = new Map(
        (students ?? []).map((s) => [s.admission_number, s.id])
      );

      const inserts: Array<{
        student_id: string;
        date: string;
        status: string;
        note: string | null;
        recorded_by: string;
      }> = [];
      let failed = 0;

      for (const row of validRows) {
        const studentId = studentMap.get(row.admission_number);
        if (!studentId) {
          failed += 1;
          continue;
        }
        inserts.push({
          student_id: studentId,
          date: row.date,
          status: row.status,
          note: row.note ?? null,
          recorded_by: user.id,
        });
      }

      const dates = validRows.map((r) => r.date);
      const periodType = detectPeriodType(dates);
      const sortedDates = [...dates].sort();

      // رفع على دفعات
      const batchSize = 200;
      for (let i = 0; i < inserts.length; i += batchSize) {
        const chunk = inserts.slice(i, i + batchSize);
        const { error } = await supabase
          .from('attendance')
          .upsert(chunk, { onConflict: 'student_id,date' });
        if (error) throw error;
      }

      await supabase.from('attendance_import_batches').insert({
        uploaded_by: user.id,
        filename: fileName,
        period_type: periodType,
        period_start: sortedDates[0] ?? null,
        period_end: sortedDates[sortedDates.length - 1] ?? null,
        rows_total: parsedRows.length,
        rows_success: inserts.length,
        rows_failed: failed + invalidRows.length,
      });

      await logAction('ATTENDANCE_BULK_UPLOAD', 'attendance', undefined, {
        filename: fileName,
        success: inserts.length,
        failed: failed + invalidRows.length,
        period_type: periodType,
      });

      return { success: inserts.length, failed: failed + invalidRows.length };
    },
    onSuccess: (result) => {
      showSuccess(`تم استيراد ${result?.success ?? 0} سجل حضور`);
      setParsedRows([]);
      setFileName(null);
      invalidateAttendanceQueries(queryClient);
    },
    onError: (e: Error) => showError(e),
  });

  const downloadTemplate = (mode: TemplateMode) => {
    const data = mode === 'matrix' ? attendanceTemplateRows() : attendanceListTemplateRows();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الحضور');
    XLSX.writeFile(
      wb,
      mode === 'matrix' ? 'قالب-حضور-أسبوعي.xlsx' : 'قالب-حضور-قائمة.xlsx'
    );
  };

  return (
    <div className="space-y-6">
      <Panel className="p-5 space-y-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-sm">رفع ملف الحضور والغياب</h3>
            <p className="text-white/40 text-xs mt-1">
              يدعم صيغة أسبوعية/شهرية (أعمدة تواريخ) أو قائمة (تاريخ + حالة لكل صف)
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="secondary"
              icon={<Download className="w-4 h-4" />}
              onClick={() => downloadTemplate('matrix')}
            >
              قالب أسبوعي
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<Download className="w-4 h-4" />}
              onClick={() => downloadTemplate('list')}
            >
              قالب قائمة
            </Button>
          </div>
        </div>

        <div
          className={clsx(
            'relative border-2 border-dashed rounded-2xl p-8 text-center transition-all',
            'border-white/10 bg-navy-900/30 hover:border-gold-400/30'
          )}
        >
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) parseFile(file);
              e.target.value = '';
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {fileName ? (
            <div className="flex items-center justify-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
              <div className="text-right">
                <p className="text-white font-medium text-sm">{fileName}</p>
                <p className="text-white/40 text-xs">
                  {parsedRows.length} سجل — {validRows.length} صالح
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFileName(null);
                  setParsedRows([]);
                }}
                className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 text-gold-400 mx-auto" />
              <p className="text-white text-sm">اسحب ملف Excel أو انقر للاختيار</p>
              <p className="text-white/30 text-xs">الحالات: حاضر | غائب | متأخر</p>
            </div>
          )}
        </div>

        {parsedRows.length > 0 && (
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              {validRows.length} صالح
            </div>
            {invalidRows.length > 0 && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {invalidRows.length} مرفوض
              </div>
            )}
            <Button
              className="mr-auto"
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending || validRows.length === 0}
            >
              {uploadMutation.isPending ? 'جاري المعالجة...' : `استيراد ${validRows.length} سجل`}
            </Button>
          </div>
        )}
      </Panel>

      {parsedRows.length > 0 && (
        <Panel className="p-5 overflow-x-auto">
          <h3 className="text-white font-semibold text-sm mb-4">معاينة البيانات</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 border-b border-white/5">
                <th className="py-2 text-right">رقم القيد</th>
                <th className="py-2 text-right">التاريخ</th>
                <th className="py-2 text-right">الحالة</th>
                <th className="py-2 text-right">الصلاحية</th>
              </tr>
            </thead>
            <tbody>
              {parsedRows.slice(0, 100).map((row) => (
                <tr key={`${row._index}-${row.date}`} className="border-b border-white/5">
                  <td className="py-2 text-white">{row.admission_number}</td>
                  <td className="py-2 text-white/60">{row.date}</td>
                  <td className="py-2">
                    {row.status === 'present' ? 'حاضر' : row.status === 'absent' ? 'غائب' : 'متأخر'}
                  </td>
                  <td className="py-2">
                    {row._valid ? (
                      <span className="text-emerald-400 text-xs">صالح</span>
                    ) : (
                      <span className="text-red-400 text-xs">{row._error}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {parsedRows.length > 100 && (
            <p className="text-white/30 text-xs mt-2 text-center">
              عرض أول 100 سجل من {parsedRows.length}
            </p>
          )}
        </Panel>
      )}
    </div>
  );
}
