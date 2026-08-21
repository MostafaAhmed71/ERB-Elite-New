import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Eye, RotateCcw, Save, LayoutTemplate, Type, Table2, Move } from 'lucide-react';
import toast from 'react-hot-toast';
import { academicConfigService } from '../../../lib/academic/adminService';
import {
  DEFAULT_EXPORT_TEMPLATE_LAYOUT,
  type AcademicExportTemplateLayout,
  type HomeworkTemplateLayout,
  type WeeklyPlanTemplateLayout,
} from '../../../lib/academic/exportTemplateConfig';
import {
  buildHomeworkHtml,
  buildWeeklyPlanHtml,
  sampleHomeworkGroup,
  sampleWeeklyPlanGroup,
  openSampleHomeworkPreview,
  openSampleWeeklyPlanPreview,
} from '../../../lib/academic/exportTemplates';
import { openHtmlPreview } from '../../../lib/academic/exportService';
import {
  ExportTemplateLivePreview,
  SettingsSection,
  SliderField,
  NumField,
  RectEditor,
} from '../../../components/academic/ExportTemplateLivePreview';
import {
  AcademicLayout,
  AcademicPageHeader,
  academicBtnPrimary,
  academicBtnSecondary,
} from '../../../components/academic/AcademicUi';

type Tab = 'homework' | 'weekly';

export function PrincipalAcademicExportTemplatesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('weekly');
  const [layout, setLayout] = useState<AcademicExportTemplateLayout>(DEFAULT_EXPORT_TEMPLATE_LAYOUT);
  const [saving, setSaving] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ['export-template-layout'],
    queryFn: async () => {
      const saved = await academicConfigService.getExportTemplateLayout();
      setLayout(saved);
      return saved;
    },
  });

  const patchHomework = (patch: Partial<HomeworkTemplateLayout>) => {
    setLayout((prev) => ({ ...prev, homework: { ...prev.homework, ...patch } }));
  };

  const patchWeekly = (patch: Partial<WeeklyPlanTemplateLayout>) => {
    setLayout((prev) => ({ ...prev, weeklyPlan: { ...prev.weeklyPlan, ...patch } }));
  };

  const previewHtml = useMemo(() => {
    if (tab === 'homework') return buildHomeworkHtml(sampleHomeworkGroup(), layout);
    return buildWeeklyPlanHtml(sampleWeeklyPlanGroup(), layout);
  }, [tab, layout]);

  const previewLabel = tab === 'homework'
    ? 'بيانات وهمية — 6 بطاقات واجبات'
    : 'بيانات وهمية — 5 أيام × 6 حصص (30 صف)';

  const save = async () => {
    setSaving(true);
    try {
      await academicConfigService.saveExportTemplateLayout(layout);
      qc.invalidateQueries({ queryKey: ['export-template-layout'] });
      toast.success('تم حفظ معايير القالب');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setLayout(DEFAULT_EXPORT_TEMPLATE_LAYOUT);
    toast('تمت استعادة القيم الافتراضية — اضغط حفظ لتطبيقها');
  };

  return (
    <AcademicLayout size="6xl">
      <AcademicPageHeader
        title="معايير قوالب التصدير"
        subtitle="تحكم كامل مع معاينة حية — ما تراه هنا = ما يُصدَّر PDF/PNG"
        backTo="/principal/academic"
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" className={academicBtnSecondary} onClick={reset}>
              <RotateCcw className="w-4 h-4 inline ml-1" />
              افتراضي
            </button>
            <button type="button" className={academicBtnSecondary} onClick={() => openHtmlPreview(previewHtml)}>
              <Eye className="w-4 h-4 inline ml-1" />
              نافذة كاملة
            </button>
            <button
              type="button"
              className={academicBtnSecondary}
              onClick={() =>
                tab === 'homework'
                  ? openSampleHomeworkPreview(layout)
                  : openSampleWeeklyPlanPreview(layout)
              }
            >
              <Eye className="w-4 h-4 inline ml-1" />
              {tab === 'homework' ? 'واجب وهمي' : 'خطة وهمية'}
            </button>
            <button type="button" className={academicBtnPrimary} onClick={save} disabled={saving}>
              <Save className="w-4 h-4 inline ml-1" />
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        }
      />

      <div className="flex gap-2 mb-4">
        {([
          ['homework', 'قالب الواجبات'],
          ['weekly', 'قالب الخطة الأسبوعية'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
              tab === id ? 'bg-gold-500 text-navy-950' : 'bg-white/10 text-white hover:bg-white/15',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-[#A3AED0] text-center py-8">جاري التحميل...</p>
      ) : (
        <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(300px,420px)] gap-5 items-start">
          {/* ─── إعدادات ─── */}
          <div className="space-y-3 max-h-[calc(100vh-10rem)] overflow-y-auto pr-1">
            {tab === 'homework' ? (
              <>
                <SettingsSection title="موقع العنوان الفرعي" icon={<Move className="w-4 h-4 text-gold-400" />}>
                  <RectEditor
                    showBottom={false}
                    rect={layout.homework.subtitle}
                    onChange={(p) => patchHomework({ subtitle: { ...layout.homework.subtitle, ...p } })}
                  />
                  <SliderField
                    label="حجم خط العنوان الفرعي"
                    value={layout.homework.subtitle.fontSize}
                    onChange={(v) => patchHomework({ subtitle: { ...layout.homework.subtitle, fontSize: v } })}
                    min={9}
                    max={20}
                    step={0.5}
                  />
                </SettingsSection>

                <SettingsSection title="موقع شبكة البطاقات" icon={<Move className="w-4 h-4 text-sky-400" />}>
                  <RectEditor
                    rect={layout.homework.content}
                    onChange={(p) => patchHomework({ content: { ...layout.homework.content, ...p } })}
                  />
                </SettingsSection>

                <SettingsSection title="شبكة البطاقات" icon={<LayoutTemplate className="w-4 h-4 text-gold-400" />}>
                  <NumField
                    label="عدد الأعمدة"
                    value={layout.homework.grid.columns}
                    onChange={(v) => patchHomework({ grid: { ...layout.homework.grid, columns: Math.max(1, Math.min(3, v)) } })}
                    min={1}
                    max={3}
                  />
                  <SliderField
                    label="المسافة العمودية بين البطاقات (فوق / تحت)"
                    value={layout.homework.grid.rowGap}
                    onChange={(v) => patchHomework({ grid: { ...layout.homework.grid, rowGap: v } })}
                    min={0}
                    max={48}
                    step={1}
                  />
                  <SliderField
                    label="المسافة الأفقية بين البطاقات (يمين / يسار)"
                    value={layout.homework.grid.columnGap}
                    onChange={(v) => patchHomework({ grid: { ...layout.homework.grid, columnGap: v } })}
                    min={0}
                    max={48}
                    step={1}
                  />
                  <p className="text-[#A3AED0] text-[11px]">
                    زِد المسافة إذا تلامست البطاقات — قلّلها لملء القالب. التغيير يظهر فوراً في المعاينة.
                  </p>
                  <SliderField
                    label="ارتفاع البطاقة"
                    value={layout.homework.card.height}
                    onChange={(v) => patchHomework({ card: { ...layout.homework.card, height: v } })}
                    min={72}
                    max={200}
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <NumField label="ارتفاع البطاقة الفارغة" value={layout.homework.card.emptyHeight} onChange={(v) => patchHomework({ card: { ...layout.homework.card, emptyHeight: v } })} min={48} max={160} />
                    <NumField label="حشو داخل البطاقة" value={layout.homework.card.bodyPadding} onChange={(v) => patchHomework({ card: { ...layout.homework.card, bodyPadding: v } })} min={2} max={16} />
                    <NumField label="دائرة رقم الحصة" value={layout.homework.card.periodSize} onChange={(v) => patchHomework({ card: { ...layout.homework.card, periodSize: v } })} min={14} max={40} />
                    <NumField label="حشو شريط الواجب" value={layout.homework.card.barPadding} onChange={(v) => patchHomework({ card: { ...layout.homework.card, barPadding: v } })} min={2} max={14} />
                  </div>
                </SettingsSection>

                <SettingsSection title="خطوط البطاقة" icon={<Type className="w-4 h-4 text-purple-400" />}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {([
                      ['subject', 'المادة'],
                      ['topic', 'الموضوع / الدرس'],
                      ['homeworkText', 'نص الواجب'],
                      ['teacher', 'اسم المعلم'],
                      ['detail', 'رقم الصفحة'],
                      ['bar', 'عنوان «الواجب»'],
                    ] as const).map(([key, label]) => (
                      <NumField
                        key={key}
                        label={`خط ${label}`}
                        value={layout.homework.fonts[key]}
                        onChange={(v) => patchHomework({ fonts: { ...layout.homework.fonts, [key]: v } })}
                        min={7}
                        max={22}
                        step={0.5}
                      />
                    ))}
                  </div>
                </SettingsSection>
              </>
            ) : (
              <>
                <SettingsSection title="موقع معلومات الصف والأسبوع" icon={<Move className="w-4 h-4 text-gold-400" />}>
                  <RectEditor
                    showBottom={false}
                    rect={layout.weeklyPlan.meta}
                    onChange={(p) => patchWeekly({ meta: { ...layout.weeklyPlan.meta, ...p } })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <SliderField label="خط سطر الصف" value={layout.weeklyPlan.meta.classFontSize} onChange={(v) => patchWeekly({ meta: { ...layout.weeklyPlan.meta, classFontSize: v } })} min={9} max={18} step={0.5} />
                    <SliderField label="خط سطر الأسبوع" value={layout.weeklyPlan.meta.weekFontSize} onChange={(v) => patchWeekly({ meta: { ...layout.weeklyPlan.meta, weekFontSize: v } })} min={9} max={20} step={0.5} />
                  </div>
                </SettingsSection>

                <SettingsSection title="موقع الجدول على القالب" icon={<Move className="w-4 h-4 text-emerald-400" />}>
                  <RectEditor
                    rect={layout.weeklyPlan.content}
                    onChange={(p) => patchWeekly({ content: { ...layout.weeklyPlan.content, ...p } })}
                  />
                  <p className="text-[#A3AED0] text-[11px]">زِد «أسفل» إذا تداخل الجدول مع توقيع المدير في أسفل القالب.</p>
                </SettingsSection>

                <SettingsSection title="أعمدة الجدول" icon={<Table2 className="w-4 h-4 text-sky-400" />}>
                  <SliderField label="عرض عمود اليوم" value={layout.weeklyPlan.table.dayColWidth} onChange={(v) => patchWeekly({ table: { ...layout.weeklyPlan.table, dayColWidth: v } })} min={40} max={100} />
                  <SliderField label="عرض عمود الحصة" value={layout.weeklyPlan.table.periodColWidth} onChange={(v) => patchWeekly({ table: { ...layout.weeklyPlan.table, periodColWidth: v } })} min={50} max={140} />
                  <SliderField label="عرض عمود المادة" value={layout.weeklyPlan.table.subjectColWidth} onChange={(v) => patchWeekly({ table: { ...layout.weeklyPlan.table, subjectColWidth: v } })} min={70} max={180} />
                  <p className="text-[#A3AED0] text-[11px]">عمود «الدرس» يأخذ المساحة المتبقية تلقائياً.</p>
                </SettingsSection>

                <SettingsSection title="خطوط وحجم صفوف الجدول" icon={<Type className="w-4 h-4 text-purple-400" />}>
                  <SliderField label="خط محتوى الجدول" value={layout.weeklyPlan.table.fontSize} onChange={(v) => patchWeekly({ table: { ...layout.weeklyPlan.table, fontSize: v } })} min={9} max={14} step={0.5} />
                  <SliderField label="خط رأس الجدول" value={layout.weeklyPlan.table.headerFontSize} onChange={(v) => patchWeekly({ table: { ...layout.weeklyPlan.table, headerFontSize: v } })} min={9} max={16} step={0.5} />
                  <div className="grid grid-cols-2 gap-3">
                    <NumField label="حشو الخلايا" value={layout.weeklyPlan.table.cellPadding} onChange={(v) => patchWeekly({ table: { ...layout.weeklyPlan.table, cellPadding: v } })} min={1} max={10} />
                    <NumField label="ارتفاع الصف (0=تلقائي)" value={layout.weeklyPlan.table.rowHeight} onChange={(v) => patchWeekly({ table: { ...layout.weeklyPlan.table, rowHeight: v } })} min={0} max={40} />
                    <NumField label="ارتفاع الرأس (0=تلقائي)" value={layout.weeklyPlan.table.headerHeight} onChange={(v) => patchWeekly({ table: { ...layout.weeklyPlan.table, headerHeight: v } })} min={0} max={40} />
                  </div>
                </SettingsSection>
              </>
            )}
          </div>

          {/* ─── معاينة حية ─── */}
          <ExportTemplateLivePreview
            html={previewHtml}
            label={previewLabel}
            onOpenFullscreen={() => openHtmlPreview(previewHtml)}
          />
        </div>
      )}
    </AcademicLayout>
  );
}
