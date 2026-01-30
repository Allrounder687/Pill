import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { emit } from '@tauri-apps/api/event';
import { useAppStore } from '../../stores/useAppStore';
import './Settings.css';

const ALL_VOICES = [
  // American Female
  { id: 'af_heart', name: 'Heart (Female - US)' },
  { id: 'af_alloy', name: 'Alloy (Female - US)' },
  { id: 'af_aoede', name: 'Aoede (Female - US)' },
  { id: 'af_bella', name: 'Bella (Female - US)' },
  { id: 'af_jessica', name: 'Jessica (Female - US)' },
  { id: 'af_kore', name: 'Kore (Female - US)' },
  { id: 'af_nicole', name: 'Nicole (Female - US)' },
  { id: 'af_nova', name: 'Nova (Female - US)' },
  { id: 'af_river', name: 'River (Female - US)' },
  { id: 'af_sarah', name: 'Sarah (Female - US)' },
  { id: 'af_sky', name: 'Sky (Female - US)' },
  // American Male
  { id: 'am_adam', name: 'Adam (Male - US)' },
  { id: 'am_echo', name: 'Echo (Male - US)' },
  { id: 'am_eric', name: 'Eric (Male - US)' },
  { id: 'am_fenrir', name: 'Fenrir (Male - US)' },
  { id: 'am_liam', name: 'Liam (Male - US)' },
  { id: 'am_michael', name: 'Michael (Male - US)' },
  { id: 'am_onyx', name: 'Onyx (Male - US)' },
  { id: 'am_puck', name: 'Puck (Male - US)' },
  { id: 'am_santa', name: 'Santa (Male - US)' },
  // British Female
  { id: 'bf_alice', name: 'Alice (Female - UK)' },
  { id: 'bf_emma', name: 'Emma (Female - UK)' },
  { id: 'bf_isabella', name: 'Isabella (Female - UK)' },
  { id: 'bf_lily', name: 'Lily (Female - UK)' },
  // British Male
  { id: 'bm_daniel', name: 'Daniel (Male - UK)' },
  { id: 'bm_fable', name: 'Fable (Male - UK)' },
  { id: 'bm_george', name: 'George (Male - UK)' },
  { id: 'bm_lewis', name: 'Lewis (Male - UK)' },
];

const TEST_PHRASES = [
  "Hello, I am Jarvis. How can I assist you today?",
  "The weather in London is currently cloudy with a chance of rain.",
  "System diagnostics completed. All modules are operating at peak efficiency.",
  "I've updated your schedule for tomorrow morning.",
  "Warning: Low power levels detected in the auxiliary systems."
];

