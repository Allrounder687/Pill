import { useState } from 'react';
import type { FC } from 'react';
import { emit } from '@tauri-apps/api/event';
import './Settings.css';

// Tabs
import { GeneralTab } from './tabs/GeneralTab';
import { VoiceTab } from './tabs/VoiceTab';
import { ShortcutsTab } from './tabs/ShortcutsTab';
import { AboutTab } from './tabs/AboutTab';
import APISettings from '../../components/Settings/APISettings';

const Settings: FC = () => {
  const [activeTab, setActiveTab] = useState('general');

  const syncSetting = (key: string, value: any) => {
    emit('sync-app-setting', { key, value }).catch(console.error);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'general': return <GeneralTab syncSetting={syncSetting} />;
      case 'voice': return <VoiceTab />;
      case 'shortcuts': return <ShortcutsTab syncSetting={syncSetting} />;
      case 'api': return <APISettings />;
      case 'about': return <AboutTab />;
      default: return null;
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
          <button className={`nav-item ${activeTab === 'api' ? 'active' : ''}`} onClick={() => setActiveTab('api')}>🛠️ API Keys</button>
          <button className={`nav-item ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>ℹ️ About</button>
        </nav>
      </aside>

      <main className="content-area">
        <header className="content-header">
           <div className="header-title">
             {activeTab === 'api' ? 'API Intelligence' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1) + ' Settings'}
           </div>
        </header>
        <div className="scroll-container">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Settings;
