import { useEffect } from 'react';

export const useKeyboardShortcut = (key: string, ctrlKey: boolean, callback: () => void) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === key.toLowerCase() &&
        (ctrlKey ? event.ctrlKey || event.metaKey : true)
      ) {
        console.log(`[Shortcut] Triggered: ${ctrlKey ? 'Ctrl+' : ''}${key}`);
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, ctrlKey, callback]);
};
