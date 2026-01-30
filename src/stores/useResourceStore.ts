import { create } from 'zustand';
import { KokoroTTS } from '../services/KokoroTTS';

interface ResourceState {
  tts: KokoroTTS | null;
  isTTSInitializing: boolean;
  ttsReady: boolean;
  ttsProgress: number;
  isSpeaking: boolean;
  initTTS: () => Promise<void>;
  speak: (text: string, voice?: string, speed?: number) => Promise<void>;
  stop: () => void;
}

export const useResourceStore = create<ResourceState>((set, get) => ({
  tts: null,
  isTTSInitializing: false,
  ttsReady: false,
  ttsProgress: 0,
  isSpeaking: false,

  initTTS: async () => {
    if (get().tts || get().isTTSInitializing) return;
    
    const start = performance.now();
    set({ isTTSInitializing: true, ttsProgress: 0 });
    
    try {
      console.log("[ResourceStore] Pre-loading Kokoro TTS (82M ONNX with fp32)...");
      
      const ttsInstance = new KokoroTTS();
      
      // Initialize with progress tracking
      await ttsInstance.initialize((progress) => {
        set({ ttsProgress: progress });
      });
      
      const duration = performance.now() - start;
      console.log(`[ResourceStore] Kokoro TTS Loaded in ${duration.toFixed(2)}ms`);
      
      set({ tts: ttsInstance, ttsReady: true, ttsProgress: 100 });
    } catch (error) {
      console.error("[ResourceStore] TTS Initialization failed:", error);
      set({ tts: null, ttsReady: false });
    } finally {
      set({ isTTSInitializing: false });
    }
  },

  speak: async (text: string, voice = 'af_heart', speed = 1.0) => {
    const { tts } = get();
    if (!tts) {
      console.warn("[ResourceStore] Speak requested before TTS engine is ready.");
      return;
    }

    try {
      set({ isSpeaking: true });
      
      // Interrupt any current audio
      const existingContext = (window as any).currentAudioContext;
      if (existingContext) {
        try { existingContext.close(); } catch (e) {}
      }

      const { audio: audioData, sampling_rate } = await tts.speak(text, voice, speed);

      const audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      (window as any).currentAudioContext = audioContext;
      
      const audioBuffer = audioContext.createBuffer(1, audioData.length, sampling_rate);
      audioBuffer.getChannelData(0).set(audioData);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      source.onended = () => {
        set({ isSpeaking: false });
        if ((window as any).currentAudioContext === audioContext) {
          audioContext.close();
          (window as any).currentAudioContext = null;
        }
      };

      source.start();
    } catch (error) {
      console.error("[ResourceStore] TTS Playback failed:", error);
      set({ isSpeaking: false });
    }
  },

  stop: () => {
    const audioContext = (window as any).currentAudioContext;
    if (audioContext) {
      try { audioContext.close(); } catch (e) {}
      (window as any).currentAudioContext = null;
    }
    set({ isSpeaking: false });
  },
}));
