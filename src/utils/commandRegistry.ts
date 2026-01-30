import { open } from '@tauri-apps/plugin-shell';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../stores/useAppStore';

export interface Command {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: (query?: string) => Promise<{ keepOpen?: boolean; newQuery?: string } | void> | { keepOpen?: boolean; newQuery?: string } | void;
  keywords: string[];
  category?: 'voice' | 'system' | 'app' | 'web';
}

// Helper function to play audio using Web Audio API
function playAudio(audioData: Float32Array, samplingRate: number) {
  // Close any existing audio context
  const existingContext = (window as any).currentAudioContext;
  if (existingContext) {
    existingContext.close();
  }
  
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  (window as any).currentAudioContext = audioContext; // Store globally for interrupt
  
  const audioBuffer = audioContext.createBuffer(1, audioData.length, samplingRate);
  audioBuffer.getChannelData(0).set(audioData);

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);

  source.onended = () => {
    audioContext.close();
    if ((window as any).currentAudioContext === audioContext) {
      (window as any).currentAudioContext = null;
    }
  };

  source.start();
}

// Voice samples for testing
const VOICE_SAMPLES = {
  'af_heart': 'Hello! I am Heart, your premium voice assistant.',
  'af_bella': 'Hi there! Bella here, ready to help you today.',
  'af_nicole': 'Good day. Nicole speaking, at your service.',
  'bf_emma': 'Hello! I\'m Emma, your British voice assistant.',
  'af_sky': 'Hey! Sky here, let\'s get things done!',
  'am_adam': 'Hello, I am Adam. How may I assist you?',
  'bm_george': 'Good afternoon. George here, ready to help.',
};

