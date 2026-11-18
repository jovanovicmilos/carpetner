// Current project + undo/redo history. Persisted in the browser.
// shortcut: localStorage only (one project, one device); move to Supabase in the accounts step (MVP 8).
import { fromDataModel, type DataModelProject, type Project } from 'engine';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const HISTORY = 60; // docs/EDITOR_2D.md

interface ProjectState {
  project: Project | null;
  past: Project[];
  future: Project[];
  setProject: (p: Project) => void;
  /** Applies a change; `record` = push an undo step first (false while dragging after the first move). */
  change: (recipe: (p: Project) => Project, record?: boolean) => void;
  undo: () => void;
  redo: () => void;
}

export const useProject = create<ProjectState>()(persist((set, get) => ({
  project: null,
  past: [],
  future: [],
  setProject: project => set({ project, past: [], future: [] }),
  change: (recipe, record = true) => {
    const { project, past, future } = get();
    if (!project) return;
    set({ project: recipe(project), past: record ? [...past, project].slice(-HISTORY) : past, future: record ? [] : future });
  },
  undo: () => {
    const { past, project, future } = get();
    if (past.length && project) set({ project: past[past.length - 1], past: past.slice(0, -1), future: [project, ...future] });
  },
  redo: () => {
    const { past, project, future } = get();
    if (future.length && project) set({ project: future[0], past: [...past, project], future: future.slice(1) });
  },
}), {
  name: 'kroj-project',
  partialize: s => ({ project: s.project }),
  // A project in the docs/DATA_MODEL.md format (flat walls, e.g. the fixture) is converted on load.
  merge: (saved, current) => {
    const p = (saved as { project?: Project | DataModelProject | null })?.project;
    return { ...current, project: p && !('room' in p) ? fromDataModel(p) : (p as Project | null) ?? null };
  },
}));
