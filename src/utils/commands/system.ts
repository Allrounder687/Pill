import { invoke } from '@tauri-apps/api/core';
import { useResourceStore } from '../../stores/useResourceStore';
import type { Command } from '../commandRegistry';
import { parseAnyNumber } from '../voiceUtils';

async function launchWithSpeech(title: string, path: string) {
  useResourceStore.getState().speak(`Opening ${title}`);
  try {
    await invoke('launch_app', { path });
  } catch (err) { console.error(err); }
  return { suppressOutput: true };
}

export const WINDOWS_SETTINGS: Command[] = [
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

export const DEEP_WINDOWS_TOOLS: Command[] = [
  { id: 'win-registry', title: 'Registry Editor', description: 'Advanced system configuration (regedit)', icon: '🔑', keywords: ['registry', 'regedit', 'database', 'advanced'], action: () => launchWithSpeech('Registry Editor', 'regedit.exe') },
  { id: 'win-device-manager', title: 'Device Manager', description: 'Maintain hardware drivers', icon: '🛠️', keywords: ['device manager', 'drivers', 'hardware', 'peripherals'], action: () => launchWithSpeech('Device Manager', 'devmgmt.msc') },
  { id: 'win-control-panel', title: 'Control Panel', description: 'Legacy system settings', icon: '🎛️', keywords: ['control panel', 'legacy', 'older settings'], action: () => launchWithSpeech('Control Panel', 'control.exe') },
  { id: 'win-taskmgr', title: 'Task Manager', description: 'Monitor processes and performance', icon: '📈', keywords: ['task manager', 'processes', 'performance', 'cpu', 'kill app'], action: () => launchWithSpeech('Task Manager', 'taskmgr.exe') },
  { id: 'win-firewall-adv', title: 'Advanced Firewall', description: 'Deep network security rules', icon: '🔥', keywords: ['firewall', 'security', 'advanced firewall', 'port', 'rules'], action: () => launchWithSpeech('Advanced Firewall', 'wf.msc') },
  { id: 'win-services', title: 'Services', description: 'Manage background system services', icon: '⚙️', keywords: ['services', 'background', 'daemon', 'system services'], action: () => launchWithSpeech('System Services', 'services.msc') },
  { id: 'win-disk-mgmt', title: 'Disk Management', description: 'Format and partition drives', icon: '💿', keywords: ['disk management', 'partition', 'format', 'drive'], action: () => launchWithSpeech('Disk Management', 'diskmgmt.msc') },
  { id: 'win-dxdiag', title: 'DirectX Diagnostics', description: 'Check graphics and sound info', icon: '🎮', keywords: ['dxdiag', 'directx', 'graphics info', 'video card'], action: () => launchWithSpeech('DirectX Diagnostics', 'dxdiag.exe') },
];

export const POWER_COMMANDS: Command[] = [
  { id: 'sys-shutdown', title: 'Shutdown', description: 'Power off the system', icon: '🛑', action: () => launchWithSpeech('System', 'shutdown /s /t 0'), keywords: ['shutdown', 'power off', 'turn off'], category: 'system' },
  { id: 'sys-restart', title: 'Restart', description: 'Reboot the system', icon: '🔄', action: () => launchWithSpeech('System', 'shutdown /r /t 0'), keywords: ['restart', 'reboot'], category: 'system' },
  { id: 'sys-lock', title: 'Lock Windows', description: 'Lock the workstation', icon: '🔒', action: () => launchWithSpeech('Computer', 'rundll32.exe user32.dll,LockWorkStation'), keywords: ['lock', 'screen lock'], category: 'system' },
  { id: 'sys-hibernate', title: 'Hibernate', description: 'Suspend to disk', icon: '🌙', action: () => launchWithSpeech('System', 'shutdown /h'), keywords: ['hibernate'], category: 'system' },
  { id: 'sys-sleep', title: 'Sleep', description: 'Put the computer to sleep', icon: '🛌', action: () => launchWithSpeech('System', 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0'), keywords: ['sleep', 'suspend'], category: 'system' },
  { id: 'sys-signout', title: 'Sign Out', description: 'Log off current user', icon: '👤', action: () => launchWithSpeech('User', 'shutdown /l'), keywords: ['signout', 'logoff', 'logout'], category: 'system' },
];

export const MEDIA_COMMANDS: Command[] = [
  { id: 'media-play', title: 'Play/Pause', description: 'Toggle media playback', icon: '⏯️', action: () => invoke('system_media_control', { action: 'play_pause' }), keywords: ['play', 'pause', 'resume', 'stop'], category: 'system' },
  { id: 'media-next', title: 'Next Track', description: 'Skip to next track', icon: '⏭️', action: () => invoke('system_media_control', { action: 'next' }), keywords: ['next', 'skip', 'forward'], category: 'system' },
  { id: 'media-prev', title: 'Previous Track', description: 'Go back to previous track', icon: '⏮️', action: () => invoke('system_media_control', { action: 'prev', repeat: 1 }), keywords: ['previous', 'back', 'prev'], category: 'system' },
  { id: 'media-vol-up', title: 'Volume Up', description: 'Increase system volume', icon: '🔊', action: (q) => {
    const rawNum = parseAnyNumber(q || '') || 4;
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

export const PROCESS_COMMANDS: Command[] = [
  {
    id: 'kill_app',
    title: 'Kill Application',
    description: 'Terminate a running process by name',
    icon: '💀',
    action: async (query) => {
      const targetName = query?.replace(/[.,!?;:]/g, '').replace(/kill|terminate|stop|end|close/i, '').trim().toLowerCase();
      if (!targetName) return;
      try {
        await invoke('kill_process_by_name', { name: targetName });
        useResourceStore.getState().speak(`Terminated ${targetName}`);
      } catch (err) {
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
      try {
        const processes = await invoke<any[]>('list_processes');
        const top3 = processes.slice(0, 3).map(p => p.name).join(', ');
        useResourceStore.getState().speak(`The top processes are ${top3}. Which one would you like to terminate?`);
        return { keepOpen: true, newQuery: 'kill ' };
      } catch (err) {
        useResourceStore.getState().speak(`Failed to retrieve process list.`);
      }
    },
    keywords: ['processes', 'status', 'usage', 'cpu', 'memory', 'running apps'],
    category: 'system'
  },
  {
    id: 'dictate-mode',
    title: 'Dictate Mode',
    description: 'Transcribe speech with autopunctuation into active app',
    icon: '🎤',
    action: () => {
        // This will be handled in the CommandPalette or a global state
        return { keepOpen: true, newQuery: 'dictate' };
    },
    keywords: ['dictate', 'voice to text', 'typing', 'speech', 'write'],
    category: 'system'
  },
];
