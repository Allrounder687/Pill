import { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { getCommands } from '../utils/commandRegistry';
import type { Command } from '../utils/commandRegistry';
import { currencyService } from '../services/CurrencyService';
import type { ConversionResult } from '../services/CurrencyService';
import { useIntentEngine } from './useIntentEngine';
import { executePipeline } from '../utils/pipelineExecutor';
import { useContextStore } from '../stores/useContextStore';

export const useCommandFiltering = (query: string, windowMode: string) => {
  const installedApps = useAppStore(state => state.installedApps);
  const [liveCurrency, setLiveCurrency] = useState<ConversionResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { intentResult, isResolving } = useIntentEngine(query);
  const snapshot = useContextStore(state => state.snapshot);

  const allStaticCommands = useMemo(() => getCommands(), [installedApps]);

  useEffect(() => {
    const fetchCurrency = async () => {
      // If we have a query that looks like currency/math, mark as searching
      const isMathOrCurrency = query.length >= 3 && (/\d/.test(query) || ['to', 'in', 'convert'].some(k => query.toLowerCase().includes(k)));
      
      if (isMathOrCurrency) setIsSearching(true);

      if (query.trim().length < 3) {
        setLiveCurrency(null);
        setIsSearching(false);
        return;
      }

      try {
        const result = await currencyService.convert(query);
        setLiveCurrency(result);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
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
          const getScore = (cmd: Command) => {
            const lowTitle = cmd.title.toLowerCase();
            const isGameIntent = lowerQuery === 'games' || lowerQuery === 'gaming' || lowerQuery === 'play';
            const isActualGame = cmd.keywords.includes('games') || cmd.keywords.includes('gaming');
            
            let score = 0;
            if (lowTitle === lowerQuery) score += 100;
            else if (lowTitle.startsWith(lowerQuery)) score += 80;
            else if (lowerQuery.startsWith(lowTitle)) score += 75;
            else if (lowTitle.includes(lowerQuery)) score += 50;

            // Keyword boosts
            if (cmd.keywords.some(k => k.toLowerCase() === lowerQuery)) score += 90;
            
            // INTENT BOOST: If searching for games, push real games to the absolute top
            if (isGameIntent && isActualGame) {
              score += 200; 
              // Penalize things that look like tools or launchers when intent is games
              if (lowTitle.includes('sdk') || lowTitle.includes('launcher') || lowTitle.includes('tools')) {
                score -= 50;
              }
            }

            return score;
          };
          return getScore(b) - getScore(a);
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

    if (intentResult && intentResult.confidence > 0.6) {
      const aiCommand: Command = {
        id: `ai-intent-${intentResult.intent}`,
        title: intentResult.intent.charAt(0).toUpperCase() + intentResult.intent.slice(1),
        description: intentResult.reasoning,
        icon: '✨',
        action: async () => {
          await executePipeline(intentResult.actions);
        },
        keywords: ['ai', 'intent', 'magic'],
        category: 'ai' as any
      };
      // Insert AI intent at the top
      finalResults = [aiCommand, ...finalResults];
    }

    // Add context-based actions
    if (snapshot?.clipboard && snapshot.clipboard.length > 10) {
        finalResults.push({
            id: 'ai-summarize-clipboard',
            title: 'Summarize Clipboard',
            description: 'AI summary of copied text',
            icon: '📝',
            action: async () => {
                await executePipeline([{ action: 'summarize', params: { text: snapshot.clipboard } }]);
            },
            keywords: ['summarize', 'clipboard', 'ai'],
            category: 'ai' as any
        });
    }

    return finalResults;
  }, [query, allStaticCommands, windowMode, liveCurrency, intentResult, snapshot]);

  return { filteredCommands, isSearching: isSearching || isResolving };
};
