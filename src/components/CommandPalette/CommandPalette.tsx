import { useState, useEffect, useRef, useCallback } from 'react';
import type { FC, KeyboardEvent } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useSTT } from '../../hooks/useSTT';
import { useTTS } from '../../hooks/useTTS';
import { useAppStore } from '../../stores/useAppStore';
import { getCommands } from '../../utils/commandRegistry';
import type { Command } from '../../utils/commandRegistry';
import { useCommandFiltering } from '../../hooks/useCommandFiltering';
import { getOrdinalIndex, cleanVoiceText, normalizeLaunchIntent } from '../../utils/voiceUtils';
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
  const filteredCommands = useCommandFiltering(query, windowMode);

  const executeCommand = async (command: Command, customQuery?: string) => {
    if (!command) return;
    const finalQuery = customQuery || query;
    if (isListening) stopListening();
    
    console.log(`[CommandPalette] Executing command: ${command.id}`);
    const result = await command.action(finalQuery);
    
    if (result && typeof result === 'object' && result.keepOpen) {
      if (result.newQuery !== undefined) setQuery(result.newQuery);
      waitingForReplyRef.current = true;
      console.log('[CommandPalette] Ambiguity detected. Waiting for Jarvis to finish speaking...');
      return;
    }

    if (!(result && typeof result === 'object' && result.suppressOutput)) {
      speak(`${command.title}`);
    }
    setQuery('');
    setIsVisible(false);
  };

  const handleVoiceResult = useCallback((text: string, isFinal: boolean) => {
    const cleanedText = cleanVoiceText(text);
    
    if (isFinal) {
      // 1. Handle "More Results" request
      const moreKeywords = ['more', 'others', 'rest', 'what else', 'tell me more', 'show more'];
      if (waitingForReplyRef.current && moreKeywords.some(k => cleanedText.includes(k))) {
        const rest = filteredCommands.slice(3, 10).map(c => c.title);
        if (rest.length > 0) {
          speak(`The other matches are: ${rest.join(', ')}. Which one?`);
        } else {
          speak("Those are all the matches I found.");
        }
        return;
      }

      // 2. Handle Ordinal selection
      const index = getOrdinalIndex(cleanedText);
      if (index !== null && filteredCommands[index]) {
        executeCommand(filteredCommands[index]);
        return;
      }
    }

    // 2. Interim ordinal filtering
    const possiblyOrdinal = /^(number|the|first|one|two|three|second|third|1|2|3)/.test(cleanedText);
    if (!isFinal && possiblyOrdinal && waitingForReplyRef.current) return;

    setQuery(cleanedText);
    if (!isFinal) return;

    // 4. Special Keywords
    if (['jarvis', 'meera', 'computer'].some(w => cleanedText === w)) {
      speak("Yes?");
      setQuery('');
      return;
    }
    
    // 5. Intelligent Routing & Auto-Execution
    const isVolumeCmd = cleanedText.includes('volume') || cleanedText.includes('louder') || cleanedText.includes('quieter') || cleanedText.includes('mute');
    const isMediaCmd = ['play', 'pause', 'resume', 'next', 'previous', 'skip'].some(k => cleanedText.includes(k));

    if (isVolumeCmd || isMediaCmd) {
      const bestMatch = filteredCommands.find(c => 
        c.category === 'system' && (
          cleanedText.includes(c.title.toLowerCase()) || 
          c.keywords.some(k => cleanedText.includes(k.toLowerCase()))
        )
      );
      
      if (bestMatch) {
        executeCommand(bestMatch, cleanedText);
        return;
      }
    }

    if (cleanedText.startsWith('launch ') || cleanedText.startsWith('open ') || cleanedText.startsWith('start ')) {
       const intent = normalizeLaunchIntent(cleanedText);
       const staticCmd = getCommands().find(c => 
         c.id !== 'open_app' && (c.title.toLowerCase() === intent || c.keywords.includes(intent))
       );

       if (staticCmd) {
         executeCommand(staticCmd);
       } else {
         const openCmd = getCommands().find(c => c.id === 'open_app');
         if (openCmd) executeCommand(openCmd, cleanedText);
       }
       return;
    }
  }, [filteredCommands, speak]);

  const { isListening, startListening, stopListening } = useSTT(handleVoiceResult);

  // Smart Restart for Ambiguity - Wait for TTS to finish
  useEffect(() => {
    if (waitingForReplyRef.current && !isSpeaking && isVisible) {
      const timer = setTimeout(() => {
        if (!isSpeaking && isVisible) {
           console.log('[CommandPalette] Restarting STT for reply window.');
           startListening();
        }
      }, 300);
      return () => clearTimeout(timer);
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
      win.show().then(() => win.setFocus()).catch(console.error);
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      win.hide().catch(console.error);
      if (isListening) stopListening();
      setQuery('');
      waitingForReplyRef.current = false;
    }
  }, [isVisible]);

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
          <div className="results-wrapper">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default CommandPalette;
