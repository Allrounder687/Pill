import { useState } from 'react';
import type { FC } from 'react';
import { emit } from '@tauri-apps/api/event';
import { useAppStore } from '../../../stores/useAppStore';
import { ALL_VOICES, TEST_PHRASES } from '../constants';

export const VoiceTab: FC = () => {
  const [testPhrase, setTestPhrase] = useState(TEST_PHRASES[0]);
  const { 
    selectedVoice, setSelectedVoice, 
    voiceSpeed, setVoiceSpeed,
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

  const handleTestSpeak = () => {
    emit('request-speak', { text: testPhrase, voiceId: selectedVoice }).catch(console.error);
  };

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
};
