import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useEffect, Suspense, lazy, useCallback, useRef } from 'react';
import { listen, emit } from '@tauri-apps/api/event';
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { useAppStore } from './stores/useAppStore';
import { useResourceStore } from './stores/useResourceStore';
import { useWakeWord } from './hooks/useWakeWord';
import { useTTS } from './hooks/useTTS';
import Toaster from './components/Toaster/Toaster';
import CommandPalette from './components/CommandPalette/CommandPalette';
import './index.css';

const Settings = lazy(() => import('./pages/Settings/Settings'));

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("[ErrorBoundary] Crash:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="crash-screen">
          <h1>Identity Crisis</h1>
          <p>{this.state.error?.message || "A critical error occurred."}</p>
          <button onClick={() => window.location.reload()}>Reboot System</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const isSettings = window.location.pathname.includes('settings');
  const setPaletteVisible = useAppStore(state => state.setPaletteVisible);
  const setWakeWordDetected = useAppStore(state => state.setWakeWordDetected);
  const refreshApps = useAppStore(state => state.refreshApps);
  
  const setFollowSystemAppearance = useAppStore(state => state.setFollowSystemAppearance);
  const followSystemAppearance = useAppStore(state => state.followSystemAppearance);
  const setOpenAtLogin = useAppStore(state => state.setOpenAtLogin);
  const setShowInSystemTray = useAppStore(state => state.setShowInSystemTray);
  const setWindowMode = useAppStore(state => state.setWindowMode);
  
  const setShortcutSummon = useAppStore(state => state.setShortcutSummon);
  const shortcutSummon = useAppStore(state => state.shortcutSummon);
  const setShortcutPTT = useAppStore(state => state.setShortcutPTT);
  const shortcutPTT = useAppStore(state => state.shortcutPTT);

  const initTTS = useResourceStore(state => state.initTTS);
  const { speak } = useTTS();
  const shortcutsRegistered = useRef(false);
  const wakeWordStarted = useRef(false);

  // Appearance Sync
  useEffect(() => {
    if (followSystemAppearance) {
      document.documentElement.classList.remove('theme-forced-dark', 'theme-forced-light');
    } else {
      document.documentElement.classList.add('theme-forced-dark');
    }
  }, [followSystemAppearance]);

  // Global Shortcut Management
  useEffect(() => {
    if (isSettings) return;

    const setupShortcuts = async () => {
      if (isSettings) return;
      
      try {
        const { isRegistered } = await import('@tauri-apps/plugin-global-shortcut');

        const manageShortcut = async (key: string, callback: (event: any) => void) => {
          if (!key) return;
          try {
            const registered = await isRegistered(key);
            if (registered) {
              await unregister(key).catch(() => {});
            }
            await register(key, callback);
          } catch (e) {
            if (String(e).includes('already registered')) {
              console.warn(`[App] Shortcut "${key}" is already taken by another app or the OS.`);
            } else {
              console.warn(`[App] Shortcut management failed for ${key}:`, e);
            }
          }
        };

        await manageShortcut(shortcutSummon, (event) => {
          if (event.state === 'Pressed') {
            setPaletteVisible(true);
          }
        });

        await manageShortcut(shortcutPTT, (event) => {
          if (event.state === 'Pressed') {
            emit('global-ptt-event', 'start');
          } else if (event.state === 'Released') {
            emit('global-ptt-event', 'stop');
          }
        });
        
        shortcutsRegistered.current = true;
      } catch (err) {
        console.error('[App] Global shortcut module failed:', err);
      }
    };

    setupShortcuts();
  }, [isSettings, shortcutSummon, shortcutPTT, setPaletteVisible]);

  // Event Listeners for Sync
  useEffect(() => {
    const unlistenGeneric = listen('sync-app-setting', (event: any) => {
      const { key, value } = event.payload as { key: string; value: any };
      switch (key) {
        case 'followSystemAppearance': setFollowSystemAppearance(value); break;
        case 'openAtLogin': setOpenAtLogin(value); break;
        case 'showInSystemTray': setShowInSystemTray(value); break;
        case 'windowMode': setWindowMode(value); break;
        case 'shortcutSummon': setShortcutSummon(value); break;
        case 'shortcutPTT': setShortcutPTT(value); break;
      }
    });

    return () => {
      unlistenGeneric.then(f => (typeof f === 'function' ? f() : undefined));
    };
  }, [setFollowSystemAppearance, setOpenAtLogin, setShowInSystemTray, setWindowMode, setShortcutSummon, setShortcutPTT]);

  // Main Logic (Main Window Only)
  const wakeWordCallback = useCallback(() => {
    setWakeWordDetected(true);
    setPaletteVisible(true);
    setTimeout(() => setWakeWordDetected(false), 2000);
  }, [setPaletteVisible, setWakeWordDetected]);

  const { startListening: startWakeWordListening, stopListening: stopWakeWordListening } = useWakeWord(
    wakeWordCallback
  );

  const isSTTActive = useAppStore(state => state.isSTTActive);

  useEffect(() => {
    if (isSettings) return;

    if (isSTTActive) {
      if (wakeWordStarted.current) {
        stopWakeWordListening();
        wakeWordStarted.current = false;
        console.log('[App] Pausing Wake Word: Mic busy with STT');
      }
      return;
    }

    if (!wakeWordStarted.current) {
      wakeWordStarted.current = true;
      setTimeout(() => {
        if (!isSTTActive && wakeWordStarted.current) {
          startWakeWordListening().catch(err => {
            console.error('[App] Wake word start failed:', err);
            wakeWordStarted.current = false;
          });
        }
      }, 500);
    }

    return () => {
      if (wakeWordStarted.current) {
        stopWakeWordListening();
        wakeWordStarted.current = false;
      }
    };
  }, [isSettings, isSTTActive, startWakeWordListening, stopWakeWordListening]);

  useEffect(() => {
    if (isSettings) return;
    initTTS().catch(err => console.error('[App] TTS init failed:', err));
    refreshApps().catch(err => console.error('[App] App refresh failed:', err));
    
    const unlistenSync = listen('sync-palette-visibility', (event: any) => {
      setPaletteVisible(event.payload, false);
    });

    const unlistenSpeak = listen('request-speak', (event: any) => {
      const { text, voiceId } = event.payload as { text: string; voiceId?: string };
      speak(text, voiceId);
    });
    return () => {
      unlistenSync.then(f => (typeof f === 'function' ? f() : undefined));
      unlistenSpeak.then(f => (typeof f === 'function' ? f() : undefined));
    };
  }, [isSettings, setPaletteVisible, speak]);

  if (isSettings) {
    return (
      <ErrorBoundary>
        <div className="settings-window-container">
           <Suspense fallback={<div className="settings-loading" />}>
             <Settings />
           </Suspense>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="main-transparent-context">
        <CommandPalette />
        <Toaster />
      </div>
    </ErrorBoundary>
  );
}

export default App;
