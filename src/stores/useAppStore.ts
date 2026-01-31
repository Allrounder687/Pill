import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { emit } from '@tauri-apps/api/event';

interface AppState {
  // Palette Visibility
  isPaletteVisible: boolean;
  setPaletteVisible: (visible: boolean, sync?: boolean) => void;
  togglePalette: () => void;
  
  // Last Command
  lastCommand: string | null;
  setLastCommand: (cmd: string) => void;
  
  // App Discovery
  installedApps: any[];
  setInstalledApps: (apps: any[]) => void;
  refreshApps: () => Promise<void>;
  
  // Voice & AI
  selectedVoice: string;
  setSelectedVoice: (voice: string) => void;
  voiceSpeed: number;
  setVoiceSpeed: (speed: number) => void;

  // General Settings
  followSystemAppearance: boolean;
  setFollowSystemAppearance: (value: boolean) => void;
  openAtLogin: boolean;
  setOpenAtLogin: (value: boolean) => void;
  showInSystemTray: boolean;
  setShowInSystemTray: (value: boolean) => void;
  windowMode: 'compact' | 'expanded';
  setWindowMode: (mode: 'compact' | 'expanded') => void;

  // Shortcuts
  shortcutSummon: string;
  setShortcutSummon: (shortcut: string) => void;
  shortcutPTT: string;
  setShortcutPTT: (shortcut: string) => void;

  // Global Audio/Mic State
  isSTTActive: boolean;
  setSTTActive: (active: boolean) => void;
  wakeWordDetected: boolean;
  setWakeWordDetected: (detected: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isPaletteVisible: true,
      setPaletteVisible: (visible, sync = true) => {
        set({ isPaletteVisible: visible });
        if (sync) {
          emit('sync-palette-visibility', visible).catch(console.error);
        }
      },
      togglePalette: () => {
        const newVisible = !get().isPaletteVisible;
        get().setPaletteVisible(newVisible);
      },
      lastCommand: null,
      setLastCommand: (cmd) => set({ lastCommand: cmd }),
      
      // App Discovery
      installedApps: [],
      setInstalledApps: (apps) => set({ installedApps: apps }),
      refreshApps: async () => {
        const { invoke } = await import('@tauri-apps/api/core');
        try {
          const apps = await invoke<any[]>('get_apps');
          set({ installedApps: apps });

          // Background fetch icons
          apps.forEach(async (app, idx) => {
             try {
                const iconUrl = await invoke<string>('get_app_icon', { path: app.path });
                set(state => {
                  const newApps = [...state.installedApps];
                  if (newApps[idx]) {
                    newApps[idx] = { ...newApps[idx], iconUrl };
                  }
                  return { installedApps: newApps };
                });
             } catch (e) {
                // Ignore icon failures
             }
          });
        } catch (err) {
          console.error('[Store] Failed to fetch apps:', err);
        }
      },
      
      // Voice
      selectedVoice: 'af_heart',
      setSelectedVoice: (voice) => set({ selectedVoice: voice }),
      voiceSpeed: 1.0,
      setVoiceSpeed: (speed) => set({ voiceSpeed: speed }),

      // General
      followSystemAppearance: true,
      setFollowSystemAppearance: (followSystemAppearance) => set({ followSystemAppearance }),
      openAtLogin: false,
      setOpenAtLogin: (openAtLogin) => set({ openAtLogin }),
      showInSystemTray: true,
      setShowInSystemTray: (showInSystemTray) => set({ showInSystemTray }),
      windowMode: 'compact',
      setWindowMode: (windowMode) => set({ windowMode }),

      // Shortcuts
      shortcutSummon: 'CommandOrControl+K',
      setShortcutSummon: (shortcutSummon) => set({ shortcutSummon }),
      shortcutPTT: 'Alt+Space',
      setShortcutPTT: (shortcutPTT) => set({ shortcutPTT }),

      isSTTActive: false,
      setSTTActive: (active) => set({ isSTTActive: active }),
      wakeWordDetected: false,
      setWakeWordDetected: (detected) => set({ wakeWordDetected: detected }),
    }),
    {
      name: 'nexus-bar-app-storage',
      partialize: (state) => ({
        selectedVoice: state.selectedVoice,
        voiceSpeed: state.voiceSpeed,
        followSystemAppearance: state.followSystemAppearance,
        openAtLogin: state.openAtLogin,
        showInSystemTray: state.showInSystemTray,
        windowMode: state.windowMode,
        shortcutSummon: state.shortcutSummon,
        shortcutPTT: state.shortcutPTT,
      }),
    }
  )
);
