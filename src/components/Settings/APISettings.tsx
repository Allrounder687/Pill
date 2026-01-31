import React from 'react';
import { useConfigStore } from '../../stores/useConfigStore';
import './APISettings.css';

interface APIConfig {
  id: string;
  name: string;
  type: string;
  icon: string;
  description: string;
  isOptional: boolean;
}

const APIS_LIST: APIConfig[] = [
  { id: 'youtube', name: 'YouTube Data API', type: 'Media', icon: '📺', description: 'Video search & playback', isOptional: false },
  { id: 'openai', name: 'OpenAI (GPT-4)', type: 'Intelligence', icon: '🧠', description: 'Core LLM reasoning', isOptional: true },
  { id: 'perplexity', name: 'Perplexity AI', type: 'Research', icon: '🌐', description: 'Web search & citations', isOptional: true },
  { id: 'elevenlabs', name: 'ElevenLabs', type: 'Voice', icon: '🗣️', description: 'Premium TTS synthesis', isOptional: true },
  { id: 'github', name: 'GitHub API', type: 'Developer', icon: '🐙', description: 'Repository & Gist access', isOptional: true },
  { id: 'spotify', name: 'Spotify SDK', type: 'Music', icon: '🎵', description: 'Music playback control', isOptional: true },
  { id: 'weather', name: 'OpenWeather', type: 'Utility', icon: '☁️', description: 'Local weather data', isOptional: true },
  { id: 'google_maps', name: 'Google Maps', type: 'Navigation', icon: '🗺️', description: 'Geocoding & distances', isOptional: true },
];

const APISettings: React.FC = () => {
  const { 
    youtubeApiKey, setYoutubeApiKey,
    openaiApiKey, setOpenaiApiKey,
    perplexityApiKey, setPerplexityApiKey,
    apiKeys, setApiKey
  } = useConfigStore();

  const getKeyValue = (id: string) => {
    if (id === 'youtube') return youtubeApiKey;
    if (id === 'openai') return openaiApiKey;
    if (id === 'perplexity') return perplexityApiKey;
    return apiKeys[id] || '';
  };

  const handleKeyChange = (id: string, value: string) => {
    if (id === 'youtube') setYoutubeApiKey(value);
    else if (id === 'openai') setOpenaiApiKey(value);
    else if (id === 'perplexity') setPerplexityApiKey(value);
    else setApiKey(id, value);
  };

  return (
    <div className="tab-content fade-in">
      <div className="settings-section-title">API Intelligence</div>
      
      <div className="settings-group">
        {APIS_LIST.map((api) => {
          const value = getKeyValue(api.id);
          const isActive = value.length > 0;
          
          return (
            <div key={api.id} className="setting-row">
              <div className="setting-info">
                <div className="api-label-row">
                  <span className="api-row-icon">{api.icon}</span>
                  <span className="setting-label">{api.name}</span>
                </div>
                <span className="setting-sublabel">{api.description}</span>
              </div>
              
              <div className="setting-action api-action-group">
                <input 
                  type="password" 
                  className="rc-input-api"
                  placeholder={`Enter ${api.name} key...`}
                  value={value}
                  onChange={(e) => handleKeyChange(api.id, e.target.value)}
                />
                <div className={`api-status-pill ${isActive ? 'status-active' : (api.isOptional ? 'status-optional' : 'status-missing')}`}>
                  {isActive ? 'Active' : (api.isOptional ? 'Optional' : 'Required')}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="settings-footer-note">
        🔒 All keys are stored in a secure, encrypted local bunker.
      </div>
    </div>
  );
};

export default APISettings;
