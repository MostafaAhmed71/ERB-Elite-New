import type { NavItem, UserRole } from '../types';

const STORAGE_PREFIX = 'erb_sidebar_nav_order';

export function navItemKey(item: NavItem): string {
  return item.path;
}

function storageKey(userId: string, role: UserRole): string {
  return `${STORAGE_PREFIX}_${userId}_${role}`;
}

export function loadNavOrder(userId: string, role: UserRole): string[] | null {
  try {
    const raw = localStorage.getItem(storageKey(userId, role));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : null;
  } catch {
    return null;
  }
}

export function saveNavOrder(userId: string, role: UserRole, paths: string[]): void {
  localStorage.setItem(storageKey(userId, role), JSON.stringify(paths));
}

export function clearNavOrder(userId: string, role: UserRole): void {
  localStorage.removeItem(storageKey(userId, role));
}

/** ترتيب العناصر حسب التفضيل — العناصر الجديدة تُلحق في النهاية */
export function applyNavOrder(items: NavItem[], savedOrder: string[] | null): NavItem[] {
  if (!savedOrder?.length) return items;

  const byPath = new Map(items.map((item) => [navItemKey(item), item]));
  const ordered: NavItem[] = [];

  for (const path of savedOrder) {
    const item = byPath.get(path);
    if (item) {
      ordered.push(item);
      byPath.delete(path);
    }
  }

  for (const item of items) {
    if (byPath.has(navItemKey(item))) {
      ordered.push(item);
    }
  }

  return ordered;
}

export function pathsFromItems(items: NavItem[]): string[] {
  return items.map(navItemKey);
}

export function moveNavPath(paths: string[], index: number, direction: 'up' | 'down'): string[] {
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= paths.length) return paths;
  const next = [...paths];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
