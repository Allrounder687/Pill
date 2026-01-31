import { invoke } from '@tauri-apps/api/core';

export interface WindowConfig {
  label: string;
  title: string;
  url: string;
  width?: number;
  height?: number;
}

export const windowManager = {
  /**
   * Spawns a new Tauri window via the Rust backend.
   * Rust now handles existence checks and focusing for better performance.
   */
  async spawn(config: WindowConfig) {
    console.log(`[WindowManager] Requesting window: ${config.label}`);
    
    try {
      await invoke('create_window', {
        label: config.label,
        title: config.title,
        url: config.url || '/',
        width: config.width || 800,
        height: config.height || 600,
      });
    } catch (error) {
      console.error(`[WindowManager] Error:`, error);
    }
  },

  async openSettings() {
    await this.spawn({
      label: 'settings',
      title: 'Nexus Bar Settings',
      url: 'index.html',
      width: 900,
      height: 650
    });
  },

  async openExtension(id: string, name: string) {
    await this.spawn({
      label: `ext-${id}`,
      title: name,
      url: `/extensions/${id}`,
      width: 400,
      height: 500
    });
  }
};