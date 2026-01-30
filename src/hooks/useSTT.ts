import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '../stores/useAppStore';

export const useSTT = (onResult: (text: string, isFinal: boolean) => void) => {
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

  const resetSilenceTimer = useCallback((duration = 4000) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      console.log('[useSTT] Silence timeout reached.');
      stopListening();
    }, duration);
  }, [stopListening]);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Reset session
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch(e) {}
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('[useSTT] Session Started');
      sessionActiveRef.current = true;
      setIsListening(true);
      setSTTActive(true);
      resetSilenceTimer(4000); 
    };
    
    recognition.onend = () => {
      console.log('[useSTT] Session Ended');
      // Only update state if this was still the active session
      if (sessionActiveRef.current) {
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
      if (event.error === 'no-speech') return; // Ignore no-speech errors in continuous mode
      console.error('STT Error:', event.error);
      stopListening();
    };

    recognition.onresult = (event: any) => {
      if (!sessionActiveRef.current) return;
      
      resetSilenceTimer(4000); 
      
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
  }, [setSTTActive, resetSilenceTimer, stopListening]);

  return { isListening, startListening, stopListening };
};
