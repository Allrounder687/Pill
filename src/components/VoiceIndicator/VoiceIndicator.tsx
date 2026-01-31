import type { FC } from 'react';
import './VoiceIndicator.css';

interface VoiceIndicatorProps {
  isListening: boolean;
  isSpeaking: boolean;
  wakeWordDetected?: boolean;
}

const VoiceIndicator: FC<VoiceIndicatorProps> = ({ isListening, isSpeaking, wakeWordDetected }) => {
  // Determine primary state for icon
  const state = isSpeaking ? 'speaking' : isListening ? 'listening' : wakeWordDetected ? 'detected' : 'idle';

  return (
    <div className={`voice-indicator ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''} ${wakeWordDetected ? 'wake-word' : ''}`}>
      <div className="wave"></div>
      <div className="wave"></div>
      <div className="wave"></div>
      <div className="center-dot">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {state === 'detected' && (
            <path d="M20 6L9 17l-5-5" />
          )}
          {state === 'speaking' && (
            <path d="M3 10c0-4.97 4.03-9 9-9s9 4.03 9 9v4c0 1.1-.9 2-2 2h-1c-1.1 0-2-.9-2-2v-3c0-1.1.9-2 2-2h1c0-3.31-2.69-6-6-6S6 6.69 6 10h1c1.1 0 2 .9 2 2v3c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2v-4zM12 19v3M9 22h6" />
          )}
          {(state === 'listening' || state === 'idle') && (
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 18v4M8 22h8" />
          )}
        </svg>
      </div>
    </div>
  );
};

export default VoiceIndicator;
