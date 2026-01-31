import { useState, useCallback } from 'react';
import { useSTT } from './useSTT';
import { punctuateText } from '../utils/aiUtils';
import { invoke } from '@tauri-apps/api/core';
import { useResourceStore } from '../stores/useResourceStore';

export const useDictation = () => {
  const [isDictating, setIsDictating] = useState(false);
  const [lastTranscription, setLastTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const speak = useResourceStore(state => state.speak);

  const handleVoiceResult = useCallback(async (text: string, isFinal: boolean) => {
    if (!isFinal) return;
    
    setIsProcessing(true);
    try {
      console.log('[Dictation] Processing final transcript:', text);
      const punctuated = await punctuateText(text);
      console.log('[Dictation] Punctuated:', punctuated);
      
      // Send to foreground window
      await invoke('type_text', { text: punctuated + ' ' });
      setLastTranscription(punctuated);
    } catch (err) {
      console.error('[Dictation] Error during processing:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const { startListening, stopListening, isListening } = useSTT(handleVoiceResult);

  const startDictation = useCallback(() => {
    setIsDictating(true);
    startListening();
    speak('Dictation mode active.');
  }, [startListening, speak]);

  const stopDictation = useCallback(() => {
    setIsDictating(false);
    stopListening();
    speak('Dictation mode stopped.');
  }, [stopListening, speak]);

  const toggleDictation = useCallback(() => {
    if (isDictating) stopDictation();
    else startDictation();
  }, [isDictating, startDictation, stopDictation]);

  return {
    isDictating,
    isListening,
    isProcessing,
    lastTranscription,
    startDictation,
    stopDictation,
    toggleDictation
  };
};
