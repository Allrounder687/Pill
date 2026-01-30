import { useState, useCallback } from "react";
import { useResourceStore } from "../stores/useResourceStore";
import { useAppStore } from "../stores/useAppStore";
import { useShallow } from "zustand/react/shallow";

export const useTTS = () => {
  const { isTTSInitializing, ttsReady, speak: storeSpeak, stop: storeStop, isSpeaking } = useResourceStore(
    useShallow(state => ({
      isTTSInitializing: state.isTTSInitializing,
      ttsReady: state.ttsReady,
      speak: state.speak,
      stop: state.stop,
      isSpeaking: state.isSpeaking,
    }))
  );
  
  const selectedVoice = useAppStore(state => state.selectedVoice);
  const voiceSpeed = useAppStore(state => state.voiceSpeed);

  const speak = useCallback(
    async (text: string, voice = selectedVoice, speed = voiceSpeed) => {
      await storeSpeak(text, voice, speed);
    },
    [storeSpeak, selectedVoice, voiceSpeed],
  );

  return {
    speak,
    stop: storeStop,
    isInitializing: isTTSInitializing,
    isSpeaking,
    ready: ttsReady,
  };
};

