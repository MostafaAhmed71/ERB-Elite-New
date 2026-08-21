export interface TemplateRect {
  top: number;
  left: number;
  right: number;
  bottom?: number;
}

export interface HomeworkTemplateLayout {
  subtitle: TemplateRect & { fontSize: number };
  content: TemplateRect;
  grid: { gap: number; rowGap: number; columnGap: number; columns: number };
  card: {
    /** ارتفاع البطاقة المملوءة (px) */
    height: number;
    emptyHeight: number;
    bodyPadding: number;
    periodSize: number;
    barPadding: number;
  };
  fonts: {
    subject: number;
    detail: number;
    bar: number;
    topic: number;
    homeworkText: number;
    teacher: number;
  };
}

export interface WeeklyPlanTemplateLayout {
  meta: TemplateRect & { classFontSize: number; weekFontSize: number };
  content: TemplateRect;
  table: {
    fontSize: number;
    headerFontSize: number;
    cellPadding: number;
    dayColWidth: number;
    periodColWidth: number;
    subjectColWidth: number;
    /** 0 = تلقائي حسب عدد الحصص */
    rowHeight: number;
    headerHeight: number;
  };
}

export interface AcademicExportTemplateLayout {
  version: number;
  homework: HomeworkTemplateLayout;
  weeklyPlan: WeeklyPlanTemplateLayout;
}

export const EXPORT_TEMPLATE_LAYOUT_KEY = 'export_template_layout';

export const DEFAULT_EXPORT_TEMPLATE_LAYOUT: AcademicExportTemplateLayout = {
  version: 1,
  homework: {
    subtitle: { top: 232, left: 62, right: 62, fontSize: 12 },
    content: { top: 254, left: 64, right: 64, bottom: 96 },
    grid: { gap: 7, rowGap: 7, columnGap: 7, columns: 2 },
    card: { height: 150, emptyHeight: 96, bodyPadding: 6, periodSize: 18, barPadding: 4 },
    fonts: { subject: 12.5, detail: 9, bar: 9, topic: 11.5, homeworkText: 10.5, teacher: 10.5 },
  },
  weeklyPlan: {
    meta: { top: 176, left: 62, right: 62, classFontSize: 12, weekFontSize: 13 },
    content: { top: 218, left: 64, right: 64, bottom: 118 },
    table: { fontSize: 10.5, headerFontSize: 11, cellPadding: 3, dayColWidth: 54, periodColWidth: 62, subjectColWidth: 102, rowHeight: 0, headerHeight: 0 },
  },
};

function mergeRect(base: TemplateRect, patch?: Partial<TemplateRect>): TemplateRect {
  return {
    top: patch?.top ?? base.top,
    left: patch?.left ?? base.left,
    right: patch?.right ?? base.right,
    bottom: patch?.bottom ?? base.bottom,
  };
}

export function mergeExportTemplateLayout(raw: unknown): AcademicExportTemplateLayout {
  const d = DEFAULT_EXPORT_TEMPLATE_LAYOUT;
  if (!raw || typeof raw !== 'object') return d;

  const o = raw as Partial<AcademicExportTemplateLayout>;
  const hw = (o.homework ?? {}) as Partial<HomeworkTemplateLayout>;
  const wp = (o.weeklyPlan ?? {}) as Partial<WeeklyPlanTemplateLayout>;

  return {
    version: typeof o.version === 'number' ? o.version : d.version,
    homework: {
      subtitle: {
        ...mergeRect(d.homework.subtitle, hw.subtitle),
        fontSize: hw.subtitle?.fontSize ?? d.homework.subtitle.fontSize,
      },
      content: mergeRect(d.homework.content, hw.content),
      grid: (() => {
        const fallbackGap = hw.grid?.gap ?? d.homework.grid.gap;
        return {
          gap: fallbackGap,
          rowGap: hw.grid?.rowGap ?? fallbackGap,
          columnGap: hw.grid?.columnGap ?? fallbackGap,
          columns: hw.grid?.columns ?? d.homework.grid.columns,
        };
      })(),
      card: {
        height:
          hw.card?.height
          ?? (hw.card as { maxHeight?: number })?.maxHeight
          ?? (hw.card as { minHeight?: number })?.minHeight
          ?? d.homework.card.height,
        emptyHeight:
          hw.card?.emptyHeight
          ?? (hw.card as { emptyMinHeight?: number })?.emptyMinHeight
          ?? d.homework.card.emptyHeight,
        bodyPadding: hw.card?.bodyPadding ?? d.homework.card.bodyPadding,
        periodSize: hw.card?.periodSize ?? d.homework.card.periodSize,
        barPadding: hw.card?.barPadding ?? d.homework.card.barPadding,
      },
      fonts: {
        subject: hw.fonts?.subject ?? d.homework.fonts.subject,
        detail: hw.fonts?.detail ?? d.homework.fonts.detail,
        bar: hw.fonts?.bar ?? d.homework.fonts.bar,
        topic: hw.fonts?.topic ?? d.homework.fonts.topic,
        homeworkText: hw.fonts?.homeworkText ?? hw.fonts?.bar ?? d.homework.fonts.homeworkText,
        teacher: hw.fonts?.teacher ?? d.homework.fonts.teacher,
      },
    },
    weeklyPlan: {
      meta: {
        ...mergeRect(d.weeklyPlan.meta, wp.meta),
        classFontSize: wp.meta?.classFontSize ?? d.weeklyPlan.meta.classFontSize,
        weekFontSize: wp.meta?.weekFontSize ?? d.weeklyPlan.meta.weekFontSize,
      },
      content: mergeRect(d.weeklyPlan.content, wp.content),
      table: {
        fontSize: wp.table?.fontSize ?? d.weeklyPlan.table.fontSize,
        headerFontSize: wp.table?.headerFontSize ?? d.weeklyPlan.table.headerFontSize,
        cellPadding: wp.table?.cellPadding ?? d.weeklyPlan.table.cellPadding,
        dayColWidth: wp.table?.dayColWidth ?? d.weeklyPlan.table.dayColWidth,
        periodColWidth: wp.table?.periodColWidth ?? d.weeklyPlan.table.periodColWidth,
        subjectColWidth: wp.table?.subjectColWidth ?? d.weeklyPlan.table.subjectColWidth,
        rowHeight: wp.table?.rowHeight ?? d.weeklyPlan.table.rowHeight,
        headerHeight: wp.table?.headerHeight ?? d.weeklyPlan.table.headerHeight,
      },
    },
  };
}
