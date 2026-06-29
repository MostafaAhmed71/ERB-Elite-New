import { PLATFORM_NAME } from './branding';

export type OlympiadTemplate = {
  id: string;
  name: string;
  description: string;
  weights: {
    activity: number;
    behavior: number;
    achievement: number;
    initiative: number;
    attendance: number;
  };
  levels: { name: string; min: number }[];
};

export const OLYMPIAD_TEMPLATES: OlympiadTemplate[] = [
  {
    id: 'olympiad_1448',
    name: PLATFORM_NAME,
    description: 'القالب الافتراضي — نشاط 35%، سلوك 25%، إنجاز 15%، مبادرة 10%، حضور 15%',
    weights: { activity: 0.35, behavior: 0.25, achievement: 0.15, initiative: 0.1, attendance: 0.15 },
    levels: [
      { name: 'مبتدئ', min: 0 },
      { name: 'برونزي', min: 200 },
      { name: 'فضي', min: 400 },
      { name: 'ذهبي', min: 600 },
      { name: 'بلاتيني', min: 800 },
      { name: 'سفير النخبة', min: 1000 },
    ],
  },
  {
    id: 'tahseeli',
    name: 'تحصيلي',
    description: 'تركيز على الإنجاز الأكاديمي — 45% إنجاز، 10% حضور',
    weights: { activity: 0.15, behavior: 0.15, achievement: 0.45, initiative: 0.1, attendance: 0.15 },
    levels: [
      { name: 'أساسي', min: 0 },
      { name: 'متقدم', min: 300 },
      { name: 'متميز', min: 600 },
      { name: 'نخبة', min: 900 },
    ],
  },
  {
    id: 'mawhiba',
    name: 'موهبة',
    description: 'تركيز على المبادرة والنشاط — 30% مبادرة+نشاط، 10% حضور',
    weights: { activity: 0.3, behavior: 0.15, achievement: 0.2, initiative: 0.25, attendance: 0.1 },
    levels: [
      { name: 'مكتشف', min: 0 },
      { name: 'مبدع', min: 250 },
      { name: 'موهوب', min: 500 },
      { name: 'قائد', min: 800 },
    ],
  },
  {
    id: 'values',
    name: 'قيم',
    description: 'تركيز على السلوك والقيم — 40% سلوك، 15% حضور',
    weights: { activity: 0.2, behavior: 0.4, achievement: 0.15, initiative: 0.1, attendance: 0.15 },
    levels: [
      { name: 'ممارس', min: 0 },
      { name: 'ملتزم', min: 200 },
      { name: 'قدوة', min: 450 },
      { name: 'سفير قيم', min: 700 },
    ],
  },
];

export function getTemplateById(templateId: string): OlympiadTemplate | undefined {
  return OLYMPIAD_TEMPLATES.find((t) => t.id === templateId);
}
