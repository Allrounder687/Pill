import { useState, useEffect } from 'react';
import { resolveIntent } from '../utils/intentEngine';
import type { IntentResponse } from '../utils/intentEngine';
import { useContextStore } from '../stores/useContextStore';

export const useIntentEngine = (query: string) => {
  const [intentResult, setIntentResult] = useState<IntentResponse | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const snapshot = useContextStore(state => state.snapshot);
  const refreshSnapshot = useContextStore(state => state.refreshSnapshot);

  useEffect(() => {
    if (query.length < 5) {
      setIntentResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      // 1. Refresh context before resolving intent if it's stale (older than 30s)
      // For now, we'll just use the current snapshot if available or refresh once
      if (!snapshot) await refreshSnapshot();
      
      setIsResolving(true);
      const result = await resolveIntent(query, snapshot);
      setIntentResult(result);
      setIsResolving(false);
    }, 800); // 800ms debounce for AI intent

    return () => clearTimeout(timer);
  }, [query]);

  return { intentResult, isResolving };
};
