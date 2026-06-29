import { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import type { StudentExcelRow } from '../../types';
import { parseStudentExcelRows } from '../../lib/studentImport';
import clsx from 'clsx';

interface ExcelUploaderProps {
  onParsed: (rows: StudentExcelRow[]) => void;
}

export function ExcelUploader({ onParsed }: ExcelUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const parseFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
          defval: '',
          raw: false,
        });

        onParsed(parseStudentExcelRows(rows));
      };
      reader.readAsArrayBuffer(file);
    },
    [onParsed]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) parseFile(file);
    },
    [parseFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = '';
  };

  const clear = () => {
    setFileName(null);
    onParsed([]);
  };

  return (
    <div
      id="excel-dropzone"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={clsx(
        'relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer',
        dragOver
          ? 'border-gold-400/60 bg-gold-500/5 scale-[1.01]'
          : 'border-white/10 bg-navy-900/30 hover:border-white/20 hover:bg-white/3'
      )}
    >
      <input
        id="excel-file-input"
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />

      {fileName ? (
        <div className="flex items-center justify-center gap-3">
          <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
          <div className="text-right">
            <p className="text-white font-medium text-sm">{fileName}</p>
            <p className="text-white/40 text-xs">تم تحليل الملف بنجاح</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              clear();
            }}
            className="mr-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold-500/10 border border-gold-500/20 mx-auto">
            <Upload className="w-7 h-7 text-gold-400" />
          </div>
          <div>
            <p className="text-white font-medium mb-1">اسحب ملف Excel هنا أو انقر للاختيار</p>
            <p className="text-white/30 text-sm">يدعم .xlsx, .xls, .csv</p>
            <p className="text-white/25 text-xs mt-2 font-mono" dir="ltr">
              nationalId · name · class · grade · phone
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
