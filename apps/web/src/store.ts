// Current project + undo history. Persisted in the browser.
// shortcut: localStorage only (one project, one device); move to Supabase in the accounts step (MVP 8).
import type { Project } from 'engine';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const HISTORY = 100;

interface ProjectState {
  project: Project | null;
  past: Project[];
  setProject: (p: Project) => void;
  /** Applies a change; `record` = push an undo step first (false while dragging after the first move). */
  change: (recipe: (p: Project) => Project, record?: boolean) => void;
  undo: () => void;
}

export const useProject = create<ProjectState>()(persist((set, get) => ({
  project: null,
  past: [],
  setProject: project => set({ project, past: [] }),
  change: (recipe, record = true) => {
    const { project, past } = get();
    if (!project) return;
    set({ project: recipe(project), past: record ? [...past, project].slice(-HISTORY) : past });
  },
  undo: () => {
    const { past } = get();
    if (past.length) set({ project: past[past.length - 1], past: past.slice(0, -1) });
  },
}), { name: 'kroj-project', partialize: s => ({ project: s.project }) }));