export const getCommands = (): Command[] => [
  // Voice Commands
  {
    id: 'test_voice_heart',
    title: 'Test Voice: Heart (Premium)',
    description: 'Try the premium af_heart voice',
    icon: '❤️',
    action: async () => {
      const { useResourceStore } = await import('../stores/useResourceStore');
      const tts = useResourceStore.getState().tts;
      if (tts) {
        const { audio, sampling_rate } = await tts.speak(VOICE_SAMPLES['af_heart'], 'af_heart');
        playAudio(audio, sampling_rate);
      }
    },
    keywords: ['voice', 'test', 'heart', 'premium', 'tts', 'speak'],
    category: 'voice'
  },
  {
    id: 'test_voice_bella',
    title: 'Test Voice: Bella (Warm)',
    description: 'Try the warm af_bella voice',
    icon: '🔥',
    action: async () => {
      const { useResourceStore } = await import('../stores/useResourceStore');
      const tts = useResourceStore.getState().tts;
      if (tts) {
        const { audio, sampling_rate } = await tts.speak(VOICE_SAMPLES['af_bella'], 'af_bella');
        playAudio(audio, sampling_rate);
      }
    },
    keywords: ['voice', 'test', 'bella', 'warm', 'tts', 'speak'],
    category: 'voice'
  },
  {
    id: 'test_voice_emma',
    title: 'Test Voice: Emma (British)',
    description: 'Try the British bf_emma voice',
    icon: '🇬🇧',
    action: async () => {
      const { useResourceStore } = await import('../stores/useResourceStore');
      const tts = useResourceStore.getState().tts;
      if (tts) {
        const { audio, sampling_rate } = await tts.speak(VOICE_SAMPLES['bf_emma'], 'bf_emma');
        playAudio(audio, sampling_rate);
      }
    },
    keywords: ['voice', 'test', 'emma', 'british', 'uk', 'tts', 'speak'],
    category: 'voice'
  },
  {
    id: 'speak_custom',
    title: 'Speak Text',
    description: 'Have Jarvis speak your custom text',
    icon: '🗣️',
    action: async (query) => {
      const text = query?.replace(/speak\s*/i, '').trim() || 'Please enter some text to speak';
      const { useResourceStore } = await import('../stores/useResourceStore');
      const tts = useResourceStore.getState().tts;
      if (tts) {
        const { audio, sampling_rate } = await tts.speak(text, 'af_heart');
        playAudio(audio, sampling_rate);
      }
    },
    keywords: ['speak', 'say', 'voice', 'tts', 'read', 'talk'],
    category: 'voice'
  },
  {
    id: 'list_voices',
    title: 'Show Available Voices',
    description: 'Display all 54 Kokoro voices',
    icon: '🎤',
    action: () => {
      console.log('Available voices:', Object.keys(VOICE_SAMPLES));
      // This could open a modal or settings panel
      import('./windowManager').then(({ windowManager }) => {
        windowManager.openSettings();
      });
    },
    keywords: ['voices', 'list', 'available', 'tts', 'kokoro'],
    category: 'voice'
  },
  
  // Web Commands
  {
    id: 'search_web',
    title: 'Search Web',
    description: 'Search the web for topics',
    icon: '🌐',
    action: (query) => {
      const searchTerm = query || '';
      open(`https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`);
    },
    keywords: ['search', 'google', 'find', 'web'],
    category: 'web'
  },
  
  {
    id: 'open_app',
    title: 'Open Application',
    description: 'Launch an installed app by name',
    icon: '🚀',
    action: async (query) => {
      // Clean query: remove command words and trailing punctuation
      const cleanQuery = query?.replace(/[.,!?;:]/g, '').trim() || '';
      const appName = cleanQuery.replace(/launch|open|start|run/i, '').trim().toLowerCase();
      
      console.log(`[Launcher] Searching for: "${appName}" (Cleaned from: "${query}")`);
      
      if (!appName) {
        console.warn('[Launcher] No app name provided');
        return;
      }
      
      const apps = useAppStore.getState().installedApps;
      
      // Find all matches
      const matches = apps.filter(a => 
        a.name.toLowerCase() === appName || 
        a.name.toLowerCase().startsWith(appName) || 
        a.name.toLowerCase().includes(appName)
      );
      
      // If we have multiple matches, check for a single perfect match
      let targetApp = matches.find(a => a.name.toLowerCase() === appName);
      
      // If no perfect match but we have multiple candidates, be smart
      if (!targetApp && matches.length > 1) {
        console.log(`[Launcher] 🚩 Ambiguous match: found ${matches.length} apps for "${appName}"`);
        
        const { useResourceStore } = await import('../stores/useResourceStore');
        const count = matches.length;
        useResourceStore.getState().speak(`I found ${count} applications matching ${appName}. Which one did you mean?`);
        
        // Return instruction to keep open and show results
        return { keepOpen: true, newQuery: appName };
      }

      // If exactly one match, use it
      if (!targetApp && matches.length === 1) {
        targetApp = matches[0];
      }

      if (targetApp) {
        console.log(`[Launcher] ✅ Found match: "${targetApp.name}"`);
        try {
          await invoke('launch_app', { path: targetApp.path });
          console.log(`[Launcher] 🚀 Success: ${targetApp.name} launched.`);
        } catch (err) {
          console.error(`[Launcher] ❌ Backend error:`, err);
        }
      } else {
        console.warn(`[Launcher] ❓ No local app for "${appName}". Falling back to Web Search.`);
        
        // Notify user of fallback
        const { useResourceStore } = await import('../stores/useResourceStore');
        useResourceStore.getState().speak(`Searching the web for ${appName}`, 'af_heart');
        
        // Execute web search
        open(`https://www.google.com/search?q=${encodeURIComponent(appName)}`);
      }
    },
    keywords: ['open', 'launch', 'start', 'run'],
    category: 'app'
  },
  
  // Interrupt Commands
  {
    id: 'stop_talking',
    title: 'Stop Talking',
    description: 'Stop the voice assistant from speaking',
    icon: '🤫',
    action: () => {
      // Stop all audio playback
      const audioContext = (window as any).currentAudioContext;
      if (audioContext) {
        audioContext.close();
        (window as any).currentAudioContext = null; // Clear reference
      }
      console.log('🤫 [Command] Stopped TTS playback');
    },
    keywords: ['stop', 'shush', 'shut up', 'be quiet', 'stop talking', 'enough', 'silence'],
    category: 'voice',
  },

  // System Commands
  {
    id: 'set_timer',
    title: 'Set Timer',
    description: 'Start a countdown timer',
    icon: '⏲️',
    action: () => console.log('Setting timer...'),
    keywords: ['timer', 'countdown', 'time', 'alarm'],
    category: 'system'
  },
  {
    id: 'toggle_dark_mode',
    title: 'Toggle Dark Mode',
    description: 'Switch between light and dark themes',
    icon: '🌙',
    action: () => {
      document.documentElement.classList.toggle('dark-theme');
    },
    keywords: ['theme', 'dark', 'light', 'appearance'],
    category: 'system'
  },
  {
    id: 'system_info',
    title: 'System Info',
    description: 'Show system resource usage',
    icon: '📊',
    action: () => console.log('Showing system info...'),
    keywords: ['system', 'info', 'cpu', 'memory', 'usage'],
    category: 'system'
  },
  {
    id: 'open_settings',
    title: 'Settings',
    description: 'Configure Jarvis and extensions',
    icon: '⚙️',
    action: () => {
      console.log('Settings command triggered');
      import('./windowManager').then(({ windowManager }) => {
        windowManager.openSettings();
      });
    },
    keywords: ['settings', 'config', 'setup', 'options'],
    category: 'system'
  }
];
