import type { FC } from 'react';
import { useAppStore } from '../../../stores/useAppStore';

interface GeneralTabProps {
  syncSetting: (key: string, value: any) => void;
}

export const GeneralTab: FC<GeneralTabProps> = ({ syncSetting }) => {
  const { 
    followSystemAppearance, setFollowSystemAppearance,
    openAtLogin, setOpenAtLogin,
    windowMode, setWindowMode,
  } = useAppStore();

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
};
