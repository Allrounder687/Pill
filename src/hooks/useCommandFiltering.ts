import { useMemo } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { getCommands } from '../utils/commandRegistry';
import type { Command } from '../utils/commandRegistry';

export const useCommandFiltering = (query: string, windowMode: string): Command[] => {
  const installedApps = useAppStore(state => state.installedApps);
  const allStaticCommands = useMemo(() => getCommands(), [installedApps]);

  const filteredCommands = useMemo(() => {
    const rawLower = query.toLowerCase().trim();
    // Strip punctuation for matching
    const lowerQuery = rawLower.replace(/[.,!?;:]/g, '');
    
    if (!lowerQuery && windowMode === 'compact') return [];
    
    const matched = lowerQuery 
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

    if (lowerQuery) {
       return [...matched].sort((a, b) => {
         const aTitle = a.title.toLowerCase();
         const bTitle = b.title.toLowerCase();
         
         const getScore = (cmd: Command, t: string) => {
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
    return matched;
  }, [query, allStaticCommands, windowMode]);

  return filteredCommands;
};
