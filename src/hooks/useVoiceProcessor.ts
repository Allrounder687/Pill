import { useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAppStore } from '../stores/useAppStore';
import { useResourceStore } from '../stores/useResourceStore';
import { getCommands } from '../utils/commandRegistry';
import { normalizeLaunchIntent } from '../utils/voiceUtils';
import { punctuateText } from '../utils/aiUtils';
import type { Command } from '../utils/commandRegistry';

export const useVoiceProcessor = (
  setQuery: (q: string) => void,
  executeCommand: (cmd: Command, query: string) => void
) => {
  const { currentMode, setCurrentMode } = useAppStore();
  const speak = useResourceStore(state => state.speak);
  const [isProcessing, setIsProcessing] = useState(false);

  const processVoiceResult = useCallback(async (text: string, isFinal: boolean) => {
    const cleanedText = text.toLowerCase().trim();
    if (!cleanedText) return;
    
    setQuery(text);

    if (currentMode === 'dictate') {
      if (isFinal) {
        if (cleanedText.includes('stop dictation') || cleanedText.includes('exit dictate') || cleanedText.includes('shush')) {
          setCurrentMode('command');
          setQuery('');
          speak('Dictation mode deactivated.');
          return;
        }

        setIsProcessing(true);
        try {
          const punctuated = await punctuateText(text);
          const win = getCurrentWindow();
          
          // Clear query and hide to yield focus to the target app
          setQuery(''); 
          await win.hide();
          
          // Wait for OS to restore focus to the previous window
          await new Promise(r => setTimeout(r, 400));
          
          // Simulated hardware typing
          await invoke('type_text', { text: punctuated + ' ' });
          
          // Bring back palette for next segment preview (without stealing focus)
          await win.show();
          if (currentMode !== 'dictate') {
            await win.setFocus();
          }
        } catch (err) {
          console.error('[Dictation] Error:', err);
        } finally {
          setIsProcessing(false);
        }
      }
      return;
    }

    if (!isFinal) return;

    if (cleanedText === 'dictate' || cleanedText === 'start dictation' || cleanedText === 'dictate mode') {
      setCurrentMode('dictate');
      speak('Dictation mode active.');
      return;
    }

    // Command mapping
    if (['kill ', 'terminate ', 'stop process ', 'end '].some(k => cleanedText.startsWith(k))) {
      const killCmd = getCommands().find(c => c.id === 'kill_app');
      if (killCmd) { executeCommand(killCmd, cleanedText); return; }
    }

    if (['convert ', 'exchange ', 'how much is ', 'what is '].some(k => cleanedText.startsWith(k)) || /(\d+)\s*([a-z]{3})\s*(to|in)\s*([a-z]{3})/i.test(cleanedText)) {
      const convertCmd = getCommands().find(c => c.id === 'currency-convert');
      if (convertCmd) { executeCommand(convertCmd, cleanedText); return; }
    }

    const isSearchCmd = cleanedText.startsWith('search') || cleanedText.startsWith('google');
    if (isSearchCmd) {
      const cmd = getCommands().find(c => c.id === 'web-search');
      if (cmd) { executeCommand(cmd, cleanedText); return; }
    }

    if (cleanedText.startsWith('launch ') || cleanedText.startsWith('open ')) {
       normalizeLaunchIntent(cleanedText);
       const openCmd = getCommands().find(c => c.id === 'open_app');
       if (openCmd) executeCommand(openCmd, cleanedText);
       return;
    }
  }, [currentMode, executeCommand, setCurrentMode, speak, setQuery]);

  return { processVoiceResult, isProcessing };
};
