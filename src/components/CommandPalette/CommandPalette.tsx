import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Command } from '../../utils/commandRegistry';
import { useAppStore } from '../../stores/useAppStore';
import { useResourceStore } from '../../stores/useResourceStore';
import { useSTT } from '../../hooks/useSTT';
import { useCommandFiltering } from '../../hooks/useCommandFiltering';
import { useContextStore } from '../../stores/useContextStore';
import { useVoiceProcessor } from '../../hooks/useVoiceProcessor';
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
  const [isPrewarming, setIsPrewarming] = useState(true);
  
  // Prewarm the layout on mount to ensure smooth animations later
  useEffect(() => {
    const timer = setTimeout(() => setIsPrewarming(false), 500);
    return () => clearTimeout(timer);
  }, []);
  
  // High-priority for input feeling, lower-priority for filtering
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 50); // Faster filtering
    return () => clearTimeout(timer);
  }, [query]);

  const isVisible = useAppStore(state => state.isPaletteVisible);
  const setIsVisible = useAppStore(state => state.setPaletteVisible);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [userNavigated, setUserNavigated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const waitingForReplyRef = useRef(false);

  const { windowMode, wakeWordDetected, currentMode, setCurrentMode } = useAppStore();
  const { isSpeaking, isTTSInitializing: ttsInitializing, speak } = useResourceStore();
  
  // Filtering uses the debounced query to prevent stutter while typing
  const startFiltering = performance.now();
  const { filteredCommands, isSearching } = useCommandFiltering(debouncedQuery, windowMode);
  const endFiltering = performance.now();

  useEffect(() => {
    if (debouncedQuery) {
      console.log(`[Perf] Filtering for "${debouncedQuery}" took ${(endFiltering - startFiltering).toFixed(2)}ms`);
    }
  }, [debouncedQuery]);

  useLayoutEffect(() => {
    if (isVisible) {
      const startPaint = performance.now();
      // We log at the end of the effect (after commit)
      const endPaint = performance.now();
      console.log(`[Perf] Palette Render commit took ${(endPaint - startPaint).toFixed(2)}ms`);
    }
  }, [isVisible, query, filteredCommands]);

  const openSettings = useCallback(() => {
    setIsVisible(false);
    invoke('create_window', {
      label: 'settings',
      title: 'Nexus Bar Settings',
      url: 'index.html',
      width: 850,
      height: 650
    }).catch(console.error);
  }, [setIsVisible]);

  const executeCommand = useCallback(async (cmd: Command, finalQuery?: string) => {
    if (cmd.id === 'open_settings') {
      openSettings();
      return;
    }
    if (cmd.id === 'dictate-mode') {
      setCurrentMode('dictate');
      speak('Dictation mode active.');
      return;
    }
    const result = await cmd.action(finalQuery || query);
    if (result && result.keepOpen) {
      if (result.newQuery !== undefined) setQuery(result.newQuery);
      waitingForReplyRef.current = true;
    } else {
      setIsVisible(false);
    }
  }, [query, setIsVisible, setCurrentMode, speak, openSettings]);

  const { processVoiceResult, isProcessing } = useVoiceProcessor(setQuery, executeCommand);

  const { isListening, startListening, stopListening } = useSTT(processVoiceResult, {
    disableAutoStop: currentMode === 'dictate'
  });

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
    const unlistenBlur = listen('tauri://blur', () => {
      if (currentMode === 'command') setIsVisible(false);
    });

    if (isVisible) {
      if (currentMode === 'dictate') {
        win.setIgnoreCursorEvents(true);
      } else {
        win.setIgnoreCursorEvents(false);
        win.setFocus();
      }
      
      win.show();
      
      if (currentMode === 'command') {
        inputRef.current?.focus();
      }
      
      // Refresh context snapshot for Intent Engine
      useContextStore.getState().refreshSnapshot();
      
      if (wakeWordDetected && !isListening) {
        startListening();
      }
    } else {
      win.setIgnoreCursorEvents(false); // Reset on hide
      win.hide();
      if (isListening) stopListening();
      setQuery('');
      waitingForReplyRef.current = false;
    }

    return () => {
      unlistenBlur.then(f => f());
    };
  }, [isVisible, wakeWordDetected, isListening, startListening, stopListening, currentMode, setIsVisible]);

  const isPillMode = (query.trim().length === 0 && windowMode === 'compact');

  return (
    <div className={`palette-overlay ${isVisible ? 'visible' : 'hidden'} ${isPillMode ? 'pill-layout' : 'full-layout'} ${currentMode === 'dictate' ? 'dictate-mode' : ''}`} onClick={() => setIsVisible(false)}>
      <div className="palette-container" onClick={(e) => e.stopPropagation()}>
        <div className="search-section" data-tauri-drag-region>
          <input 
            ref={inputRef} 
            placeholder={currentMode === 'dictate' ? "Dictating to active window..." : "Search commands..."} 
            value={query} 
            readOnly={currentMode === 'dictate'}
            onChange={(e) => setQuery(e.target.value)} 
            onKeyDown={handleKeyDown} 
          />
          <button className={`voice-btn ${isListening ? 'active' : ''} ${isProcessing ? 'processing' : ''}`} onClick={isListening ? stopListening : startListening}>
            <VoiceIndicator isListening={isListening} isSpeaking={isSpeaking} wakeWordDetected={wakeWordDetected} />
          </button>
        </div>
        
        {(isSearching || isProcessing) && (
          <div className="loading-bar-container">
            <div className={`loading-bar-fill ${isProcessing ? 'dictation-processing' : (query.length > 5 ? 'ai-resolving' : '')}`} />
          </div>
        )}

        {currentMode === 'dictate' && (
          <div className="dictate-status">
            <span className="dictate-badge">Dictate Active</span>
            <span className="dictate-hint">Say "stop dictation" to exit</span>
          </div>
        )}

        <div className={`results-wrapper ${(isPillMode && currentMode !== 'dictate') ? 'collapsed' : 'expanded'}`}>
          {currentMode === 'command' ? (
            <CommandResults 
              filteredCommands={filteredCommands} 
              selectedIndex={selectedIndex} 
              setSelectedIndex={setSelectedIndex} 
              executeCommand={executeCommand}
              query={query}
              setQuery={setQuery}
              userNavigated={userNavigated}
              isPrewarming={isPrewarming}
            />
          ) : (
            <div className="dictation-preview">
              <p className="preview-text">{query || "Speak now..."}</p>
              {isProcessing && <div className="processing-indicator">Correcting grammar...</div>}
            </div>
          )}
          <div className="palette-footer">
            <div className="footer-left">
              <span className={`status-dot ${ttsInitializing ? 'loading' : 'ready'}`} />
              {ttsInitializing ? 'Loading Voice Engine...' : (currentMode === 'dictate' ? 'Awaiting Speech...' : 'Nexus Bar Online')}
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
