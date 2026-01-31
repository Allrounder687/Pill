import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
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

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

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
  const [userNavigated, setUserNavigated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const waitingForReplyRef = useRef(false);

  const { windowMode, wakeWordDetected } = useAppStore();
  const { isSpeaking, isTTSInitializing: ttsInitializing } = useResourceStore();
  
  // Filtering uses the debounced query to prevent stutter while typing
  const { filteredCommands, isSearching } = useCommandFiltering(debouncedQuery, windowMode);

  const openSettings = useCallback(() => {
    setIsVisible(false);
    invoke('create_window', {
      label: 'settings',
      title: 'Voice Access Settings',
      url: '/settings',
      width: 850,
      height: 650
    }).catch(console.error);
  }, [setIsVisible]);

  const executeCommand = useCallback(async (cmd: Command, finalQuery?: string) => {
    if (cmd.id === 'open-settings') {
      openSettings();
      return;
    }
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

  useEffect(() => { setSelectedIndex(0); setUserNavigated(false); }, [filteredCommands, isSearching]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredCommands.length));
      setUserNavigated(true);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      setUserNavigated(true);
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
      
      // Auto-start listening if triggered by wake word
      if (wakeWordDetected && !isListening) {
        startListening();
      }
    } else {
      win.hide();
      if (isListening) stopListening();
      setQuery('');
      waitingForReplyRef.current = false;
    }
  }, [isVisible, wakeWordDetected, isListening, startListening, stopListening]);

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
        
        {isSearching && <div className="loading-bar-container"><div className="loading-bar-fill" /></div>}
        <div className={`results-wrapper ${isPillMode ? 'collapsed' : 'expanded'}`}>
          <CommandResults 
            filteredCommands={filteredCommands} 
            selectedIndex={selectedIndex} 
            setSelectedIndex={setSelectedIndex} 
            executeCommand={executeCommand}
            query={query}
            setQuery={setQuery}
            userNavigated={userNavigated}
          />
          <div className="palette-footer">
            <div className="footer-left">
              <span className={`status-dot ${ttsInitializing ? 'loading' : 'ready'}`} />
              {ttsInitializing ? 'Loading Voice Engine...' : 'Jarvis Online'}
            </div>
            <button className="footer-settings-btn" onClick={openSettings} title="Open Settings">
              <SettingsIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
