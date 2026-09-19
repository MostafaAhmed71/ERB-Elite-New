import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Database,
  Download,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Archive,
  RefreshCw,
  Users,
  Award,
  BookOpen,
  Calendar,
  Layers,
  KeyRound,
  UploadCloud,
  FileUp,
  AlertTriangle,
  Check,
  CheckSquare,
  Square,
  RotateCcw,
  Sparkles,
  FileText,
  Clock,
  FolderArchive,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import {
  fetchCompleteSystemBackup,
  downloadBackupAsJson,
  downloadBackupAsExcel,
  validateBackupPayload,
  restoreSystemBackup,
  BACKUP_TABLES,
  type SystemBackupPayload,
  type ValidationResult,
  type RestoreResult,
  type RestoreProgress,
} from '../../lib/systemBackupService';

interface TableStat {
  label: string;
  count: number;
  icon: typeof Users;
  color: string;
}

export function AdminBackupPage() {
  const [activeTab, setActiveTab] = useState<'export' | 'restore'>('export');
  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState<TableStat[]>([]);

  // Export State
  const [backingUp, setBackingUp] = useState(false);
  const [exportStep, setExportStep] = useState<string>('');
  const [exportPercent, setExportPercent] = useState<number>(0);
  const [lastExportTime, setLastExportTime] = useState<string | null>(() => {
    return localStorage.getItem('erb_last_backup_time');
  });

  // Restore State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<RestoreProgress | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [
        studentsRes,
        pointsRes,
        credentialsRes,
        plansRes,
        homeworksRes,
        schedulesRes,
        topicsRes,
        reviewsRes,
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('points_ledger').select('*', { count: 'exact', head: true }),
        supabase.from('managed_account_credentials').select('*', { count: 'exact', head: true }),
        supabase.from('lesson_plans').select('*', { count: 'exact', head: true }),
        supabase.from('academic_homeworks').select('*', { count: 'exact', head: true }),
        supabase.from('academic_teacher_schedules').select('*', { count: 'exact', head: true }),
        supabase.from('academic_lesson_topics').select('*', { count: 'exact', head: true }),
        supabase.from('academic_exam_reviews').select('*', { count: 'exact', head: true }),
      ]);

      setStats([
        {
          label: 'الطلاب والصفوف',
          count: studentsRes.count ?? 0,
          icon: Users,
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        },
        {
          label: 'حركات سجل النقاط',
          count: pointsRes.count ?? 0,
          icon: Award,
          color: 'text-gold-400 bg-gold-500/10 border-gold-500/20',
        },
        {
          label: 'الجداول الدراسية للمعلمين',
          count: schedulesRes.count ?? 0,
          icon: Calendar,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        },
        {
          label: 'ملفات وموضوعات المعلمين',
          count: topicsRes.count ?? 0,
          icon: BookOpen,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        },
        {
          label: 'مراجعات الاختبارات وأوراق العمل',
          count: reviewsRes.count ?? 0,
          icon: FileText,
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
        },
        {
          label: 'الخطط والتحاضير',
          count: plansRes.count ?? 0,
          icon: BookOpen,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        },
        {
          label: 'الواجبات اليومية',
          count: homeworksRes.count ?? 0,
          icon: Layers,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        },
        {
          label: 'الحسابات المولدة',
          count: credentialsRes.count ?? 0,
          icon: KeyRound,
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        },
      ]);
    } catch {
      // ignore
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  // Export handler
  const handleStartBackup = async (targetFormat: 'excel' | 'json') => {
    setBackingUp(true);
    setExportPercent(5);
    setExportStep('بدء فحص الاتصال وقراءة جداول النظام...');

    try {
      const data = await fetchCompleteSystemBackup((step, percent) => {
        setExportStep(step);
        setExportPercent(percent);
      });

      const nowStr = new Date().toLocaleString('ar-SA');
      setLastExportTime(nowStr);
      localStorage.setItem('erb_last_backup_time', nowStr);

      if (targetFormat === 'excel') {
        downloadBackupAsExcel(data);
        toast.success('تم تنزيل النسخة الاحتياطية بنجاح كملف Excel شامل ومتعدد الصفحات!');
      } else {
        downloadBackupAsJson(data);
        toast.success('تم تنزيل النسخة الاحتياطية بنجاح كملف JSON مهيكل بالكامل!');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل سحب النسخة الاحتياطية');
    } finally {
      setBackingUp(false);
      setExportPercent(0);
      setExportStep('');
    }
  };

  // Restore file selection handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('يرجى اختيار ملف نسخة احتياطية بصيغة JSON (.json)');
      return;
    }

    setSelectedFile(file);
    setRestoreResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const val = validateBackupPayload(content);
      setValidationResult(val);

      if (val.valid && val.payload) {
        // Select all tables with records > 0 by default
        const keysWithRecords = Object.entries(val.stats)
          .filter(([_, data]) => data.count > 0)
          .map(([k]) => k);
        setSelectedTables(keysWithRecords);
        toast.success(`تم التحقق من الملف بنجاح! تم العثور على ${val.totalRecords.toLocaleString('ar-SA')} سجل.`);
      } else {
        toast.error(val.error || 'الملف المختار غير متوافق مع نظام النسخ الاحتياطي');
      }
    };
    reader.readAsText(file);
  };

  const handleToggleTable = (tableKey: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableKey) ? prev.filter((k) => k !== tableKey) : [...prev, tableKey]
    );
  };

  const handleSelectAllTables = () => {
    if (!validationResult?.stats) return;
    const all = Object.entries(validationResult.stats)
      .filter(([_, data]) => data.count > 0)
      .map(([k]) => k);
    setSelectedTables(all);
  };

  const handleUnselectAllTables = () => {
    setSelectedTables([]);
  };

  // Execute restore
  const handleExecuteRestore = async () => {
    if (!validationResult?.payload) {
      toast.error('لا يوجد ملف صالح للاسترداد');
      return;
    }

    if (selectedTables.length === 0) {
      toast.error('يرجى تحديد جدول واحد على الأقل للاسترداد');
      return;
    }

    setShowConfirmModal(false);
    setRestoring(true);
    setRestoreResult(null);

    try {
      const result = await restoreSystemBackup(
        validationResult.payload,
        { selectedTables },
        (progress) => {
          setRestoreProgress(progress);
        }
      );

      setRestoreResult(result);
      if (result.success) {
        toast.success(`اكتمل الاسترداد بنجاح! تم إدراج وتحديث ${result.totalRestored.toLocaleString('ar-SA')} سجل.`);
        void loadStats();
      } else {
        toast.error('لم يتم استرداد أي سجلات، تحقق من سجل الأخطاء أدناه.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ غير متوقع أثناء استرداد البيانات');
    } finally {
      setRestoring(false);
    }
  };

  const resetRestoreState = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setSelectedTables([]);
    setRestoreResult(null);
    setRestoreProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <RolePageShell>
      <div className="space-y-6" dir="rtl">
        <PageHeader
          title="إدارة النسخ الاحتياطي واسترداد البيانات"
          subtitle="تصدير وأرشفة واسترجاع كافة بيانات المنصة (النقاط، الطلاب، الملفات التعليمية والجداول الدراسية لكل معلم)"
          icon={Database}
        />

        {/* أشرطة التنقل بين التصدير والاسترداد */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab('export')}
            className={clsx(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all',
              activeTab === 'export'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30'
                : 'text-white/60 hover:text-white hover:bg-white/5 border border-white/10'
            )}
          >
            <Download className="w-4 h-4" />
            تصدير نسخة احتياطية (تنزيل)
          </button>

          <button
            onClick={() => setActiveTab('restore')}
            className={clsx(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all',
              activeTab === 'restore'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-900/30'
                : 'text-white/60 hover:text-white hover:bg-white/5 border border-white/10'
            )}
          >
            <UploadCloud className="w-4 h-4" />
            استرداد نسخة احتياطية (رفع واسترجاع)
          </button>
        </div>

        {/* تنبيه الأمان والموثوقية */}
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-950/30 p-4 text-emerald-200">
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed space-y-1">
            <p className="font-bold text-emerald-300 text-sm">
              محرك نسخ احتياطي واسترداد شامل وآمن 100%
            </p>
            <p className="text-emerald-200/80">
              يشمل النظام الآن <strong>الملفات والموضوعات التعليمية للمعلمين</strong> و<strong>الجداول الدراسية الأسبوعية وحصص كل معلم</strong> بالإضافة إلى الطلاب، سجل النقاط، التحاضير، الواجبات، ومراجعات الاختبارات. يمكنك التصدير بصيغة Excel أو JSON، كما يمكنك <strong>استرداد نسخة سابقة</strong> ودمجها بأمان.
            </p>
          </div>
        </div>

        {/* بطاقات الإحصائيات السريعة */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={clsx(
                  'rounded-2xl border p-3 flex flex-col justify-between transition-all bg-navy-900/60',
                  item.color.split(' ')[2] || 'border-white/10'
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-[#A3AED0] line-clamp-1" title={item.label}>
                    {item.label}
                  </span>
                  <div className={clsx('w-6 h-6 rounded-lg flex items-center justify-center', item.color)}>
                    <Icon className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-base font-black text-white">
                  {loadingStats ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40" /> : item.count.toLocaleString('ar-SA')}
                </div>
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* التبويب الأول: تصدير نسخة احتياطية */}
        {/* ========================================================================= */}
        {activeTab === 'export' && (
          <div className="space-y-6">
            <HorizonCard>
              <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Archive className="w-5 h-5 text-gold-400" />
                    تصدير النسخة الاحتياطية الحالية
                  </h3>
                  <p className="text-xs text-[#A3AED0] mt-1">
                    اختر الصيغة المناسبة لك لبدء عملية التجميع والتنزيل
                  </p>
                </div>

                {lastExportTime && (
                  <span className="text-xs px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-white/70 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gold-400" />
                    آخر تصدير: <strong className="text-gold-300">{lastExportTime}</strong>
                  </span>
                )}
              </div>

              {/* شريط التقدم أثناء التصدير */}
              {backingUp && (
                <div className="mb-6 rounded-2xl border border-cyan-500/30 bg-cyan-950/40 p-4 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cyan-300 font-medium flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {exportStep}
                    </span>
                    <span className="font-mono text-cyan-400 font-bold">{exportPercent}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-navy-950">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${exportPercent}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* خيار Excel */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col justify-between hover:border-gold-500/40 transition-all">
                  <div className="space-y-2 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      ملف Excel تفصيلي متعدد الصفحات (.xlsx)
                    </h4>
                    <p className="text-xs text-[#A3AED0] leading-relaxed">
                      يحتوي على ورقة عمل مخصصة لكل جدول (الجداول الدراسية للمعلمين، الملفات والموضوعات التعليمية، مراجعات الاختبارات، الطلاب، سجل النقاط، الواجبات، التحاضير). مثالي للطباعة والمراجعة.
                    </p>
                  </div>
                  <Button
                    disabled={backingUp}
                    onClick={() => void handleStartBackup('excel')}
                    className="w-full justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    <Download className="w-4 h-4" />
                    تنزيل نسخة Excel الشاملة
                  </Button>
                </div>

                {/* خيار JSON */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-all">
                  <div className="space-y-2 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      نسخة تقنية كاملة مهيكلة (.json) — قابلة للاسترداد
                    </h4>
                    <p className="text-xs text-[#A3AED0] leading-relaxed">
                      نسخة طبق الأصل بجميع المعرفات الفريدة والحقول والعلاقات. يمكن استخدام هذا الملف لاحقاً في تبويب <strong>استرداد نسخة احتياطية</strong> لإعادة بناء وتحديث البيانات في أي وقت.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={backingUp}
                    onClick={() => void handleStartBackup('json')}
                    className="w-full justify-center gap-2 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 font-bold"
                  >
                    <Download className="w-4 h-4" />
                    تنزيل النسخة الكاملة (JSON)
                  </Button>
                </div>
              </div>
            </HorizonCard>

            {/* تفاصيل الجداول المشمولة */}
            <HorizonCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  البيانات المشمولة في النسخة الاحتياطية
                </h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void loadStats()}
                  disabled={loadingStats}
                  className="text-xs gap-1.5"
                >
                  <RefreshCw className={clsx('w-3.5 h-3.5', loadingStats && 'animate-spin')} />
                  تحديث الأرقام
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-1">
                  <span className="font-semibold text-purple-300 block">1. جداول المعلمين الأسبوعية</span>
                  <p className="text-[#A3AED0]">الحصص، الفصول، المواد، والجدول الكامل لكل معلم.</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                  <span className="font-semibold text-emerald-300 block">2. الملفات والموضوعات التعليمية</span>
                  <p className="text-[#A3AED0]">موضوعات الدروس وتوزيع المناهج الخاصة بكل معلم ومادة.</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1">
                  <span className="font-semibold text-rose-300 block">3. مراجعات الاختبارات وأوراق العمل</span>
                  <p className="text-[#A3AED0]">الملفات المرفوعة، نماذج الأسئلة، ومراجعات الفترات والنهائي.</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-1">
                  <span className="font-semibold text-blue-300 block">4. الخطط والواجبات المدرسية</span>
                  <p className="text-[#A3AED0]">الخطط الدراسية اليومية، الخطط الأسبوعية، والواجبات اليومية.</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-semibold text-white block">5. الطلاب والصفوف</span>
                  <p className="text-[#A3AED0]">الأسماء، أرقام القيد، الفصول، ومجموع النقاط.</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-semibold text-white block">6. سجل النقاط والأنشطة</span>
                  <p className="text-[#A3AED0]">كامل حركات المنح، المحاور، والمعلمين المانحين.</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-semibold text-white block">7. الحسابات والمستخدمين</span>
                  <p className="text-[#A3AED0]">بيانات الدخول للطلاب والمعلمين والملفات الشخصية.</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-semibold text-white block">8. إعدادات المدرسة والكتالوج</span>
                  <p className="text-[#A3AED0]">أوزان المحاور، الفصول، والمواد الدراسية.</p>
                </div>
              </div>
            </HorizonCard>
          </div>
        )}

        {/* ========================================================================= */}
        {/* التبويب الثاني: استرداد نسخة احتياطية */}
        {/* ========================================================================= */}
        {activeTab === 'restore' && (
          <div className="space-y-6">
            <HorizonCard>
              <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-cyan-400" />
                    استرداد نسخة احتياطية سابقة
                  </h3>
                  <p className="text-xs text-[#A3AED0] mt-1">
                    ارفع ملف النسخة الاحتياطية (.json) لاستعراض محتوياته وتحديد الجداول المراد استردادها
                  </p>
                </div>

                {selectedFile && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={resetRestoreState}
                    disabled={restoring}
                    className="text-xs gap-1.5 border-white/10 text-white/70 hover:text-white"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    اختيار ملف آخر
                  </Button>
                )}
              </div>

              {/* منطقة رفع الملف */}
              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-cyan-500/30 bg-cyan-950/10 hover:bg-cyan-950/20 hover:border-cyan-500/60 transition-all p-8 flex flex-col items-center justify-center text-center cursor-pointer group space-y-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                    <FileUp className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">
                      انقر لاختيار ملف النسخة الاحتياطية (.json)
                    </h4>
                    <p className="text-xs text-[#A3AED0]">
                      أو اسحب وأفلت الملف هنا (يجب أن يكون ملف JSON الصادر من منصة النخبة)
                    </p>
                  </div>
                </div>
              ) : (
                /* ملخص الملف المرفوع */
                <div className="space-y-5">
                  <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                        <FolderArchive className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{selectedFile.name}</h4>
                        <div className="text-xs text-[#A3AED0] flex items-center gap-3 mt-0.5">
                          <span>الحجم: {(selectedFile.size / 1024).toFixed(1)} ك.ب</span>
                          {validationResult?.metadata && (
                            <>
                              <span>•</span>
                              <span>
                                تاريخ التصدير: {new Date(validationResult.metadata.exportedAt).toLocaleDateString('ar-SA')}
                              </span>
                              <span>•</span>
                              <span>الإصدار: {validationResult.metadata.version}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
                        إجمالي السجلات: {validationResult?.totalRecords.toLocaleString('ar-SA') ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* شريط التقدم أثناء الاسترداد الحقيقي */}
                  {restoring && restoreProgress && (
                    <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/40 p-4 space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-cyan-300 font-medium flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {restoreProgress.message}
                        </span>
                        <span className="font-mono text-cyan-400 font-bold">
                          {restoreProgress.percentage}% ({restoreProgress.tableIndex}/{restoreProgress.totalTables})
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-navy-950">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-300"
                          style={{ width: `${restoreProgress.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* تقرير اكتمال الاسترداد */}
                  {restoreResult && (
                    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          اكتملت عملية الاسترداد بنجاح
                        </h4>
                        <div className="text-xs space-x-2 space-x-reverse font-bold">
                          <span className="text-emerald-400">
                            تم استرداد: {restoreResult.totalRestored.toLocaleString('ar-SA')} سجل
                          </span>
                          {restoreResult.totalSkipped > 0 && (
                            <span className="text-amber-400">
                              (تم تخطي {restoreResult.totalSkipped.toLocaleString('ar-SA')} سجل)
                            </span>
                          )}
                        </div>
                      </div>

                      {restoreResult.errors.length > 0 && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-200/90 space-y-1">
                          <p className="font-bold flex items-center gap-1.5 text-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            ملاحظات أثناء الاستيراد:
                          </p>
                          <ul className="list-disc list-inside space-y-0.5 text-amber-200/80">
                            {restoreResult.errors.map((err, idx) => (
                              <li key={idx}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* قائمة الجداول للاختيار */}
                  {validationResult && validationResult.valid && !restoring && !restoreResult && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                          حدد الجداول المراد استردادها:
                        </h4>
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={handleSelectAllTables}
                            className="text-cyan-400 hover:text-cyan-300 underline"
                          >
                            تحديد الكل
                          </button>
                          <span className="text-white/20">|</span>
                          <button
                            type="button"
                            onClick={handleUnselectAllTables}
                            className="text-white/60 hover:text-white underline"
                          >
                            إلغاء التحديد
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {BACKUP_TABLES.map((tableDef) => {
                          const tableData = validationResult.stats[tableDef.key];
                          const count = tableData?.count ?? 0;
                          const isSelected = selectedTables.includes(tableDef.key);

                          return (
                            <div
                              key={tableDef.key}
                              onClick={() => count > 0 && handleToggleTable(tableDef.key)}
                              className={clsx(
                                'rounded-xl border p-3 flex items-center justify-between transition-all select-none',
                                count === 0
                                  ? 'opacity-40 border-white/5 bg-white/[0.01] cursor-not-allowed'
                                  : isSelected
                                  ? 'border-cyan-500/40 bg-cyan-950/30 cursor-pointer shadow-sm'
                                  : 'border-white/10 bg-white/[0.02] hover:border-white/20 cursor-pointer'
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {count > 0 ? (
                                  isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                                  ) : (
                                    <Square className="w-4 h-4 text-white/30 shrink-0" />
                                  )
                                ) : (
                                  <div className="w-4 h-4" />
                                )}
                                <span className="text-xs text-white font-medium truncate">
                                  {tableDef.label}
                                </span>
                              </div>

                              <span
                                className={clsx(
                                  'text-xs font-bold px-2 py-0.5 rounded-md font-mono shrink-0',
                                  count > 0
                                    ? isSelected
                                      ? 'bg-cyan-500/20 text-cyan-300'
                                      : 'bg-white/5 text-white/60'
                                    : 'text-white/20'
                                )}
                              >
                                {count.toLocaleString('ar-SA')}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* تحذير الأمان قبل التنفيذ */}
                      <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-950/20 p-3.5 text-xs text-amber-200/90">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-amber-300 block mb-0.5">ملاحظة أمان هامة:</strong>
                          تتم عملية الاسترداد باستخدام الدمج الذكي (Upsert) بناءً على المعرفات الفريدة، مما يعني إدراج السجلات الجديدة وتحديث السجلات القائمة دون مسح أي بيانات أخرى خارج الجداول المحددة.
                        </div>
                      </div>

                      {/* زر بدء الاسترداد */}
                      <div className="pt-2 flex justify-end">
                        <Button
                          disabled={selectedTables.length === 0}
                          onClick={() => setShowConfirmModal(true)}
                          className="px-6 gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-950/50"
                        >
                          <UploadCloud className="w-4 h-4" />
                          بدء استرداد النسخة الاحتياطية ({selectedTables.length} جدول)
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </HorizonCard>
          </div>
        )}

        {/* نافذة تأكيد الاسترداد لمنع الضغط بالخطأ */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl border border-white/15 bg-navy-900 p-6 shadow-2xl space-y-4 text-right">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-white">
                  تأكيد استرداد النسخة الاحتياطية
                </h3>
                <p className="text-xs text-[#A3AED0] leading-relaxed">
                  أنت على وشك استرداد وتحديث <strong>{selectedTables.length} جدول</strong> في قاعدة البيانات. هل ترغب في المتابعة؟
                </p>
              </div>

              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-xs text-white/70 space-y-1">
                <div className="flex justify-between">
                  <span>الملف:</span>
                  <strong className="text-white">{selectedFile?.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span>الجداول المختارة:</span>
                  <strong className="text-cyan-400">{selectedTables.length} جدول</strong>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 justify-center border-white/10 text-white/70 hover:text-white"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={() => void handleExecuteRestore()}
                  className="flex-1 justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  <Check className="w-4 h-4" />
                  نعم، ابدأ الاسترداد
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RolePageShell>
  );
}
