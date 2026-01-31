import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '../stores/useAppStore';

export interface STTConfig {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  disableAutoStop?: boolean;
}

export const useSTT = (
  onResult: (text: string, isFinal: boolean) => void,
  config: STTConfig = {}
) => {
  const [isListening, setIsListening] = useState(false);
  const setSTTActive = useAppStore(state => state.setSTTActive);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionActiveRef = useRef(false);

  onResultRef.current = onResult;

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null; // Prevent onend loops
        recognitionRef.current.stop();
      } catch (e) {}
      sessionActiveRef.current = false;
      setIsListening(false);
      setSTTActive(false);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }
  }, [setSTTActive]);

  const resetSilenceTimer = useCallback((duration = 7000) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    
    // If auto-stop is disabled (Dictation Mode), we never start the timer
    if (config.disableAutoStop) return;

    silenceTimerRef.current = setTimeout(() => {
      console.log('[useSTT] Silence timeout reached.');
      stopListening();
    }, duration);
  }, [stopListening, config.disableAutoStop]);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch(e) {}
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = config.continuous ?? true;
    recognition.interimResults = config.interimResults ?? true;
    recognition.lang = config.lang ?? 'en-US';

    recognition.onstart = () => {
      console.log(`[useSTT] Session Started (Infinity: ${!!config.disableAutoStop})`);
      sessionActiveRef.current = true;
      setIsListening(true);
      setSTTActive(true);
      resetSilenceTimer(8000); 
    };
    
    recognition.onend = () => {
      console.log('[useSTT] Session Ended');
      if (sessionActiveRef.current) {
        // If in Dictation Mode, we might want to auto-restart if the browser stops us
        if (config.disableAutoStop && isListening) {
           console.log('[useSTT] Auto-restarting dictation session...');
           try { recognition.start(); return; } catch (e) {}
        }
        setIsListening(false);
        setSTTActive(false);
        sessionActiveRef.current = false;
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
    
    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return;
      console.error('STT Error:', event.error);
      if (event.error === 'aborted' && config.disableAutoStop) return;
      stopListening();
    };

    recognition.onresult = (event: any) => {
      if (!sessionActiveRef.current) return;
      
      resetSilenceTimer(7000); 
      
      const results = event.results;
      const lastResult = results[results.length - 1];
      const isFinal = lastResult.isFinal;
      
      const transcript = Array.from(results)
        .map((res: any) => res[0].transcript)
        .join('');
      
      onResultRef.current(transcript, isFinal);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error('[useSTT] Start failed:', e);
    }
  }, [setSTTActive, resetSilenceTimer, stopListening, config, isListening]);

  return { isListening, startListening, stopListening };
};
