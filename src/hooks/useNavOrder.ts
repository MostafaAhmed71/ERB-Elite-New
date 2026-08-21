import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NavItem, UserRole } from '../types';
import {
  applyNavOrder,
  clearNavOrder,
  loadNavOrder,
  moveNavPath,
  pathsFromItems,
  saveNavOrder,
} from '../lib/navOrder';

export function useNavOrder(
  userId: string | undefined,
  role: UserRole | null,
  baseItems: NavItem[],
) {
  const [order, setOrder] = useState<string[] | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!userId || !role) {
      setOrder(null);
      return;
    }
    setOrder(loadNavOrder(userId, role));
  }, [userId, role]);

  useEffect(() => {
    setEditMode(false);
  }, [role, userId]);

  const orderedItems = useMemo(
    () => applyNavOrder(baseItems, order),
    [baseItems, order],
  );

  const currentPaths = useMemo(
    () => (order?.length ? order : pathsFromItems(orderedItems)),
    [order, orderedItems],
  );

  const persist = useCallback(
    (paths: string[]) => {
      if (!userId || !role) return;
      setOrder(paths);
      saveNavOrder(userId, role, paths);
    },
    [userId, role],
  );

  const moveUp = useCallback(
    (index: number) => {
      const visiblePaths = pathsFromItems(orderedItems);
      const path = visiblePaths[index];
      if (!path) return;
      const idxInOrder = currentPaths.indexOf(path);
      if (idxInOrder < 0) return;
      persist(moveNavPath(currentPaths, idxInOrder, 'up'));
    },
    [currentPaths, orderedItems, persist],
  );

  const moveDown = useCallback(
    (index: number) => {
      const visiblePaths = pathsFromItems(orderedItems);
      const path = visiblePaths[index];
      if (!path) return;
      const idxInOrder = currentPaths.indexOf(path);
      if (idxInOrder < 0) return;
      persist(moveNavPath(currentPaths, idxInOrder, 'down'));
    },
    [currentPaths, orderedItems, persist],
  );

  const resetOrder = useCallback(() => {
    if (!userId || !role) return;
    clearNavOrder(userId, role);
    setOrder(null);
  }, [userId, role]);

  return {
    orderedItems,
    editMode,
    setEditMode,
    moveUp,
    moveDown,
    resetOrder,
    canReorder: baseItems.length > 1,
  };
}
