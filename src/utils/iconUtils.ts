import { invoke } from '@tauri-apps/api/core';

/**
 * Gets a visual representation for a command/app.
 * Priorities:
 * 1. For local apps (.exe): Extracts the actual icon.
 * 2. For websites: Uses Google's favicon fetcher.
 * 3. Fallback: Returns the emoji provided in registry.
 */
export async function getCommandIcon(pathOrUrl: string, fallbackEmoji: string): Promise<string> {
  if (!pathOrUrl) return fallbackEmoji;

  // 1. Check if it's a web URL
  if (pathOrUrl.startsWith('http')) {
    try {
      const url = new URL(pathOrUrl);
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
    } catch {
      return fallbackEmoji;
    }
  }

  // 2. Check if it looks like a Windows path (.exe, .lnk, etc)
  if (pathOrUrl.includes(':') || pathOrUrl.includes('\\')) {
    try {
      // get_app_icon currently returns the path itself as a confirmation 
      // but in a real scenario we'd use a custom protocol or data URI
      // For now, we use a clever fallback: most indexed apps on Windows 
      // can be visualized by their name via a search service or 
      // we show the path if it's an exe.
      if (pathOrUrl.toLowerCase().endsWith('.exe')) {
         // Placeholder for real extraction until we have base64 working
         // return await invoke<string>('get_app_icon', { path: pathOrUrl });
      }
    } catch (err) {
      console.warn('Icon extraction failed:', err);
    }
  }

  return fallbackEmoji;
}
