import { useState, useEffect, useCallback } from 'react';
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
  type SystemBackupPayload,
} from '../../lib/systemBackupService';

interface TableStat {
  label: string;
  count: number;
  icon: typeof Users;
  color: string;
}

export function AdminBackupPage() {
  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState<TableStat[]>([]);
  const [backingUp, setBackingUp] = useState(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [backupData, setBackupData] = useState<SystemBackupPayload | null>(null);
  const [lastExportTime, setLastExportTime] = useState<string | null>(() => {
    return localStorage.getItem('erb_last_backup_time');
  });

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
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('points_ledger').select('*', { count: 'exact', head: true }),
        supabase.from('managed_account_credentials').select('*', { count: 'exact', head: true }),
        supabase.from('lesson_plans').select('*', { count: 'exact', head: true }),
        supabase.from('academic_homeworks').select('*', { count: 'exact', head: true }),
        supabase.from('academic_teacher_schedules').select('*', { count: 'exact', head: true }),
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
          label: 'الحسابات المعتمدة والمولدة',
          count: credentialsRes.count ?? 0,
          icon: KeyRound,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        },
        {
          label: 'الخطط الدراسية',
          count: plansRes.count ?? 0,
          icon: BookOpen,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        },
        {
          label: 'الواجبات اليومية',
          count: homeworksRes.count ?? 0,
          icon: Layers,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        },
        {
          label: 'الحصص والجداول',
          count: schedulesRes.count ?? 0,
          icon: Calendar,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
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

  const handleStartBackup = async (targetFormat: 'excel' | 'json') => {
    setBackingUp(true);
    setProgressPercent(5);
    setProgressStep('بدء فحص الاتصال بقاعدة البيانات...');

    try {
      const data = await fetchCompleteSystemBackup((step, percent) => {
        setProgressStep(step);
        setProgressPercent(percent);
      });

      setBackupData(data);
      const nowStr = new Date().toLocaleString('ar-SA');
      setLastExportTime(nowStr);
      localStorage.setItem('erb_last_backup_time', nowStr);

      if (targetFormat === 'excel') {
        downloadBackupAsExcel(data);
        toast.success('تم تنزيل النسخة الاحتياطية بنجاح كملف Excel شامل!');
      } else {
        downloadBackupAsJson(data);
        toast.success('تم تنزيل النسخة الاحتياطية بنجاح كملف JSON كامل!');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل سحب النسخة الاحتياطية');
    } finally {
      setBackingUp(false);
      setProgressPercent(0);
      setProgressStep('');
    }
  };

  return (
    <RolePageShell>
      <div className="space-y-6" dir="rtl">
        <PageHeader
          title="النسخ الاحتياطي الشامل للبيانات"
          subtitle="تصدير وأرشفة كامل بيانات المنصة (النقاط، الحسابات، الخطط، الواجبات، الجداول الدراسية)"
          icon={Database}
        />

        {/* تنبيه الأمان والموثوقية */}
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-950/30 p-4 text-emerald-200">
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed space-y-1">
            <p className="font-bold text-emerald-300 text-sm">
              نسخ احتياطي شامل متكامل وآمن 100%
            </p>
            <p className="text-emerald-200/80">
              تتيح لك هذه الأداة سحب لقطة حية لجميع بيانات المدرسة وتنزيلها بصيغة ملف <strong>Excel تفصيلي (.xlsx)</strong> يضم صفحات مخصصة لكل جدول، أو بصيغة <strong>JSON مهيكل</strong> لحفظها خارجياً أو استرجاعها في أي وقت.
            </p>
          </div>
        </div>

        {/* بطاقات الإحصائيات السريعة */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={clsx(
                  'rounded-2xl border p-3.5 flex flex-col justify-between transition-all bg-navy-900/60',
                  item.color.split(' ')[2] || 'border-white/10'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-[#A3AED0] line-clamp-1">{item.label}</span>
                  <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center', item.color)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-lg font-black text-white">
                  {loadingStats ? <Loader2 className="w-4 h-4 animate-spin text-white/40" /> : item.count.toLocaleString('ar-SA')}
                </div>
              </div>
            );
          })}
        </div>

        {/* إجراءات التصدير الرئيسية */}
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
              <span className="text-xs px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-white/70">
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
                  {progressStep}
                </span>
                <span className="font-mono text-cyan-400 font-bold">{progressPercent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-navy-950">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
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
                  يحتوي على ورقة عمل مخصصة لكل جدول (الطلاب، سجل النقاط، الخطط الدراسية، الواجبات، الجداول الدراسية، الحسابات المولدة). مثالي للمراجعة والطباعة والبحث السريع.
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
                  نسخة تقنية كاملة مهيكلة (.json)
                </h4>
                <p className="text-xs text-[#A3AED0] leading-relaxed">
                  نسخة طبق الأصل بجميع الحقول والمفتاح الفريدة لكافة الجداول والإعدادات في ملف بيانات مهيكل. مثالي للأرشفة الرقمية والاحتفاظ بالنسخ الاحتياطية خارج السيرفر.
                </p>
              </div>
              <Button
                variant="secondary"
                disabled={backingUp}
                onClick={() => void handleStartBackup('json')}
                className="w-full justify-center gap-2 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
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
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="font-semibold text-white block">1. الطلاب والصفوف</span>
              <p className="text-[#A3AED0]">الأسماء، أرقام القيد، الصفوف، الفصول، ومجموع النقاط.</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="font-semibold text-white block">2. سجل النقاط والأنشطة</span>
              <p className="text-[#A3AED0]">كامل حركات المنح، المحاور، الأسباب، والمعلمين المانحين.</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="font-semibold text-white block">3. الخطط والتحاضير</span>
              <p className="text-[#A3AED0]">الخطط اليومية، الأهداف، الإجراءات، والخطط الأسبوعية.</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="font-semibold text-white block">4. الواجبات والمراجعات</span>
              <p className="text-[#A3AED0]">الواجبات المدرسية المرفوعة ومراجعات الاختبارات.</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="font-semibold text-white block">5. الجداول وإسناد المواد</span>
              <p className="text-[#A3AED0]">توزيع الحصص الأسبوعية وإسناد المعلمين للفصول.</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="font-semibold text-white block">6. الحسابات والمستخدمين</span>
              <p className="text-[#A3AED0]">بيانات الدخول للطلاب وأولياء الأمور وكلمات المرور.</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="font-semibold text-white block">7. الحضور والغياب</span>
              <p className="text-[#A3AED0]">جلسات الرصد اليومية وإحصائيات الغياب والحضور.</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="font-semibold text-white block">8. إعدادات المدرسة</span>
              <p className="text-[#A3AED0]">أوزان محاور التميز، المستويات، وكتالوج المواد.</p>
            </div>
          </div>
        </HorizonCard>
      </div>
    </RolePageShell>
  );
}
