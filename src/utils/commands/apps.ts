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
      
      // Better app name extraction: remove common prefixes
      const appName = cleanQuery
        .replace(/^(launch|open|start|run|the)\s+/i, '')
        .replace(/\s+(app|application|software)$/i, '')
        .trim()
        .toLowerCase();

      if (!appName) return;

      const { installedApps, refreshApps } = useAppStore.getState();
      const speak = useResourceStore.getState().speak;

      // If apps list is empty, try to refresh once
      if (installedApps.length === 0) {
        await refreshApps();
      }

      const currentApps = useAppStore.getState().installedApps;
      
      // Smarter matching: 
      // 1. Exact match
      // 2. Starts with
      // 3. Contains words
      const matches = currentApps.filter(a => {
        const name = a.name.toLowerCase();
        return name === appName || 
               name.startsWith(appName) || 
               name.includes(appName) ||
               appName.includes(name);
      });
      
      let targetApp = matches.find(a => a.name.toLowerCase() === appName) || 
                      (matches.length === 1 ? matches[0] : null);
      
      if (targetApp) {
        speak(`Opening ${targetApp.name}`);
        try {
          await invoke('launch_app', { path: targetApp.path });
        } catch (err) { 
          console.error(err);
          speak(`Sorry, I couldn't launch ${targetApp.name}`);
        }
        return { suppressOutput: true };
      }
      
      if (matches.length > 1) {
        const top3 = matches.slice(0, 3).map(a => a.name).join(', ');
        speak(`I found ${matches.length} matches, like ${top3}. Which one did you mean?`);
        return { keepOpen: true, newQuery: appName };
      }

      // Final check: don't search web if the user clearly said "Open [something]" but we just don't have it
      // unless it looks like a generic query.
      if (appName.length > 2) {
        speak(`I couldn't find an app named ${appName} on your system. Should I search for it online?`);
        return { keepOpen: true, newQuery: `search ${appName}` };
      }
    },
    keywords: ['open', 'launch', 'start', 'run'],
    category: 'app'
  },
];