const ShortcutRecorder: FC<{ label: string, value: string, onChange: (val: string) => void }> = ({ label, value, onChange }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentKeys, setCurrentKeys] = useState<string[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const keys: string[] = [];
      if (e.ctrlKey) keys.push('Control');
      if (e.altKey) keys.push('Alt');
      if (e.shiftKey) keys.push('Shift');
      if (e.metaKey) keys.push('Command');

      const key = e.key === ' ' ? 'Space' : e.key.charAt(0).toUpperCase() + e.key.slice(1);
      
      // Filter out modifier keys if they've already been added
      const modifiers = ['Control', 'Alt', 'Shift', 'Command', 'Meta'];
      if (!modifiers.includes(key)) {
        keys.push(key);
      }

      setCurrentKeys(keys);
    };

    const handleKeyUp = () => {
      if (currentKeys.length > 0) {
        const finalShortcut = currentKeys.join('+');
        onChange(finalShortcut);
        setIsRecording(false);
        setCurrentKeys([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isRecording, currentKeys, onChange]);

  return (
    <div className="shortcut-recorder-row">
      <span className="setting-label">{label}</span>
      <button 
        ref={buttonRef}
        className={`shortcut-btn ${isRecording ? 'recording' : ''}`}
        onClick={() => setIsRecording(true)}
      >
        {isRecording ? (currentKeys.length > 0 ? currentKeys.join(' + ') : 'Press Keys...') : value}
      </button>
    </div>
  );
};

const Settings: FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [testPhrase, setTestPhrase] = useState(TEST_PHRASES[0]);
  
  const { 
    selectedVoice, setSelectedVoice, 
    voiceSpeed, setVoiceSpeed,
    followSystemAppearance, setFollowSystemAppearance,
    openAtLogin, setOpenAtLogin,
    windowMode, setWindowMode,
    shortcutSummon, setShortcutSummon,
    shortcutPTT, setShortcutPTT
  } = useAppStore();

  const handleVoiceChange = (id: string) => {
    setSelectedVoice(id);
    emit('sync-voice-preference', id).catch(console.error);
    emit('request-speak', { text: "Voice updated.", voiceId: id }).catch(console.error);
  };

  const handleSpeedChange = (speed: number) => {
    setVoiceSpeed(speed);
    emit('sync-speed-preference', speed).catch(console.error);
  };

  const syncSetting = (key: string, value: any) => {
    emit('sync-app-setting', { key, value }).catch(console.error);
  };

  const handleTestSpeak = () => {
    emit('request-speak', { text: testPhrase, voiceId: selectedVoice }).catch(console.error);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="tab-content fade-in">
            <div className="settings-group">
              <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-label">Follow System Appearance</span>
                  <span className="setting-sublabel">Sync app theme with Windows settings</span>
                </div>
                <div className="setting-action">
                   <div className="toggle-switch small">
                    <input type="checkbox" id="appearance" checked={followSystemAppearance} onChange={(e) => {
                      setFollowSystemAppearance(e.target.checked);
                      syncSetting('followSystemAppearance', e.target.checked);
                    }} />
                    <label htmlFor="appearance"></label>
                  </div>
                </div>
              </div>
              <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-label">Open at Login</span>
                  <span className="setting-sublabel">Start Jarvis when you sign in</span>
                </div>
                <div className="setting-action">
                   <div className="toggle-switch small">
                    <input type="checkbox" id="startup" checked={openAtLogin} onChange={(e) => {
                      setOpenAtLogin(e.target.checked);
                      syncSetting('openAtLogin', e.target.checked);
                    }} />
                    <label htmlFor="startup"></label>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-section-title">Window Mode</div>
            <div className="window-mode-selector">
              <div className={`mode-card ${windowMode === 'compact' ? 'active' : ''}`} onClick={() => { setWindowMode('compact'); syncSetting('windowMode', 'compact'); }}>
                <div className="mode-preview compact"><div className="preview-shape pill"></div></div>
                <span>Compact</span>
              </div>
              <div className={`mode-card ${windowMode === 'expanded' ? 'active' : ''}`} onClick={() => { setWindowMode('expanded'); syncSetting('windowMode', 'expanded'); }}>
                <div className="mode-preview expanded">
                   <div className="preview-shape rect"></div>
                   <div className="preview-line"></div>
                </div>
                <span>Expanded</span>
              </div>
            </div>
          </div>
        );
      case 'voice':
        return (
          <div className="tab-content fade-in">
            <div className="settings-group">
               <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-label">Identity Voice</span>
                  <span className="setting-sublabel">Neural voice for interactions</span>
                </div>
                <div className="setting-action">
                   <select className="rc-select" value={selectedVoice} onChange={(e) => handleVoiceChange(e.target.value)}>
                     {ALL_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                   </select>
                </div>
              </div>
               <div className="setting-row range-row">
                <div className="setting-info">
                  <span className="setting-label">Voice Speed</span>
                </div>
                <div className="setting-action slider-container">
                  <span className="slider-value">{voiceSpeed.toFixed(1)}x</span>
                  <input type="range" min="0.5" max="2.0" step="0.1" value={voiceSpeed} onChange={(e) => handleSpeedChange(parseFloat(e.target.value))} />
                </div>
              </div>
            </div>

            <div className="settings-section-title">Test Laboratory</div>
            <div className="settings-group">
               <div className="setting-row">
                 <div className="setting-info">
                    <span className="setting-label">Test Phrase</span>
                 </div>
                 <div className="setting-action test-action-group">
                    <select className="rc-select" value={testPhrase} onChange={(e) => setTestPhrase(e.target.value)}>
                      {TEST_PHRASES.map((p, i) => <option key={i} value={p}>{p.slice(0, 30)}...</option>)}
                    </select>
                    <button className="rc-btn-primary" onClick={handleTestSpeak}>Test Voice</button>
                 </div>
               </div>
            </div>
          </div>
        );
      case 'shortcuts':
        return (
          <div className="tab-content fade-in">
             <div className="settings-group">
               <div className="setting-row">
                 <ShortcutRecorder 
                    label="Summon Jarvis" 
                    value={shortcutSummon} 
                    onChange={(val) => { setShortcutSummon(val); syncSetting('shortcutSummon', val); }} 
                 />
               </div>
               <div className="setting-row">
                 <ShortcutRecorder 
                    label="Push to Talk" 
                    value={shortcutPTT} 
                    onChange={(val) => { setShortcutPTT(val); syncSetting('shortcutPTT', val); }} 
                 />
               </div>
            </div>
          </div>
        );
      case 'about':
        return (
          <div className="tab-content fade-in">
            <div className="about-branding">
               <div className="about-logo">🦊</div>
               <h2>Jarvis Voice Access</h2>
               <p className="version-text">Version 0.1.0-alpha</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="settings-layout">
      <aside className="sidebar-container">
        <div className="user-profile">
          <div className="avatar-mock">🦊</div>
          <div className="user-meta">
            <span className="user-name">clever fox</span>
            <span className="user-status">Account</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>⚙️ General</button>
          <button className={`nav-item ${activeTab === 'shortcuts' ? 'active' : ''}`} onClick={() => setActiveTab('shortcuts')}>⌨️ Shortcuts</button>
          <button className={`nav-item ${activeTab === 'voice' ? 'active' : ''}`} onClick={() => setActiveTab('voice')}>🎙️ Voice AI</button>
          <button className={`nav-item ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>ℹ️ About</button>
        </nav>
      </aside>

      <main className="content-area">
        <header className="content-header">
           <div className="header-title">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings</div>
        </header>
        <div className="scroll-container">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Settings;
