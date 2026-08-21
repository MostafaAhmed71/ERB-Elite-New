import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ParentChildState {
  selectedChildId: string | null;
  setSelectedChildId: (id: string | null) => void;
}

/** اختيار الابن يُحفظ محلياً ليستمر عبر الصفحات والجلسات */
export const useParentChildStore = create<ParentChildState>()(
  persist(
    (set) => ({
      selectedChildId: null,
      setSelectedChildId: (id) => set({ selectedChildId: id }),
    }),
    {
      name: 'erb-parent-child',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ selectedChildId: state.selectedChildId }),
    }
  )
);
