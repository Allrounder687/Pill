import { useMemo } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { getCommands } from '../utils/commandRegistry';

export const useCommandFiltering = (query: string, windowMode: string) => {
  const allStaticCommands = useMemo(() => getCommands(), []);
  const installedApps = useAppStore(state => state.installedApps);

  const filteredCommands = useMemo(() => {
    const rawLower = query.toLowerCase().trim();
    // Strip punctuation for matching
    const lowerQuery = rawLower.replace(/[.,!?;:]/g, '');
    
    if (!lowerQuery && windowMode === 'compact') return [];
    
    const matchedCommands = lowerQuery 
      ? allStaticCommands.filter(c => {
          const title = c.title.toLowerCase();
          const desc = c.description.toLowerCase();
          return title.includes(lowerQuery) || 
                 lowerQuery.includes(title) || // e.g. "volume up 5" contains "volume up"
                 desc.includes(lowerQuery) ||
                 c.keywords.some(k => {
                   const kw = k.toLowerCase();
                   return kw.includes(lowerQuery) || lowerQuery.includes(kw);
                 });
        })
      : allStaticCommands;

    const matchedApps = lowerQuery 
      ? installedApps
          .filter(app => app.name.toLowerCase().includes(lowerQuery))
          .map(app => ({
            id: `app:${app.path}`,
            title: app.name,
            description: `Application • ${app.path.substring(0, 30)}...`,
            icon: '🚀',
            action: async () => {
              const { invoke } = await import('@tauri-apps/api/core');
              await invoke('launch_app', { path: app.path });
            },
            keywords: ['app', 'launch', app.name.toLowerCase()],
            category: 'app' as const
          }))
      : [];

    const combined = [...matchedCommands, ...matchedApps];
    if (lowerQuery) {
       combined.sort((a, b) => {
         const aTitle = a.title.toLowerCase();
         const bTitle = b.title.toLowerCase();
         
         const getScore = (cmd: any, t: string) => {
           if (t === lowerQuery) return 100;
           if (lowerQuery.startsWith(t)) return 80;
           if (t.startsWith(lowerQuery)) return 70;
           if (cmd.keywords?.some((k: string) => k.toLowerCase() === lowerQuery)) return 90;
           if (cmd.keywords?.some((k: string) => lowerQuery.startsWith(k.toLowerCase()))) return 85;
           if (t.includes(lowerQuery)) return 50;
           return 0;
         };

         const scoreA = getScore(a, aTitle);
         const scoreB = getScore(b, bTitle);
         
         if (scoreA !== scoreB) return scoreB - scoreA;
         return aTitle.localeCompare(bTitle);
       });
    }
    return combined;
  }, [query, allStaticCommands, windowMode, installedApps]);

  return filteredCommands;
};
