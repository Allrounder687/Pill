import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../stores/useAppStore';
import { useResourceStore } from '../stores/useResourceStore';
import { WINDOWS_SETTINGS, DEEP_WINDOWS_TOOLS, POWER_COMMANDS, MEDIA_COMMANDS, PROCESS_COMMANDS } from './commands/system';
import { WEB_COMMANDS } from './commands/web';
import { APP_COMMANDS } from './commands/apps';

export interface Command {
  id: string;
  title: string;
  description: string;
  icon: string | React.ReactNode;
  iconUrl?: string;
  action: (query?: string) => Promise<{ keepOpen?: boolean; newQuery?: string; suppressOutput?: boolean } | void> | { keepOpen?: boolean; newQuery?: string; suppressOutput?: boolean } | void;
  keywords: string[];
  category?: 'voice' | 'system' | 'app' | 'web' | 'win-settings' | 'voice-test' | 'ai';
  component?: React.ComponentType<{ onQueryChange: (q: string) => void, data?: any }>;
  interactiveData?: any;
}

export const playAudio = (audioData: Float32Array, samplingRate: number) => {
  const existingContext = (window as any).currentAudioContext;
  if (existingContext) existingContext.close();
  
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  (window as any).currentAudioContext = audioContext; 
  
  const audioBuffer = audioContext.createBuffer(1, audioData.length, samplingRate);
  audioBuffer.getChannelData(0).set(audioData);

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.onended = () => {
    audioContext.close();
    if ((window as any).currentAudioContext === audioContext) (window as any).currentAudioContext = null;
  };
  source.start();
}

const VOICE_SAMPLES = {
  'af_heart': 'Hello! I am Heart, your premium voice assistant.',
} as const;

export const getCommands = (): Command[] => [
  {
    id: 'test_voice_heart',
    title: 'Test Voice: Heart',
    description: 'Try the premium af_heart voice',
    icon: '❤️',
    action: async () => {
      const tts = useResourceStore.getState().tts;
      if (tts) {
        const { audio, sampling_rate } = await tts.speak(VOICE_SAMPLES['af_heart'], 'af_heart');
        playAudio(audio, sampling_rate);
      }
    },
    keywords: ['voice', 'test', 'heart', 'tts'],
    category: 'voice'
  },
  {
    id: 'stop_talking',
    title: 'Stop Talking',
    description: 'Silence the assistant',
    icon: '🤫',
    action: () => {
      const audioContext = (window as any).currentAudioContext;
      if (audioContext) {
        audioContext.close();
        (window as any).currentAudioContext = null;
      }
    },
    keywords: ['stop', 'shush', 'quiet', 'silence'],
    category: 'voice'
  },
  {
    id: 'open_settings',
    title: 'App Settings',
    description: 'Configure Nexus Bar',
    icon: '⚙️',
    action: async () => {
      import('./windowManager').then(({ windowManager }) => windowManager.openSettings());
      return { suppressOutput: true };
    },
    keywords: ['settings', 'config', 'setup'],
    category: 'system'
  },
  ...APP_COMMANDS,
  ...WINDOWS_SETTINGS,
  ...DEEP_WINDOWS_TOOLS,
  ...POWER_COMMANDS,
  ...MEDIA_COMMANDS,
  ...WEB_COMMANDS,
  ...PROCESS_COMMANDS,

  // Dynamically add installed apps
  ...useAppStore.getState().installedApps.map(app => {
    const isGame = app.category === 'game';
    const isLauncher = app.category === 'launcher';
    const isMidnight = app.name.toLowerCase().includes('midnightpad');
    
    // Clean name for better display (e.g., WWE2K25_x64 -> WWE 2K25)
    let displayName = app.name;
    if (isGame) {
        displayName = displayName.replace(/_x64$/i, '').replace(/_x86$/i, '');
    }

    return {
      id: `app-${app.name.toLowerCase().replace(/\s+/g, '-')}-${app.path.length}`,
      title: displayName,
      description: isGame ? `Play ${displayName}` : isLauncher ? `Open ${displayName}` : `Launch ${displayName}`,
      icon: isGame ? '🎮' : isLauncher ? '🚀' : '📦',
      iconUrl: app.iconUrl,
      action: async () => {
        useResourceStore.getState().speak(`Opening ${displayName}`);
        try { await invoke('launch_app', { path: app.path }); } catch (err) { console.error(err); }
        return { suppressOutput: true };
      },
      keywords: [
        'open', 'launch', app.name.toLowerCase(), displayName.toLowerCase(),
        ...(isGame || isMidnight ? ['games', 'gaming', 'play'] : []),
        ...(isLauncher ? ['launcher', 'platform', 'store'] : [])
      ],
      category: 'app' as const
    };
  })
];
