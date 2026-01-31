import { invoke } from '@tauri-apps/api/core';
import type { Command } from '../commandRegistry';
import { useAppStore } from '../../stores/useAppStore';
import { useResourceStore } from '../../stores/useResourceStore';

export const APP_COMMANDS: Command[] = [
  {
    id: 'open_app',
    title: 'Open Application',
    description: 'Launch an installed app by name',
    icon: '🚀',
    action: async (query) => {
      const cleanQuery = query?.replace(/[.,!?;:]/g, '').trim() || '';
      const appName = cleanQuery.replace(/launch|open|start|run/i, '').trim().toLowerCase();
      if (!appName) return;

      const apps = useAppStore.getState().installedApps;
      const matches = apps.filter(a => 
        a.name.toLowerCase() === appName || 
        a.name.toLowerCase().startsWith(appName) || 
        a.name.toLowerCase().includes(appName)
      );
      
      let targetApp = matches.find(a => a.name.toLowerCase() === appName) || (matches.length === 1 ? matches[0] : null);
      
      if (targetApp) {
        useResourceStore.getState().speak(`Opening ${targetApp.name}`);
        try {
          await invoke('launch_app', { path: targetApp.path });
        } catch (err) { console.error(err); }
        return { suppressOutput: true };
      }
      
      if (matches.length > 1) {
        const top3 = matches.slice(0, 3).map(a => a.name).join(', ');
        useResourceStore.getState().speak(`I found ${matches.length} apps. The top results are ${top3}. Which one?`);
        return { keepOpen: true, newQuery: appName };
      }

      useResourceStore.getState().speak(`Searching the web for ${appName}`);
      const { open } = await import('@tauri-apps/plugin-shell');
      open(`https://www.google.com/search?q=${encodeURIComponent(appName)}`).catch(console.error);
    },
    keywords: ['open', 'launch', 'start', 'run'],
    category: 'app'
  },
];
