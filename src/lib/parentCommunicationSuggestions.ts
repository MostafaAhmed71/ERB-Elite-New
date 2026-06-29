import type { AxisBreakdown } from './calculations';
import type { PointAxisKey } from './pointsReference';
import {
  computeAxisMonthComparison,
  type PointLedgerRow,
} from './parentProgressComparison';
import { summarizeAttendance } from './attendanceScore';

export type ParentSuggestion = {
  id: string;
  priority: number;
  icon: 'behavior' | 'initiative' | 'exam' | 'attendance' | 'activity' | 'general';
  title: string;
  message: string;
  actionHint?: string;
};

const AXIS_LABELS: Partial<Record<keyof AxisBreakdown, string>> = {
  activity: 'النشاط',
  behavior: 'السلوك',
  achievement: 'الإنجاز',
  initiative: 'المبادرة',
};

type BuildInput = {
  breakdown: AxisBreakdown;
  points: PointLedgerRow[];
  classAverage: number | null;
  totalPoints: number;
  attendanceRecords: Array<{ status: string }>;
  examScorePct: number | null;
  hasApprovedSuggestion: boolean;
};

function weakestAxis(breakdown: AxisBreakdown): keyof AxisBreakdown {
  const entries = Object.entries(breakdown) as [keyof AxisBreakdown, number][];
  return entries.sort((a, b) => a[1] - b[1])[0][0];
}

export function buildParentCommunicationSuggestions(input: BuildInput): ParentSuggestion[] {
  const suggestions: ParentSuggestion[] = [];
  const weak = weakestAxis(input.breakdown);
  const comparisons = computeAxisMonthComparison(input.points);
  const behaviorTrend = comparisons.find((c) => c.axis === 'behavior');
  const att = summarizeAttendance(
    input.attendanceRecords.map((r) => ({
      status: r.status as 'present' | 'absent' | 'late',
    })),
  );

  if (weak === 'initiative' && input.breakdown.initiative < 40 && !input.hasApprovedSuggestion) {
    suggestions.push({
      id: 'initiative-suggest',
      priority: 1,
      icon: 'initiative',
      title: 'عزّز المبادرة',
      message: 'ابنك ضعيف في محور المبادرة مقارنة بباقي المحاور.',
      actionHint: 'شجّعه على اقتراح نشاط مدرسي من لوحته — يمكنه التصويت على أفكار زملائه أيضاً.',
    });
  }

  if (behaviorTrend && behaviorTrend.delta < 0 && behaviorTrend.currentMonth > 0) {
    suggestions.push({
      id: 'behavior-decline',
      priority: 2,
      icon: 'behavior',
      title: 'متابعة السلوك',
      message: `انخفضت نقاط السلوك هذا الشهر (${behaviorTrend.delta} نقطة) مقارنة بالشهر الماضي.`,
      actionHint: 'ناقش معه التزامه في الحصة والهدوء — يمكنك التواصل مع المعلم إن استمر الانخفاض.',
    });
  } else if (behaviorTrend && behaviorTrend.delta > 0) {
    suggestions.push({
      id: 'behavior-up',
      priority: 5,
      icon: 'behavior',
      title: 'تحسّن في السلوك',
      message: `تحسّن في السلوك هذا الشهر (+${behaviorTrend.delta} نقطة) — عبّر عن فخرك وتشجيعك.`,
    });
  }

  if (weak === 'behavior' && input.breakdown.behavior < 50) {
    suggestions.push({
      id: 'behavior-low',
      priority: 3,
      icon: 'behavior',
      title: 'دعم السلوك الإيجابي',
      message: `محور ${AXIS_LABELS.behavior} أضعف محاور ابنك حالياً.`,
      actionHint: 'راجع معه قواعد الفصل والالتزام بالزي والاحترام — نقطة يومية تُحدث فرقاً.',
    });
  }

  if (input.examScorePct != null && input.examScorePct < 60) {
    suggestions.push({
      id: 'exam-weak',
      priority: 2,
      icon: 'exam',
      title: 'مراجعة دراسية',
      message: `آخر اختبار ${input.examScorePct}% — يحتاج مراجعة في البيت.`,
      actionHint: 'خصّص 20 دقيقة يومياً للمراجعة — وضع التحضير في المنصة يركز على نقاط الضعف.',
    });
  }

  if (att.ratePct < 85 && att.total >= 5) {
    suggestions.push({
      id: 'attendance',
      priority: 1,
      icon: 'attendance',
      title: 'انتباه للحضور',
      message: `نسبة الحضور ${att.ratePct}% — أقل من المستوى المتوقع.`,
      actionHint: 'تأكد من الانتظام في المواعيد — تواصل مع المدرسة عند الغياب المتكرر.',
    });
  }

  if (
    input.classAverage != null &&
    input.totalPoints < input.classAverage * 0.7 &&
    input.totalPoints > 0
  ) {
    suggestions.push({
      id: 'below-class',
      priority: 4,
      icon: 'activity',
      title: 'دعم عام',
      message: 'إجمالي نقاط ابنك أقل من متوسط فصله — يحتاج تشجيعاً مستمراً.',
      actionHint: `ركّز على محور ${AXIS_LABELS[weak] ?? weak} — اسأله عن أنشطة الفصل التي يمكن المشاركة فيها.`,
    });
  }

  if (weak === 'achievement' && input.breakdown.achievement < 45) {
    suggestions.push({
      id: 'achievement',
      priority: 3,
      icon: 'exam',
      title: 'تعزيز الإنجاز',
      message: 'محور الإنجاز يحتاج دعماً — الواجبات والمشاركة الصفية ترفع هذا المحور.',
      actionHint: 'تابع واجباته اليومية واسأل المعلم عن فرص إضافية.',
    });
  }

  if (suggestions.length === 0 && input.totalPoints > 0) {
    suggestions.push({
      id: 'stable',
      priority: 10,
      icon: 'general',
      title: 'أداء مستقر',
      message: 'ابنك يحافظ على مستوى جيد — استمر في المتابعة والتشجيع.',
      actionHint: 'راجع محفظة إنجازاته معه وشاركه فخرك بإنجازاته.',
    });
  }

  return suggestions.sort((a, b) => a.priority - b.priority).slice(0, 4);
}
