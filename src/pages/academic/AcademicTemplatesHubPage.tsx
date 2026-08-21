import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutTemplate, FileSpreadsheet, Sparkles, BookOpen, Upload, HelpCircle, Share2, Copy, Check,
} from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard, HorizonActionCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import { showSuccess } from '../../lib/toast';

/** L + X — مركز قوالب + تفضيل مشاركة رقمية */
export function AcademicTemplatesHubPage() {
  const [copied, setCopied] = useState(false);
  const parentPortal = `${typeof window !== 'undefined' ? window.location.origin : ''}/parent/academic`;

  const copyPortal = async () => {
    try {
      await navigator.clipboard.writeText(parentPortal);
      setCopied(true);
      showSuccess('نُسخ رابط بوابة ولي الأمر');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <RolePageShell>
      <PageHeader
        title="مركز القوالب الأكاديمية"
        subtitle="تصدير · قوالب AI · مشاركة رقمية أولاً — L / X"
        icon={LayoutTemplate}
      />

      <HorizonCard className="mb-4 border border-emerald-500/20 bg-emerald-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Share2 className="w-5 h-5 text-emerald-300 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">تفضيل رقمي (تقليل الورق)</p>
            <p className="text-xs text-surface-muted mt-1 leading-relaxed">
              شارك رابط البوابة مع ولي الأمر بدل الطباعة عند الإمكان. التصدير يبقى متاحاً للأرشفة الرسمية.
            </p>
            <p className="text-[10px] font-mono text-white/40 mt-1 truncate">{parentPortal}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => void copyPortal()}>
            {copied ? <Check className="w-3.5 h-3.5 ml-1" /> : <Copy className="w-3.5 h-3.5 ml-1" />}
            {copied ? 'تم النسخ' : 'نسخ رابط البوابة'}
          </Button>
        </div>
      </HorizonCard>

      <HorizonCard className="mb-4">
        <p className="text-sm text-surface-muted leading-relaxed">
          نجمّع مسارات التصدير، قوالب الذكاء المدرسية، وخطة الدرس دون إعادة بناء القوالب من الصفر.
        </p>
      </HorizonCard>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <HorizonActionCard
          to="/academic/export"
          label="التصدير الأكاديمي"
          description="ملفات رقمية أولاً — طباعة عند الحاجة فقط"
          icon={FileSpreadsheet}
          accent="gold"
        />
        <HorizonActionCard
          to="/academic/templates/editor"
          label="محرّر قوالب الرسائل"
          description="إنشاء وتعديل وحذف قوالب واتساب والتذكير"
          icon={LayoutTemplate}
          accent="gold"
        />
        <HorizonActionCard
          to="/principal/academic/export-templates"
          label="قوالب تخطيط التصدير"
          description="تخصيص هوامش وترويسة"
          icon={LayoutTemplate}
          accent="blue"
        />
        <HorizonActionCard
          to="/principal/ai-settings"
          label="قوالب مدرسة AI"
          description="قوالب تربوية رسمية للمعلمين (+ حذف)"
          icon={Sparkles}
          accent="purple"
        />
        <HorizonActionCard
          to="/teacher/lesson-plan"
          label="خطة الدرس"
          description="قوالب/مسودات المعلم"
          icon={BookOpen}
          accent="blue"
        />
        <HorizonActionCard
          to="/teacher/ai-assistant"
          label="مساعد التوليد"
          description="توليد ثم مشاركة رقمية"
          icon={Sparkles}
          accent="gold"
        />
        <HorizonActionCard
          to="/questions"
          label="مستودع الأسئلة"
          description="استيراد QTI / قوالب أسئلة"
          icon={HelpCircle}
          accent="purple"
        />
        <HorizonActionCard
          to="/principal/import-export"
          label="استيراد / تصدير"
          description="مركز البيانات المدرسية"
          icon={Upload}
          accent="gold"
        />
      </div>

      <p className="text-xs text-surface-muted mt-4">
        مسار ولي الأمر:{' '}
        <Link to="/parent/academic" className="text-gold-400 hover:underline">/parent/academic</Link>
      </p>
    </RolePageShell>
  );
}
