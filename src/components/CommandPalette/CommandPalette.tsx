import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { FC, KeyboardEvent } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useSTT } from '../../hooks/useSTT';
import { useTTS } from '../../hooks/useTTS';
import { useAppStore } from '../../stores/useAppStore';
import { getCommands } from '../../utils/commandRegistry';
import type { Command } from '../../utils/commandRegistry';
import VoiceIndicator from '../VoiceIndicator/VoiceIndicator';
import { getCurrentWindow } from '@tauri-apps/api/window';
import './CommandPalette.css';

interface CommandPaletteProps {
  wakeWordDetected?: boolean;
}

const CommandPalette: FC<CommandPaletteProps> = ({ wakeWordDetected = false }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const isVisible = useAppStore(state => state.isPaletteVisible);
  const setIsVisible = useAppStore(state => state.setPaletteVisible);
  const windowMode = useAppStore(state => state.windowMode);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const wakeWordHandledRef = useRef(false);
  const waitingForReplyRef = useRef(false);
  const refreshApps = useAppStore(state => state.refreshApps);

  useEffect(() => {
    refreshApps();
  }, [refreshApps]);

  const { speak, isSpeaking, isInitializing: ttsInitializing } = useTTS();

  // 1. Data Logic
  const allStaticCommands = useMemo(() => getCommands(), []);
  const installedApps = useAppStore(state => state.installedApps);
  
  const filteredCommands = useMemo(() => {
    const lowerQuery = query.toLowerCase().trim();
    
    const matchedCommands = lowerQuery 
      ? allStaticCommands.filter(c => 
          c.title.toLowerCase().includes(lowerQuery) || 
          c.description.toLowerCase().includes(lowerQuery) ||
          c.keywords.some(k => k.includes(lowerQuery))
        )
      : (windowMode === 'expanded' ? allStaticCommands : []);

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
         const aExact = a.title.toLowerCase() === lowerQuery;
         const bExact = b.title.toLowerCase() === lowerQuery;
         if (aExact && !bExact) return -1;
         if (!aExact && bExact) return 1;
         return 0;
       });
    }
    return combined;
  }, [query, allStaticCommands, windowMode, installedApps]);

  // 2. Command Execution Logic
  const executeCommand = async (command: Command, customQuery?: string) => {
    if (!command) return;
    const finalQuery = customQuery || query;
    if (isListening) stopListening();
    
    console.log(`[CommandPalette] Executing command: ${command.id}`);
    const result = await command.action(finalQuery);
    
    if (result && typeof result === 'object' && result.keepOpen) {
      if (result.newQuery !== undefined) setQuery(result.newQuery);
      waitingForReplyRef.current = true;
      console.log('[CommandPalette] Ambiguity detected. Waiting for TTS finish...');
      return;
    }

    speak(`${command.title}`);
    setQuery('');
    setIsVisible(false);
  };

  // 3. Voice Handling
  const handleVoiceResult = useCallback((text: string, isFinal: boolean) => {
    setQuery(text);
    if (!isFinal) return;

    const lowerText = text.toLowerCase().trim().replace(/[.,!?;:]+$/, '');
    
    // Ordinal Detection
    const ordinalMap: Record<string, number> = {
      'first': 0, '1st': 0, 'one': 0, 'number one': 0,
      'second': 1, '2nd': 1, 'two': 1, 'number two': 1,
      'third': 2, '3rd': 2, 'three': 2, 'number three': 3,
      'fourth': 3, '4th': 3, 'four': 3, 'number four': 4,
      'fifth': 4, '5th': 4, 'five': 4, 'number five': 5
    };

    for (const [key, index] of Object.entries(ordinalMap)) {
      if (lowerText === key || lowerText.includes(`the ${key}`)) {
        if (filteredCommands[index]) {
          executeCommand(filteredCommands[index]);
          return;
        }
      }
    }

    // Wake Words
    if (['jarvis', 'meera', 'computer'].some(w => lowerText === w)) {
      speak("Yes?");
      setQuery('');
      return;
    }
    
    // Auto-Launcher
    if (lowerText.startsWith('launch ') || lowerText.startsWith('open ')) {
       const openCmd = getCommands().find(c => c.id === 'open_app');
       if (openCmd) {
         executeCommand(openCmd, text.replace(/[.,!?;:]+$/, ''));
       }
    }
  }, [filteredCommands, speak]); // dependency on executeCommand is implicit or should be added

  const { isListening, startListening, stopListening } = useSTT(handleVoiceResult);

  // 4. Effects & Synchronization
  
  // Smart Restart for Ambiguity
  useEffect(() => {
    if (waitingForReplyRef.current && !isSpeaking && isVisible) {
      waitingForReplyRef.current = false;
      console.log('[CommandPalette] Restarting STT for reply window.');
      startListening();
    }
  }, [isSpeaking, isVisible, startListening]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  const handleKeyDown = (e: KeyboardEvent) => {
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
    if (wakeWordDetected && !wakeWordHandledRef.current) {
      wakeWordHandledRef.current = true;
      if (!isListening) startListening();
      speak("Jarvis here.");
    } else if (!wakeWordDetected) {
      wakeWordHandledRef.current = false;
    }
  }, [wakeWordDetected, isListening, startListening, speak]);

  useEffect(() => {
    const unlistenPTT = listen('global-ptt-event', (event: any) => {
      const state = event.payload as 'start' | 'stop';
      if (state === 'start' && !isListening) {
        setIsVisible(true);
        startListening();
      } else if (state === 'stop' && isListening) {
        stopListening();
      }
    });
    return () => { unlistenPTT.then(f => f()); };
  }, [isListening, startListening, stopListening, setIsVisible]);
  
  useEffect(() => {
    const win = getCurrentWindow();
    if (isVisible) {
      win.show().then(() => {
        win.setFocus();
        setTimeout(() => inputRef.current?.focus(), 100);
      }).catch(console.error);
    } else {
      win.hide().catch(console.error);
      if (isListening) stopListening();
      setQuery('');
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    const win = getCurrentWindow();
    const unlistenBlur = win.onFocusChanged((event) => {
      if (!event.payload && query.length === 0) setIsVisible(false);
    });
    return () => { unlistenBlur.then(f => f()); };
  }, [isVisible, setIsVisible, query.length]);

  const isPillMode = query.trim().length === 0 && windowMode === 'compact';

  return (
    <div 
      className={`palette-overlay ${isVisible ? 'visible' : 'hidden'} ${isPillMode ? 'pill-layout' : 'full-layout'}`}
      onClick={() => setIsVisible(false)}
    >
      <div className="palette-container" onClick={(e) => e.stopPropagation()}>
        <div className="search-section" data-tauri-drag-region>
          <input
            ref={inputRef}
            placeholder="Search commands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button 
            className={`voice-btn ${isListening ? 'active' : ''}`}
            onClick={isListening ? stopListening : startListening}
          >
            <VoiceIndicator isListening={isListening} isSpeaking={isSpeaking} wakeWordDetected={wakeWordDetected} />
          </button>
        </div>

        {!isPillMode && (
          <>
            <div className="results-section">
               {filteredCommands.length > 0 ? (
                 filteredCommands.map((cmd, index) => (
                    <div
                      key={cmd.id}
                      className={`result-item ${index === selectedIndex ? 'selected' : ''}`}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className="ordinal-badge">{index + 1}</div>
                      <span className="command-icon">{cmd.icon}</span>
                      <div className="command-details">
                        <div className="command-title">{cmd.title}</div>
                        <div className="command-desc">{cmd.description}</div>
                      </div>
                      {index === selectedIndex && <div className="enter-hint">↵ Enter</div>}
                    </div>
                 ))
               ) : (
                 <div className="no-results">No matches for "{query}"</div>
               )}
            </div>
            <div className="palette-footer">
              <span className={`status-dot ${ttsInitializing ? 'loading' : 'ready'}`} />
              {ttsInitializing ? 'Loading Voice Engine...' : 'Jarvis Online'}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CommandPalette;
