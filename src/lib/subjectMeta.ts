import type { LucideIcon } from 'lucide-react';
import {
  Calculator, FlaskConical, BookText, Languages, Moon, Globe,
  Monitor, Palette, Dumbbell, BookOpen,
} from 'lucide-react';
import { normalizeSubjectName } from './subjectSkillsCatalog';

export const SUBJECT_ICONS: Record<string, LucideIcon> = {
  'الرياضيات': Calculator,
  'العلوم': FlaskConical,
  'لغتي': BookText,
  'اللغة الإنجليزية': Languages,
  'الدراسات الإسلامية': Moon,
  'الدراسات الاجتماعية': Globe,
  'الحاسب الآلي': Monitor,
  'التربية الفنية': Palette,
  'التربية البدنية': Dumbbell,
};

export const SUBJECT_COLORS: Record<string, { bg: string; text: string }> = {
  'الرياضيات': { bg: 'bg-blue-500/15', text: 'text-blue-300' },
  'العلوم': { bg: 'bg-emerald-500/15', text: 'text-emerald-300' },
  'لغتي': { bg: 'bg-amber-500/15', text: 'text-amber-300' },
  'اللغة الإنجليزية': { bg: 'bg-indigo-500/15', text: 'text-indigo-300' },
  'الدراسات الإسلامية': { bg: 'bg-teal-500/15', text: 'text-teal-300' },
  'الدراسات الاجتماعية': { bg: 'bg-orange-500/15', text: 'text-orange-300' },
  'الحاسب الآلي': { bg: 'bg-cyan-500/15', text: 'text-cyan-300' },
  'التربية الفنية': { bg: 'bg-pink-500/15', text: 'text-pink-300' },
  'التربية البدنية': { bg: 'bg-lime-500/15', text: 'text-lime-300' },
};

export function getSubjectIcon(name: string): LucideIcon {
  const canonical = normalizeSubjectName(name);
  return SUBJECT_ICONS[canonical] ?? BookOpen;
}

export function getSubjectColorClasses(name: string) {
  const canonical = normalizeSubjectName(name);
  return SUBJECT_COLORS[canonical] ?? { bg: 'bg-cyan-500/15', text: 'text-cyan-300' };
}
