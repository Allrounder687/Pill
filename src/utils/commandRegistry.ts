import { open } from '@tauri-apps/plugin-shell';
import { invoke } from '@tauri-apps/api/core';
import { useConfigStore } from '../stores/useConfigStore';
import { useAppStore } from '../stores/useAppStore';
import { parseAnyNumber } from './voiceUtils';

export interface Command {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconUrl?: string;
  action: (query?: string) => Promise<{ keepOpen?: boolean; newQuery?: string; suppressOutput?: boolean } | void> | { keepOpen?: boolean; newQuery?: string; suppressOutput?: boolean } | void;
  keywords: string[];
  category?: 'voice' | 'system' | 'app' | 'web' | 'win-settings';
}

// Helper function to play audio using Web Audio API
function playAudio(audioData: Float32Array, samplingRate: number) {
  const existingContext = (window as any).currentAudioContext;
  if (existingContext) {
    existingContext.close();
  }
  
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  (window as any).currentAudioContext = audioContext; 
  
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

const VOICE_SAMPLES = {
  'af_heart': 'Hello! I am Heart, your premium voice assistant.',
  'af_bella': 'Hi there! Bella here, ready to help you today.',
  'af_nicole': 'Good day. Nicole speaking, at your service.',
  'bf_emma': 'Hello! I\'m Emma, your British voice assistant.',
  'af_sky': 'Hey! Sky here, let\'s get things done!',
  'am_adam': 'Hello, I am Adam. How may I assist you?',
  'bm_george': 'Good afternoon. George here, ready to help.',
};

// Helper for standard system launches with voice feedback
async function launchWithSpeech(title: string, path: string) {
  const { useResourceStore } = await import('../stores/useResourceStore');
  useResourceStore.getState().speak(`Opening ${title}`);
  try {
    await invoke('launch_app', { path });
  } catch (err) { console.error(err); }
  return { suppressOutput: true };
}

// Windows Direct Settings (ms-settings)
const WINDOWS_SETTINGS: Command[] = [
  { id: 'win-display', title: 'Display Settings', description: 'Resolution, brightness, and multiple displays', icon: '🖥️', keywords: ['display', 'monitor', 'brightness', 'resolution', 'screen'], action: () => launchWithSpeech('Display Settings', 'ms-settings:display') },
  { id: 'win-sound', title: 'Sound Settings', description: 'Volume, input/output devices', icon: '🔊', keywords: ['sound', 'volume', 'speaker', 'microphone', 'audio'], action: () => launchWithSpeech('Sound Settings', 'ms-settings:sound') },
  { id: 'win-wifi', title: 'Wi-Fi Settings', description: 'Manage wireless networks', icon: '📶', keywords: ['wifi', 'internet', 'wireless', 'network', 'connection'], action: () => launchWithSpeech('Wi-Fi Settings', 'ms-settings:network-wifi') },
  { id: 'win-bluetooth', title: 'Bluetooth Settings', description: 'Manage connected devices', icon: '🎧', keywords: ['bluetooth', 'devices', 'pairing', 'headset', 'mouse'], action: () => launchWithSpeech('Bluetooth Settings', 'ms-settings:bluetooth') },
  { id: 'win-themes', title: 'Windows Themes', description: 'Change colors, wallpaper, and look', icon: '🎨', keywords: ['theme', 'wallpaper', 'background', 'color', 'dark mode', 'personalization'], action: () => launchWithSpeech('Windows Themes', 'ms-settings:themes') },
  { id: 'win-apps', title: 'Apps & Features', description: 'Uninstall or manage applications', icon: '📦', keywords: ['apps', 'uninstall', 'programs', 'features', 'manage apps'], action: () => launchWithSpeech('Apps and Features', 'ms-settings:appsfeatures') },
  { id: 'win-update', title: 'Windows Update', description: 'Check for system updates', icon: '🔄', keywords: ['update', 'windows update', 'check for updates', 'patch'], action: () => launchWithSpeech('Windows Update', 'ms-settings:windowsupdate') },
  { id: 'win-security', title: 'Windows Security', description: 'Antivirus and firewall protection', icon: '🛡️', keywords: ['security', 'antivirus', 'firewall', 'protection', 'defender'], action: () => launchWithSpeech('Windows Security', 'ms-settings:windowsdefender') },
  { id: 'win-storage', title: 'Storage Settings', description: 'Manage disk space and cleanup', icon: '💾', keywords: ['storage', 'disk', 'space', 'cleanup', 'hard drive'], action: () => launchWithSpeech('Storage Settings', 'ms-settings:storagesummary') },
  { id: 'win-power', title: 'Power & Sleep', description: 'Screen timeout and power plans', icon: '🔋', keywords: ['power', 'sleep', 'battery', 'timeout', 'energy'], action: () => launchWithSpeech('Power and Sleep Settings', 'ms-settings:powersleep') },
  { id: 'win-fonts', title: 'Font Settings', description: 'View and install system fonts', icon: '🔤', keywords: ['fonts', 'typography', 'text'], action: () => launchWithSpeech('Font Settings', 'ms-settings:fonts') },
  { id: 'win-notifications', title: 'Notifications', description: 'Focus assist and app alerts', icon: '🔔', keywords: ['notifications', 'alerts', 'focus assist', 'do not disturb'], action: () => launchWithSpeech('Notifications', 'ms-settings:notifications') },
  { id: 'win-backup', title: 'Windows Backup', description: 'Sync settings and file backup', icon: '☁️', keywords: ['backup', 'sync', 'onedrive', 'restore'], action: () => launchWithSpeech('Windows Backup', 'ms-settings:backup') },
];

// Windows Legacy / Deep Tools (.cpl and .msc)
const DEEP_WINDOWS_TOOLS: Command[] = [
  { id: 'win-registry', title: 'Registry Editor', description: 'Advanced system configuration (regedit)', icon: '🔑', keywords: ['registry', 'regedit', 'database', 'advanced'], action: () => launchWithSpeech('Registry Editor', 'regedit.exe') },
  { id: 'win-device-manager', title: 'Device Manager', description: 'Maintain hardware drivers', icon: '🛠️', keywords: ['device manager', 'drivers', 'hardware', 'peripherals'], action: () => launchWithSpeech('Device Manager', 'devmgmt.msc') },
  { id: 'win-control-panel', title: 'Control Panel', description: 'Legacy system settings', icon: '🎛️', keywords: ['control panel', 'legacy', 'older settings'], action: () => launchWithSpeech('Control Panel', 'control.exe') },
  { id: 'win-taskmgr', title: 'Task Manager', description: 'Monitor processes and performance', icon: '📈', keywords: ['task manager', 'processes', 'performance', 'cpu', 'kill app'], action: () => launchWithSpeech('Task Manager', 'taskmgr.exe') },
  { id: 'win-firewall-adv', title: 'Advanced Firewall', description: 'Deep network security rules', icon: '🔥', keywords: ['firewall', 'security', 'advanced firewall', 'port', 'rules'], action: () => launchWithSpeech('Advanced Firewall', 'wf.msc') },
  { id: 'win-services', title: 'Services', description: 'Manage background system services', icon: '⚙️', keywords: ['services', 'background', 'daemon', 'system services'], action: () => launchWithSpeech('System Services', 'services.msc') },
  { id: 'win-disk-mgmt', title: 'Disk Management', description: 'Format and partition drives', icon: '💿', keywords: ['disk management', 'partition', 'format', 'drive'], action: () => launchWithSpeech('Disk Management', 'diskmgmt.msc') },
  { id: 'win-dxdiag', title: 'DirectX Diagnostics', description: 'Check graphics and sound info', icon: '🎮', keywords: ['dxdiag', 'directx', 'graphics info', 'video card'], action: () => launchWithSpeech('DirectX Diagnostics', 'dxdiag.exe') },
];

const POWER_COMMANDS: Command[] = [
  { id: 'sys-shutdown', title: 'Shutdown', description: 'Power off the system', icon: '🛑', action: () => launchWithSpeech('System', 'shutdown /s /t 0'), keywords: ['shutdown', 'power off', 'turn off'], category: 'system' },
  { id: 'sys-restart', title: 'Restart', description: 'Reboot the system', icon: '🔄', action: () => launchWithSpeech('System', 'shutdown /r /t 0'), keywords: ['restart', 'reboot'], category: 'system' },
  { id: 'sys-lock', title: 'Lock Windows', description: 'Lock the workstation', icon: '🔒', action: () => launchWithSpeech('Computer', 'rundll32.exe user32.dll,LockWorkStation'), keywords: ['lock', 'screen lock'], category: 'system' },
  { id: 'sys-hibernate', title: 'Hibernate', description: 'Suspend to disk', icon: '🌙', action: () => launchWithSpeech('System', 'shutdown /h'), keywords: ['hibernate'], category: 'system' },
  { id: 'sys-sleep', title: 'Sleep', description: 'Put the computer to sleep', icon: '🛌', action: () => launchWithSpeech('System', 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0'), keywords: ['sleep', 'suspend'], category: 'system' },
  { id: 'sys-signout', title: 'Sign Out', description: 'Log off current user', icon: '👤', action: () => launchWithSpeech('User', 'shutdown /l'), keywords: ['signout', 'logoff', 'logout'], category: 'system' },
];

const MEDIA_COMMANDS: Command[] = [
  { id: 'media-play', title: 'Play/Pause', description: 'Toggle media playback', icon: '⏯️', action: () => invoke('system_media_control', { action: 'play_pause' }), keywords: ['play', 'pause', 'resume', 'stop'], category: 'system' },
  { id: 'media-next', title: 'Next Track', description: 'Skip to next track', icon: '⏭️', action: () => invoke('system_media_control', { action: 'next' }), keywords: ['next', 'skip', 'forward'], category: 'system' },
  { id: 'media-prev', title: 'Previous Track', description: 'Go back to previous track', icon: '⏮️', action: () => invoke('system_media_control', { action: 'prev', repeat: 1 }), keywords: ['previous', 'back', 'prev'], category: 'system' },
  { id: 'media-vol-up', title: 'Volume Up', description: 'Increase system volume', icon: '🔊', action: (q) => {
    const rawNum = parseAnyNumber(q || '') || 4;
    // Each Windows volume keypress is 2%. We divide by 2 to match user's expected percentage.
    const repeats = Math.max(1, Math.round(rawNum / 2));
    return invoke('system_media_control', { action: 'volume_up', repeat: repeats });
  }, keywords: ['volume up', 'louder', 'increase volume'], category: 'system' },
  { id: 'media-vol-down', title: 'Volume Down', description: 'Decrease system volume', icon: '🔉', action: (q) => {
    const rawNum = parseAnyNumber(q || '') || 4;
    const repeats = Math.max(1, Math.round(rawNum / 2));
    return invoke('system_media_control', { action: 'volume_down', repeat: repeats });
  }, keywords: ['volume down', 'quieter', 'lower volume'], category: 'system' },
  { id: 'media-mute', title: 'Mute', description: 'Toggle system mute', icon: '🔇', action: () => invoke('system_media_control', { action: 'volume_mute' }), keywords: ['mute', 'silent', 'unmute'], category: 'system' },
];

const WEB_COMMANDS: Command[] = [
  { 
    id: 'web-search', 
    title: 'Web Search', 
    description: 'Search the web using Google', 
    icon: '🔍', 
    iconUrl: 'https://www.google.com/s2/favicons?domain=google.com&sz=64',
    action: async (q) => {
      const query = q?.replace(/^(search for|search|google)\s+/i, '').trim();
      if (query) {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
      }
    }, 
    keywords: ['search', 'google', 'find'], 
    category: 'web' 
  },
  { 
    id: 'youtube-search', 
    title: 'YouTube Search', 
    description: 'Search for videos on YouTube', 
    icon: '📺', 
    iconUrl: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64',
    action: async (q) => {
      const query = q?.replace(/^(youtube search|search youtube for|youtube)\s+/i, '').trim();
      if (query) {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
      }
    }, 
    keywords: ['youtube', 'video', 'watch'], 
    category: 'web' 
  },
  { 
    id: 'media-play-direct', 
    title: 'Play Video', 
    description: 'Directly play the top result for a query', 
    icon: '🎬', 
    iconUrl: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64',
    action: async (q) => {
      const query = q?.replace(/^(play|play video|watch|listen to)\s+/i, '').trim();
      if (query) {
        const { open } = await import('@tauri-apps/plugin-shell');
        const { invoke } = await import('@tauri-apps/api/core');

        try {
          // Attempt pinpoint accuracy via API
          const { youtubeApiKey } = useConfigStore.getState();
          const videoId = await invoke<string>('get_youtube_video_id', { 
            query, 
            apiKey: youtubeApiKey || undefined 
          });
          await open(`https://www.youtube.com/watch?v=${videoId}`);
          console.log(`[YouTube API] Accuracy achieved: Playing video ${videoId}`);
        } catch (err) {
          // Fallback to URL trick if API fails (e.g. no key)
          console.warn('[YouTube API] Fallback triggered:', err);
          const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`;
          await open(url);
        }
      }
    }, 
    keywords: ['play', 'watch', 'listen'], 
    category: 'web' 
  },
];

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
      const cleanQuery = query?.replace(/[.,!?;:]/g, '').trim() || '';
      const appName = cleanQuery.replace(/launch|open|start|run/i, '').trim().toLowerCase();
      
      if (!appName) return;
      const apps = useAppStore.getState().installedApps;
      
      const matches = apps.filter(a => 
        a.name.toLowerCase() === appName || 
        a.name.toLowerCase().startsWith(appName) || 
        a.name.toLowerCase().includes(appName)
      );
      
      let targetApp = matches.find(a => a.name.toLowerCase() === appName) || (matches.length === 1 ? matches[0] : null);
      
      if (targetApp) {
        console.log(`[Launcher] Match found: ${targetApp.name} (${targetApp.path})`);
        const { useResourceStore } = await import('../stores/useResourceStore');
        useResourceStore.getState().speak(`Opening ${targetApp.name}`);
        try {
          await invoke('launch_app', { path: targetApp.path });
        } catch (err) { console.error(err); }
        return { suppressOutput: true };
      }
      
      if (matches.length > 1) {
        const top3 = matches.slice(0, 3).map(a => a.name).join(', ');
        const message = `I found ${matches.length} apps. The top results are ${top3}. Which one did you mean?`;
        console.log(`[Launcher] Ambiguity: ${matches.length} matches found.`);
        const { useResourceStore } = await import('../stores/useResourceStore');
        useResourceStore.getState().speak(message);
        return { keepOpen: true, newQuery: appName };
      }

      const { useResourceStore } = await import('../stores/useResourceStore');
      useResourceStore.getState().speak(`Searching the web for ${appName}`, 'af_heart');
      open(`https://www.google.com/search?q=${encodeURIComponent(appName)}`).catch(console.error);
    },
    keywords: ['open', 'launch', 'start', 'run'],
    category: 'app'
  },
  
  {
    id: 'kill_app',
    title: 'Kill Application',
    description: 'Terminate a running process by name',
    icon: '💀',
    action: async (query) => {
      const cleanQuery = query?.replace(/[.,!?;:]/g, '').trim() || '';
      const targetName = cleanQuery.replace(/kill|terminate|stop|end|close/i, '').trim().toLowerCase();
      
      if (!targetName) return;
      
      const { invoke } = await import('@tauri-apps/api/core');
      const { useResourceStore } = await import('../stores/useResourceStore');
      
      try {
        await invoke('kill_process_by_name', { name: targetName });
        useResourceStore.getState().speak(`Terminated ${targetName}`);
      } catch (err) {
        console.error(err);
        useResourceStore.getState().speak(`Could not find a running app named ${targetName}`);
        return { keepOpen: true, newQuery: targetName };
      }
      return { suppressOutput: true };
    },
    keywords: ['kill', 'terminate', 'stop', 'end', 'close process'],
    category: 'system'
  },
  {
    id: 'list_processes',
    title: 'Show Processes',
    description: 'List top running processes and their resource usage',
    icon: '📊',
    action: async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const { useResourceStore } = await import('../stores/useResourceStore');
      
      try {
        const processes = await invoke<any[]>('list_processes');
        const top3 = processes.slice(0, 3).map(p => p.name).join(', ');
        useResourceStore.getState().speak(`The top processes are ${top3}. Which one would you like to terminate?`);
        return { keepOpen: true, newQuery: 'kill ' };
      } catch (err) {
        console.error(err);
        useResourceStore.getState().speak(`Failed to retrieve process list.`);
      }
    },
    keywords: ['processes', 'status', 'usage', 'cpu', 'memory', 'running apps'],
    category: 'system'
  },
  
  // Windows Settings & Deep Tools
  ...WINDOWS_SETTINGS,
  ...DEEP_WINDOWS_TOOLS,
  ...POWER_COMMANDS,
  ...MEDIA_COMMANDS,
  ...WEB_COMMANDS,

  {
    id: 'stop_talking',
    title: 'Stop Talking',
    description: 'Stop the voice assistant from speaking',
    icon: '🤫',
    action: () => {
      const audioContext = (window as any).currentAudioContext;
      if (audioContext) {
        audioContext.close();
        (window as any).currentAudioContext = null;
      }
    },
    keywords: ['stop', 'shush', 'shut up', 'be quiet', 'stop talking', 'enough', 'silence'],
    category: 'voice',
  },
  {
    id: 'open_settings',
    title: 'App Settings',
    description: 'Configure Jarvis and extensions',
    icon: '⚙️',
    action: async () => {
      const { useResourceStore } = await import('../stores/useResourceStore');
      useResourceStore.getState().speak(`Opening App Settings`);
      import('./windowManager').then(({ windowManager }) => {
        windowManager.openSettings();
      });
      return { suppressOutput: true };
    },
    keywords: ['settings', 'config', 'setup', 'options'],
    category: 'system'
  },

  // Dynamically add installed apps as first-class commands
  ...(useAppStore.getState().installedApps.map(app => ({
    id: `app-${app.name.toLowerCase().replace(/\s+/g, '-')}`,
    title: app.name,
    description: `Launch ${app.name}`,
    icon: '🚀',
    action: async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const { useResourceStore } = await import('../stores/useResourceStore');
      useResourceStore.getState().speak(`Opening ${app.name}`);
      try {
        await invoke('launch_app', { path: app.path });
      } catch (err) { console.error(err); }
      return { suppressOutput: true };
    },
    keywords: ['open', 'launch', app.name.toLowerCase()],
    category: 'app' as const
  })) as Command[])
];
