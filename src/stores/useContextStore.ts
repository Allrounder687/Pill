import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface ActiveApp {
  name: string;
  title: string;
  exe_path: string;
}

interface ContextState {
  snapshot: {
    active_app: ActiveApp | null;
    clipboard: string | null;
    recent_files: string[];
    meeting_status: string;
    time: string;
  } | null;
  isLoading: boolean;
  refreshSnapshot: () => Promise<void>;
  captureSelection: () => Promise<string>;
}

export const useContextStore = create<ContextState>((set) => ({
  snapshot: null,
  isLoading: false,
  refreshSnapshot: async () => {
    set({ isLoading: true });
    try {
      const snapshot = await invoke<any>('get_context_snapshot');
      set({ snapshot, isLoading: false });
    } catch (err) {
      console.error('[ContextStore] Failed to refresh snapshot:', err);
      set({ isLoading: false });
    }
  },
  captureSelection: async () => {
    try {
      return await invoke<string>('capture_selected_text');
    } catch (err) {
      console.error('[ContextStore] Failed to capture selection:', err);
      return '';
    }
  }
}));
