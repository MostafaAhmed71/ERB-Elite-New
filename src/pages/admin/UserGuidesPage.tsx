import { useMemo, useState } from 'react';
import {
  BookOpen,
  Download,
  FileText,
  FileDown,
  Printer,
  Users,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { PageHeader, Panel, Button, SectionTitle } from '../../components/ui';
import {
  EXPORTABLE_GUIDE_ROLES,
  getUserRoleGuide,
  type UserRoleGuide,
} from '../../lib/userGuides';
import {
  downloadAllUserGuidesHtml,
  downloadAllUserGuidesPdf,
  downloadUserGuideHtml,
  downloadUserGuidePdf,
  printAllUserGuides,
  printUserGuide,
} from '../../lib/exportUserGuide';
import { ROLE_LABELS, type UserRole } from '../../types';
import { PLATFORM_NAME, USER_GUIDE_LETTERHEAD } from '../../lib/branding';

const ROLE_ICONS: Record<string, string> = {
  principal: '🏫',
  admin: '⭐',
  activity_leader: '🎯',
  supervisor: '📊',
  teacher: '👨‍🏫',
  student: '🎓',
  parent: '👨‍👩‍👧',
};

export function UserGuidesPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('teacher');
  const [expandedScreen, setExpandedScreen] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<string | null>(null);

  const guide = useMemo(() => getUserRoleGuide(selectedRole), [selectedRole]);

  const runExport = async (fn: () => Promise<void>, successMsg: string) => {
    setExporting(true);
    try {
      await fn();
      toast.success(successMsg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل التصدير');
    } finally {
      setExporting(false);
      setPdfProgress(null);
    }
  };

  const handlePrint = (g: UserRoleGuide) =>
    void runExport(
      () => printUserGuide(g),
      'جاري الطباعة — اختر A4، هوامش: بلا، والمقياس 100%'
    );

  const handleDownloadPdf = (g: UserRoleGuide) =>
    void runExport(async () => {
      setPdfProgress('جاري تجهيز PDF...');
      await downloadUserGuidePdf(g, (cur, total) => {
        setPdfProgress(`تصدير الصفحة ${cur} من ${total}...`);
      });
      setPdfProgress(null);
    }, 'تم تنزيل ملف PDF');

  const handleDownloadAllPdf = () =>
    void runExport(async () => {
      setPdfProgress('جاري تجهيز الدليل الشامل...');
      await downloadAllUserGuidesPdf((cur, total) => {
        setPdfProgress(`تصدير الصفحة ${cur} من ${total}...`);
      });
      setPdfProgress(null);
    }, 'تم تنزيل الدليل الشامل PDF');

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="أدلة المستخدم"
        subtitle="دليل منسّق لكل دور — للطباعة أو التوزيع على المعلمين والطلاب وأولياء الأمور"
        icon={BookOpen}
        guidePath="/admin/user-guides"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              loading={exporting}
              icon={exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              onClick={handleDownloadAllPdf}
            >
              {pdfProgress ?? 'تصدير PDF للكل'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={exporting}
              icon={<Download className="w-4 h-4" />}
              onClick={() =>
                void runExport(downloadAllUserGuidesHtml, 'تم تنزيل الدليل الشامل بالقالب الرسمي')
              }
            >
              تنزيل الكل (HTML)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={exporting}
              icon={<Printer className="w-4 h-4" />}
              onClick={() =>
                void runExport(printAllUserGuides, 'جاري فتح الدليل الشامل للطباعة')
              }
            >
              طباعة
            </Button>
          </div>
        }
      />

      <Panel className="p-5 border-gold-500/20 bg-gradient-to-l from-gold-500/5 to-transparent">
        <div className="flex flex-col lg:flex-row gap-5">
          <div className="flex-1 flex items-start gap-3">
            <FileText className="w-6 h-6 text-gold-400 shrink-0 mt-0.5" />
            <div className="text-sm text-white/70 space-y-2">
              <p>
                <strong className="text-white/90">دليل شامل</strong> — يشمل الحساب والأمان،
                المصطلحات، كل عناصر القائمة الجانبية، وشرح تفصيلي لكل شاشة (التبويبات والخطوات).
              </p>
              <p className="text-white/45 text-xs">
                التصدير الشامل قد يستغرق دقيقة حسب عدد الصفحات.
              </p>
              <p className="text-white/45 text-xs">{PLATFORM_NAME}</p>
            </div>
          </div>
          <div className="shrink-0 w-full lg:w-44">
            <p className="text-[10px] text-white/40 mb-1.5 text-center">معاينة القالب</p>
            <img
              src={USER_GUIDE_LETTERHEAD}
              alt="قالب دليل المستخدم"
              className="w-full rounded-lg border border-white/10 shadow-lg"
            />
          </div>
        </div>
      </Panel>

      <div className="flex flex-wrap gap-2">
        {EXPORTABLE_GUIDE_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setSelectedRole(role)}
            className={clsx(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all',
              selectedRole === role
                ? 'bg-gold-500/20 border-gold-500/40 text-gold-300'
                : 'bg-white/5 border-white/10 text-white/55 hover:text-white/80 hover:bg-white/8'
            )}
          >
            <span>{ROLE_ICONS[role] ?? '👤'}</span>
            {ROLE_LABELS[role]}
          </button>
        ))}
      </div>

      <Panel className="p-5 sm:p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-navy-800 border border-white/10 text-white/50">
              {guide.roleLabel}
            </span>
            <h2 className="text-xl font-bold text-white mt-2">{guide.title}</h2>
            <p className="text-white/50 text-sm mt-1">{guide.subtitle}</p>
            <p className="text-white/40 text-xs mt-2">
              {guide.sections.length} أقسام · {guide.screens.length} شاشة موثّقة · {guide.faq.length} سؤال شائع
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              loading={exporting}
              icon={exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              onClick={() => handleDownloadPdf(guide)}
            >
              {pdfProgress ?? 'تصدير PDF'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={exporting}
              icon={<Download className="w-4 h-4" />}
              onClick={() =>
                void runExport(() => downloadUserGuideHtml(guide), 'تم تنزيل ملف HTML بالقالب الرسمي')
              }
            >
              تنزيل HTML
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={exporting}
              icon={<Printer className="w-4 h-4" />}
              onClick={() => handlePrint(guide)}
            >
              طباعة
            </Button>
          </div>
        </div>

        <section>
          <SectionTitle icon={BookOpen}>نبذة</SectionTitle>
          <p className="text-white/70 text-sm leading-relaxed mt-3">{guide.introduction}</p>
        </section>

        <section>
          <SectionTitle icon={Users}>البدء السريع</SectionTitle>
          <ol className="mt-3 space-y-2 list-decimal list-inside text-sm text-white/65">
            {guide.gettingStarted.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>

        {guide.sections.map((section) => (
          <section key={section.title}>
            <SectionTitle>{section.title}</SectionTitle>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {section.items.map((item) => (
                <div
                  key={item.label}
                  className="p-4 rounded-xl bg-navy-900/50 border border-white/8"
                >
                  <h4 className="font-semibold text-white/90 text-sm">{item.label}</h4>
                  <p className="text-white/50 text-xs mt-1 leading-relaxed">{item.description}</p>
                  {item.steps && item.steps.length > 0 && (
                    <ol className="mt-2 space-y-1 list-decimal list-inside text-[11px] text-gold-400/80">
                      {item.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <section>
          <SectionTitle>الشاشات والمسارات ({guide.screens.length})</SectionTitle>
          <div className="mt-3 space-y-2">
            {guide.screens.map((screen) => {
              const open = expandedScreen === screen.path;
              return (
                <div
                  key={screen.path + screen.label}
                  className="rounded-xl border border-white/8 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedScreen(open ? null : screen.path)}
                    className="w-full flex items-center justify-between gap-3 p-4 text-right hover:bg-white/5 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white/90 text-sm">{screen.label}</p>
                      <code className="text-[11px] text-gold-400/70" dir="ltr">
                        {screen.path}
                      </code>
                    </div>
                    {open ? (
                      <ChevronUp className="w-4 h-4 text-white/40 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />
                    )}
                  </button>
                  {open && (
                    <div className="px-4 pb-4 border-t border-white/8 pt-3 space-y-2">
                      <p className="text-xs text-white/55">{screen.summary}</p>
                      <ul className="text-xs text-white/65 space-y-1 list-disc list-inside">
                        {screen.howTo.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {guide.faq.length > 0 && (
          <section>
            <SectionTitle>أسئلة شائعة</SectionTitle>
            <div className="mt-3 space-y-2">
              {guide.faq.map((f) => (
                <div key={f.question} className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
                  <p className="text-sm font-semibold text-white/85">س: {f.question}</p>
                  <p className="text-xs text-white/55 mt-1">ج: {f.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {guide.tips.length > 0 && (
          <section>
            <SectionTitle>نصائح</SectionTitle>
            <ul className="mt-3 space-y-1.5 text-sm text-white/60 list-disc list-inside">
              {guide.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </section>
        )}
      </Panel>
    </div>
  );
}
