import { useState, useEffect, useCallback, useRef } from 'react';
import { SimpleWakeWordDetector, type WakeWord, type WakeWordDetectionResult } from '../services/WakeWordDetector';

interface UseWakeWordReturn {
  isListening: boolean;
  lastWakeWord: WakeWord | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  setEnabledWakeWords: (words: WakeWord[]) => void;
}

export function useWakeWord(
  onWakeWordDetected?: (result: WakeWordDetectionResult) => void
): UseWakeWordReturn {
  const [isListening, setIsListening] = useState(false);
  const [lastWakeWord, setLastWakeWord] = useState<WakeWord | null>(null);
  const detectorRef = useRef<SimpleWakeWordDetector | null>(null);

  const onWakeWordDetectedRef = useRef(onWakeWordDetected);
  
  useEffect(() => {
    onWakeWordDetectedRef.current = onWakeWordDetected;
  }, [onWakeWordDetected]);

  useEffect(() => {
    // Initialize detector
    try {
      console.log('[useWakeWord] Initializing detector...');
      detectorRef.current = new SimpleWakeWordDetector();

      detectorRef.current.onDetection((result) => {
        console.log('[useWakeWord] Wake word detected:', result);
        setLastWakeWord(result.wakeWord || null);
        onWakeWordDetectedRef.current?.(result);
      });

      detectorRef.current.onError((error) => {
        if (error.message?.includes('no-speech')) return;
        console.error('[useWakeWord] Error:', error);
        setIsListening(false);
      });
    } catch (error) {
      console.error('[useWakeWord] Initialization failed:', error);
    }

    return () => {
      console.log('[useWakeWord] Cleaning up detector');
      detectorRef.current?.destroy();
    };
  }, []); // Only run once on mount

  const startListening = useCallback(async () => {
    if (!detectorRef.current) {
      console.error('[useWakeWord] Detector not initialized');
      return;
    }

    try {
      const defaultWords: WakeWord[] = ['jarvis', 'meera', 'ghost', 'computer'];
      await detectorRef.current.start(defaultWords);
      setIsListening(true);
    } catch (error) {
      console.error('[useWakeWord] Start failed:', error);
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!detectorRef.current) return;

    detectorRef.current.stop();
    setIsListening(false);
  }, []);

  const setEnabledWakeWords = useCallback((words: WakeWord[]) => {
    if (!detectorRef.current) return;
    detectorRef.current.setEnabledWakeWords(words);
  }, []);

  return {
    isListening,
    lastWakeWord,
    startListening,
    stopListening,
    setEnabledWakeWords,
  };
}
