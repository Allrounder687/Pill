import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';

interface ShortcutRecorderProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

export const ShortcutRecorder: FC<ShortcutRecorderProps> = ({ label, value, onChange }) => {
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
