import fs from 'fs';
import path from 'path';

const base = 'e:/school_management_new/ERB Elite/src/pages';
const files = [
  ['academic/AcademicCommunicationPage.tsx', '6xl'],
  ['academic/AcademicCommunicationDetailPage.tsx', '2xl'],
  ['academic/AcademicReportDetailPage.tsx', '2xl'],
  ['academic/AcademicSchedulePage.tsx', '6xl'],
  ['academic/AcademicExportPage.tsx', '4xl'],
  ['academic/AcademicSearchPage.tsx', '4xl'],
  ['academic/AcademicExamReviewsPage.tsx', '6xl'],
  ['academic/AcademicLessonTopicsPage.tsx', '4xl'],
  ['academic/AcademicWeeklyPlansPage.tsx', '6xl'],
  ['principal/academic/PrincipalAcademicSubjectsPage.tsx', '4xl'],
  ['principal/academic/PrincipalAcademicSettingsPage.tsx', 'lg'],
  ['principal/academic/PrincipalAcademicAssignmentsPage.tsx', '4xl'],
  ['principal/academic/PrincipalAcademicStaffPage.tsx', '4xl'],
  ['principal/academic/PrincipalAcademicSectionsPage.tsx', 'md'],
  ['principal/academic/PrincipalAcademicMonitoringPage.tsx', '5xl'],
  ['parent/ParentAcademicObservationPage.tsx', 'lg'],
  ['parent/ParentAcademicReviewsPage.tsx', '6xl'],
];

for (const [rel, size] of files) {
  const fp = path.join(base, rel);
  let c = fs.readFileSync(fp, 'utf8');
  if (c.includes('AcademicLayout')) {
    console.log('skip', rel);
    continue;
  }
  const importMatch = c.match(/import \{([^}]+)\} from '([^']*AcademicUi)';/);
  if (!importMatch) {
    console.log('no import', rel);
    continue;
  }
  const items = importMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
  if (!items.includes('AcademicLayout')) items.unshift('AcademicLayout');
  c = c.replace(importMatch[0], `import { ${items.join(', ')} } from '${importMatch[2]}';`);
  c = c.replace(/<div className="p-4 md:p-6 max-w-[^"]+ mx-auto">/, `<AcademicLayout size="${size}">`);
  c = c.replace(/<div className="p-6 max-w-lg mx-auto[^"]*">/, `<AcademicLayout size="${size}">`);
  c = c.replace(/<div className="p-4 md:p-6 max-w-md mx-auto">/, `<AcademicLayout size="${size}">`);
  const marker = '    </div>\n  );\n}';
  const idx = c.lastIndexOf(marker);
  if (idx === -1) {
    console.log('no close', rel);
    continue;
  }
  c = c.slice(0, idx) + '    </AcademicLayout>\n  );\n}' + c.slice(idx + marker.length);
  fs.writeFileSync(fp, c);
  console.log('updated', rel);
}
