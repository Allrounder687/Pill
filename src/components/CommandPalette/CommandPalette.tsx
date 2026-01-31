import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { getCommands } from '../../utils/commandRegistry';
import type { Command } from '../../utils/commandRegistry';
import { useAppStore } from '../../stores/useAppStore';
import { useResourceStore } from '../../stores/useResourceStore';
import { useSTT } from '../../hooks/useSTT';
import { useCommandFiltering } from '../../hooks/useCommandFiltering';
import { normalizeLaunchIntent } from '../../utils/voiceUtils';
import VoiceIndicator from '../VoiceIndicator/VoiceIndicator';
import { CommandResults } from './CommandResults';
import './CommandPalette.css';

const CommandPalette: React.FC = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  // High-priority for input feeling, lower-priority for filtering
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(timer);
  }, [query]);

  const isVisible = useAppStore(state => state.isPaletteVisible);
  const setIsVisible = useAppStore(state => state.setPaletteVisible);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const waitingForReplyRef = useRef(false);

  const { windowMode, wakeWordDetected } = useAppStore();
  const { isSpeaking, isTTSInitializing: ttsInitializing } = useResourceStore();
  
  // Filtering uses the debounced query to prevent stutter while typing
  const filteredCommands = useCommandFiltering(debouncedQuery, windowMode);

  const executeCommand = useCallback(async (cmd: Command, finalQuery?: string) => {
    const result = await cmd.action(finalQuery || query);
    if (result && result.keepOpen) {
      if (result.newQuery !== undefined) setQuery(result.newQuery);
      waitingForReplyRef.current = true;
    } else {
      setIsVisible(false);
    }
  }, [query, setIsVisible]);

  const handleVoiceResult = useCallback((text: string) => {
    const cleanedText = text.toLowerCase().trim();
    if (!cleanedText) return;
    
    setQuery(cleanedText);

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
       const intent = normalizeLaunchIntent(cleanedText);
       console.log('[Palette] Launch intent:', intent);
       const openCmd = getCommands().find(c => c.id === 'open_app');
       if (openCmd) executeCommand(openCmd, cleanedText);
       return;
    }
  }, [executeCommand]);

  const { isListening, startListening, stopListening } = useSTT(handleVoiceResult);

  useEffect(() => {
    if (waitingForReplyRef.current && !isSpeaking && isVisible) {
      setTimeout(() => startListening(), 300);
    }
  }, [isSpeaking, isVisible, startListening]);

  useEffect(() => { setSelectedIndex(0); }, [filteredCommands]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredCommands.length));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (filteredCommands[selectedIndex]) executeCommand(filteredCommands[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsVisible(false);
    }
  };

  useEffect(() => {
    const unlistenPTT = listen('global-ptt-event', (event: any) => {
      if (event.payload === 'start' && !isListening) { setIsVisible(true); startListening(); }
      else if (event.payload === 'stop' && isListening) { stopListening(); }
    });
    return () => { unlistenPTT.then(f => f()); };
  }, [isListening, startListening, stopListening, setIsVisible]);
  
  useEffect(() => {
    const win = getCurrentWindow();
    if (isVisible) {
      win.show().then(() => win.setFocus());
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      win.hide();
      if (isListening) stopListening();
      setQuery('');
      waitingForReplyRef.current = false;
    }
  }, [isVisible, isListening, stopListening]);

  const isPillMode = query.trim().length === 0 && windowMode === 'compact';

  return (
    <div className={`palette-overlay ${isVisible ? 'visible' : 'hidden'} ${isPillMode ? 'pill-layout' : 'full-layout'}`} onClick={() => setIsVisible(false)}>
      <div className="palette-container" onClick={(e) => e.stopPropagation()}>
        <div className="search-section" data-tauri-drag-region>
          <input ref={inputRef} placeholder="Search commands..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} />
          <button className={`voice-btn ${isListening ? 'active' : ''}`} onClick={isListening ? stopListening : startListening}>
            <VoiceIndicator isListening={isListening} isSpeaking={isSpeaking} wakeWordDetected={wakeWordDetected} />
          </button>
        </div>
        {!isPillMode && (
          <div className="results-wrapper">
            <CommandResults 
              filteredCommands={filteredCommands} 
              selectedIndex={selectedIndex} 
              setSelectedIndex={setSelectedIndex} 
              executeCommand={executeCommand}
              query={query}
              setQuery={setQuery}
            />
            <div className="palette-footer">
              <span className={`status-dot ${ttsInitializing ? 'loading' : 'ready'}`} />
              {ttsInitializing ? 'Loading Voice Engine...' : 'Jarvis Online'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommandPalette;
