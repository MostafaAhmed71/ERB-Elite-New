import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TeacherAppMode } from '../lib/teacherMode';

interface TeacherModeStore {
  mode: TeacherAppMode;
  hydrated: boolean;
  setMode: (mode: TeacherAppMode) => void;
  setHydrated: (value: boolean) => void;
}

export const useTeacherModeStore = create<TeacherModeStore>()(
  persist(
    (set) => ({
      mode: 'olympiad',
      hydrated: false,
      setMode: (mode) => set({ mode }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'erb_teacher_app_mode',
      partialize: (s) => ({ mode: s.mode }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
