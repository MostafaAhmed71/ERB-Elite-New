import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import {
  saveSchoolSetting,
  type GradeClassCatalog,
} from '../../lib/schoolConfig';
import { fetchEffectiveGradeClassCatalog } from '../../lib/schoolClasses';
import { showSuccess, showError } from '../../lib/toast';

/** إعدادات المدير: الصفوف والفصول فقط — إعدادات البرنامج لرائد النشاط */
export function SchoolSettingsPage({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const [catalog, setCatalog] = useState<GradeClassCatalog>({ grades: [], classes: [] });
  const [newGrade, setNewGrade] = useState('');
  const [newClass, setNewClass] = useState('');

  const { isLoading } = useQuery({
    queryKey: ['school-settings', 'catalog'],
    queryFn: async () => {
      const effective = await fetchEffectiveGradeClassCatalog();
      const c: GradeClassCatalog = {
        grades: effective.grades,
        classes: effective.allClasses,
      };
      setCatalog(c);
      return c;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await saveSchoolSetting('grade_class_catalog', catalog);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-settings'] });
      showSuccess('تم حفظ قائمة الصفوف والفصول');
    },
    onError: (e: Error) => showError(e),
  });

  return (
    <div className="space-y-6" dir="rtl">
      {!embedded && (
        <PageHeader
          title="الإعدادات المدرسية"
          subtitle="إدارة قائمة الصفوف والفصول — إعدادات البرنامج (أوزان، قوالب، سياسة النقاط) من اختصاص رائد النشاط"
          icon={Settings}
          actions={
            <Button
              icon={<Save className="w-4 h-4" />}
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          }
        />
      )}

      {embedded && (
        <div className="flex justify-end">
          <Button
            icon={<Save className="w-4 h-4" />}
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            size="md"
          >
            {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="glass-card p-12 flex justify-center">
          <TapHandLoader label="جاري تحميل الإعدادات..." />
        </div>
      ) : (
        <div className="glass-card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-white/60 text-sm font-semibold">الصفوف</h4>
              {catalog.grades.map((g, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={g}
                    onChange={(e) => {
                      const grades = [...catalog.grades];
                      grades[i] = e.target.value;
                      setCatalog({ ...catalog, grades });
                    }}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCatalog({ ...catalog, grades: catalog.grades.filter((_, j) => j !== i) })
                    }
                    className="p-2 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  value={newGrade}
                  onChange={(e) => setNewGrade(e.target.value)}
                  placeholder="صف جديد..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (!newGrade.trim()) return;
                    setCatalog({ ...catalog, grades: [...catalog.grades, newGrade.trim()] });
                    setNewGrade('');
                  }}
                >
                  إضافة
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-white/60 text-sm font-semibold">الفصول</h4>
              {catalog.classes.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={c}
                    onChange={(e) => {
                      const classes = [...catalog.classes];
                      classes[i] = e.target.value;
                      setCatalog({ ...catalog, classes });
                    }}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCatalog({ ...catalog, classes: catalog.classes.filter((_, j) => j !== i) })
                    }
                    className="p-2 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  value={newClass}
                  onChange={(e) => setNewClass(e.target.value)}
                  placeholder="فصل جديد..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (!newClass.trim()) return;
                    setCatalog({ ...catalog, classes: [...catalog.classes, newClass.trim()] });
                    setNewClass('');
                  }}
                >
                  إضافة
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
