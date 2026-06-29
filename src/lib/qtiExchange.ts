import type { DbQuestion, QuestionType } from '../types';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mapTypeToQti(type: QuestionType): string {
  if (type === 'TF') return 'true_false';
  if (type === 'FILL_BLANK') return 'fill_in_the_blank';
  if (type === 'SHORT_ANSWER') return 'short_answer';
  return 'multiple_choice';
}

/** S10 — تصدير أسئلة بصيغة QTI 1.2 مبسّطة */
export function exportQuestionsToQti(
  questions: DbQuestion[],
  assessmentTitle: string,
): string {
  const items = questions
    .map((q, idx) => {
      const opts = Array.isArray(q.options) ? q.options : [];
      const responses =
        q.type === 'MCQ' || q.type === 'TF'
          ? opts
              .map(
                (o, i) =>
                  `<response_label ident="R${i}"><material><mattext texttype="text/plain">${escapeXml(String(o))}</mattext></material></response_label>`,
              )
              .join('')
          : '';

      return `
    <item ident="Q${idx + 1}" title="${escapeXml(q.sub_skill_label ?? `item-${idx + 1}`)}">
      <itemmetadata>
        <qtimetadata>
          <qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>${mapTypeToQti(q.type)}</fieldentry></qtimetadatafield>
          <qtimetadatafield><fieldlabel>difficulty</fieldlabel><fieldentry>${q.difficulty}</fieldentry></qtimetadatafield>
        </qtimetadata>
      </itemmetadata>
      <presentation>
        <material><mattext texttype="text/plain">${escapeXml(q.question_text)}</mattext></material>
        ${responses ? `<response_lid ident="RESPONSE"><render_choice>${responses}</render_choice></response_lid>` : ''}
      </presentation>
      <resprocessing>
        <respcondition continue="No">
          <conditionvar><varequal respident="RESPONSE">${escapeXml(q.correct_answer)}</varequal></conditionvar>
        </respcondition>
      </resprocessing>
    </item>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2">
  <assessment ident="ASSESS1" title="${escapeXml(assessmentTitle)}">
    <section ident="SEC1">${items}
    </section>
  </assessment>
</questestinterop>`;
}

export type QtiImportRow = {
  question_text: string;
  type: QuestionType;
  options: string[];
  correct_answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

/** S10 — استيراد QTI مبسّط (MCQ/TF من mattext) */
export function parseQtiXml(xml: string): QtiImportRow[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('ملف QTI غير صالح');
  }

  const items = doc.querySelectorAll('item');
  const rows: QtiImportRow[] = [];

  items.forEach((item) => {
    const questionText =
      item.querySelector('presentation material mattext')?.textContent?.trim() ?? '';
    if (!questionText) return;

    const options: string[] = [];
    item.querySelectorAll('response_label mattext').forEach((n) => {
      const t = n.textContent?.trim();
      if (t) options.push(t);
    });

    const correct =
      item.querySelector('varequal')?.textContent?.trim() ??
      options[0] ??
      'true';

    const qTypeMeta = item.querySelector('fieldentry')?.textContent ?? '';
    const type: QuestionType =
      qTypeMeta.includes('true_false') || options.length === 2 ? 'TF' : 'MCQ';

    rows.push({
      question_text: questionText,
      type,
      options: options.length ? options : ['true', 'false'],
      correct_answer: correct,
      difficulty: 'medium',
    });
  });

  return rows;
}

export function downloadQtiFile(xml: string, filename: string) {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
