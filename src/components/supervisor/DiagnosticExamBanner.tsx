import { Link } from 'react-router-dom';
import { LineChart } from 'lucide-react';
import { EXAM_TYPE_LABELS } from '../../lib/examAnalytics';

export function DiagnosticExamBanner() {
  return (
    <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-2" dir="rtl">
      <p className="text-white text-sm font-medium flex items-center gap-2">
        <LineChart className="w-4 h-4 text-purple-400" />
        اختبار تشخيصي مقابل تحصيلي (S3)
      </p>
      <p className="text-white/45 text-xs leading-relaxed">
        <strong className="text-purple-300">{EXAM_TYPE_LABELS.diagnostic}</strong> في بداية الفصل لقياس
        المستوى — <strong className="text-purple-300">{EXAM_TYPE_LABELS.summative}</strong> في نهايته
        لقياس النمو. يظهر الفرق في{' '}
        <Link to="/analytics/class" className="text-gold-400 hover:underline">
          تقرير النمو
        </Link>
        .
      </p>
    </div>
  );
}
