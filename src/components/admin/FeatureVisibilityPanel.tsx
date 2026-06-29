import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, RotateCcw, Save, Search } from 'lucide-react';
import clsx from 'clsx';
import type { UserRole } from '../../types';
import {
  ROLE_LABELS_AR,
  getFeatureCategoriesForRole,
  getFeaturesForRole,
} from '../../lib/featureCatalog';
import {
  fetchFeatureVisibility,
  saveFeatureVisibility,
  setFeatureHidden,
  resetRoleVisibility,
  hideAllForRole,
  showAllForRole,
  type FeatureVisibilityConfig,
} from '../../lib/featureVisibility';
import { Button } from '../ui/Button';
import { showSuccess, showError } from '../../lib/toast';

const ROLES: UserRole[] = [
  'activity_leader',
  'principal',
  'supervisor',
  'teacher',
  'student',
  'parent',
  'admin',
];

/** لوحة تحكم إظهار/إخفاء الميزات لكل دور */
export function FeatureVisibilityPanel() {
  const queryClient = useQueryClient();
  const [activeRole, setActiveRole] = useState<UserRole>('student');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<FeatureVisibilityConfig | null>(null);

  const { data: saved, isLoading } = useQuery({
    queryKey: ['feature-visibility'],
    queryFn: fetchFeatureVisibility,
  });

  const config = draft ?? saved ?? { hidden: {} };

  const saveMutation = useMutation({
    mutationFn: saveFeatureVisibility,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-visibility'] });
      setDraft(null);
      showSuccess('تم حفظ إعدادات الظهور');
    },
    onError: (e: Error) => showError(e),
  });

  const features = useMemo(() => {
    const list = getFeaturesForRole(activeRole);
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q),
    );
  }, [activeRole, search]);

  const categories = getFeatureCategoriesForRole(activeRole);

  const toggle = (id: string, locked?: boolean) => {
    if (locked) return;
    const hidden = !config.hidden[id];
    setDraft(setFeatureHidden(config, id, hidden));
  };

  if (isLoading) {
    return <p className="text-white/40 text-sm">جاري التحميل...</p>;
  }

  const hiddenCount = getFeaturesForRole(activeRole).filter(
    (f) => config.hidden[f.id] && !f.locked,
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <Eye className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-white font-semibold text-sm">التحكم في ظهور الميزات</h3>
          <p className="text-white/40 text-xs mt-0.5">
            اختر دوراً ثم فعّل/عطّل أي عنصر في القائمة أو اللوحة. التغيير فوري بعد الحفظ.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => {
              setActiveRole(r);
              setSearch('');
            }}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
              activeRole === r
                ? 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300'
                : 'border-white/10 text-white/50 hover:text-white/70',
            )}
          >
            {ROLE_LABELS_AR[r]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-white/30 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في الميزات..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pr-9 pl-3 py-2 text-white text-sm"
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          icon={<RotateCcw className="w-4 h-4" />}
          onClick={() => setDraft(showAllForRole(config, activeRole))}
        >
          إظهار الكل
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={<EyeOff className="w-4 h-4" />}
          onClick={() => setDraft(hideAllForRole(config, activeRole))}
        >
          إخفاء الكل
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setDraft(resetRoleVisibility(config, activeRole))}
        >
          إعادة تعيين الدور
        </Button>
      </div>

      <p className="text-white/30 text-xs">
        {ROLE_LABELS_AR[activeRole]}: {hiddenCount} عنصر مخفي من {getFeaturesForRole(activeRole).length}
      </p>

      <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-1">
        {categories.map((cat) => {
          const catFeatures = features.filter((f) => f.category === cat);
          if (catFeatures.length === 0) return null;
          return (
            <div key={cat} className="space-y-2">
              <h4 className="text-white/60 text-xs font-bold border-b border-white/5 pb-1">{cat}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {catFeatures.map((f) => {
                  const visible = !config.hidden[f.id];
                  return (
                    <label
                      key={f.id}
                      className={clsx(
                        'flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                        f.locked
                          ? 'opacity-60 cursor-not-allowed border-white/5 bg-white/[0.02]'
                          : visible
                            ? 'border-emerald-500/20 bg-emerald-500/5'
                            : 'border-white/5 bg-white/[0.02]',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{f.label}</p>
                        <p className="text-white/25 text-[10px] font-mono truncate">{f.id}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={visible}
                        disabled={f.locked}
                        onChange={() => toggle(f.id, f.locked)}
                        className="accent-emerald-400 shrink-0"
                        title={f.locked ? 'لا يمكن إخفاء إعدادات البرنامج' : undefined}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Button
        icon={<Save className="w-4 h-4" />}
        disabled={saveMutation.isPending || draft === null}
        onClick={() => saveMutation.mutate(config)}
      >
        {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ إعدادات الظهور'}
      </Button>
    </div>
  );
}
