import { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { getCommands } from '../utils/commandRegistry';
import type { Command } from '../utils/commandRegistry';
import { currencyService } from '../services/CurrencyService';
import type { ConversionResult } from '../services/CurrencyService';

export const useCommandFiltering = (query: string, windowMode: string): Command[] => {
  const installedApps = useAppStore(state => state.installedApps);
  const [liveCurrency, setLiveCurrency] = useState<ConversionResult | null>(null);

  const allStaticCommands = useMemo(() => getCommands(), [installedApps]);

  useEffect(() => {
    const fetchCurrency = async () => {
      if (query.trim().length < 3) {
        setLiveCurrency(null);
        return;
      }
      const result = await currencyService.convert(query);
      setLiveCurrency(result);
    };

    fetchCurrency();
  }, [query]);

  const filteredCommands = useMemo(() => {
    const rawLower = query.toLowerCase().trim();
    const lowerQuery = rawLower.replace(/[.,!?;:]/g, '');
    
    if (!lowerQuery && windowMode === 'compact') return [];
    
    const matched = allStaticCommands.filter(c => {
      const title = c.title.toLowerCase();
      const desc = c.description.toLowerCase();
      return title.includes(lowerQuery) || 
             lowerQuery.includes(title) || 
             desc.includes(lowerQuery) ||
             c.keywords.some(k => k.toLowerCase().includes(lowerQuery) || lowerQuery.includes(k.toLowerCase()));
    });

    let finalResults = [...matched];

    if (lowerQuery) {
       finalResults.sort((a, b) => {
         const getScore = (_cmd: Command, t: string) => {
           const lowT = t.toLowerCase();
           if (lowT === lowerQuery) return 100;
           if (lowerQuery.startsWith(lowT)) return 80;
           if (lowT.startsWith(lowerQuery)) return 70;
           return 0;
         };
         return getScore(b, b.title) - getScore(a, a.title);
       });
    }

    if (liveCurrency) {
      const currencyMiniApp: Command = {
        id: 'currency-mini-app',
        title: 'Currency Converter',
        description: 'Interactive conversion UI',
        icon: '💱',
        action: () => {},
        keywords: ['convert', 'currency', 'money'],
        interactiveData: liveCurrency
      };
      finalResults = [currencyMiniApp, ...finalResults];
    }

    const killTriggers = ['kill ', 'terminate ', 'stop process ', 'end '];
    const isKillQuery = killTriggers.some(t => lowerQuery.startsWith(t));
    if (isKillQuery) {
      const target = lowerQuery.replace(/kill|terminate|stop process|end/i, '').trim();
      if (target.length > 1) {
        const processKillerApp: Command = {
          id: 'process-killer-app',
          title: 'Process Terminator',
          description: `Manage processes matching "${target}"`,
          icon: '💀',
          action: () => {},
          keywords: ['kill', 'terminate', 'process'],
          interactiveData: { target }
        };
        finalResults = [processKillerApp, ...finalResults];
      }
    }

    return finalResults;
  }, [query, allStaticCommands, windowMode, liveCurrency]);

  return filteredCommands;
};
