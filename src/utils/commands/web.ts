import { open } from '@tauri-apps/plugin-shell';
import { invoke } from '@tauri-apps/api/core';
import type { Command } from '../commandRegistry';
import { useConfigStore } from '../../stores/useConfigStore';
import { useResourceStore } from '../../stores/useResourceStore';

export const WEB_COMMANDS: Command[] = [
  { 
    id: 'web-search', 
    title: 'Web Search', 
    description: 'Search the web using Google', 
    icon: '🔍', 
    iconUrl: 'https://www.google.com/s2/favicons?domain=google.com&sz=64',
    action: async (q) => {
      const query = q?.replace(/^(search for|search|google)\s+/i, '').trim();
      if (query) await open(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
    }, 
    keywords: ['search', 'google', 'find'], 
    category: 'web' 
  },
  { 
    id: 'youtube-search', 
    title: 'YouTube Search', 
    description: 'Search for videos on YouTube', 
    icon: '📺', 
    iconUrl: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64',
    action: async (q) => {
      const query = q?.replace(/^(youtube search|search youtube for|youtube)\s+/i, '').trim();
      if (query) await open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
    }, 
    keywords: ['youtube', 'video', 'watch'], 
    category: 'web' 
  },
  { 
    id: 'media-play-direct', 
    title: 'Play Video', 
    description: 'Directly play the top result for a query', 
    icon: '🎬', 
    iconUrl: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64',
    action: async (q) => {
      const query = q?.replace(/^(play|play video|watch|listen to)\s+/i, '').trim();
      if (query) {
        try {
          const { youtubeApiKey } = useConfigStore.getState();
          const videoId = await invoke<string>('get_youtube_video_id', { query, apiKey: youtubeApiKey || undefined });
          await open(`https://www.youtube.com/watch?v=${videoId}`);
        } catch (err) {
          const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`;
          await open(url);
        }
      }
    }, 
    keywords: ['play', 'watch', 'listen'], 
    category: 'web' 
  },
  { 
    id: 'currency-convert', 
    title: 'Currency Converter', 
    description: 'Convert amounts between different currencies', 
    icon: '💱', 
    action: async (q) => {
      const query = q?.toLowerCase().replace(/^(convert|exchange|what is|how much is)\s+/i, '').trim() || '';
      const regex = /(\d+(?:\.\d+)?)\s*([a-z]{3})\s*(?:to|in)?\s*([a-z]{3})/i;
      const match = query.match(regex);

      if (!match) {
        if (query === '' || query === 'currency' || query === 'converter') {
          await open('https://www.xe.com/currencyconverter/');
          useResourceStore.getState().speak("Opening XE Currency Converter");
          return { suppressOutput: true };
        }
        useResourceStore.getState().speak("Please specify an amount and two currencies, like 100 USD to EUR.");
        return { keepOpen: true, newQuery: 'convert ' };
      }

      const [_, amount, from, to] = match.map(m => m.toUpperCase());

      try {
        const response = await fetch(`https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to.toUpperCase()}`);
        const data = await response.json();
        if (data.rates && data.rates[to.toUpperCase()]) {
          const result = data.rates[to.toUpperCase()].toFixed(2);
          useResourceStore.getState().speak(`${amount} ${from} is approximately ${result} ${to}`);
          return { suppressOutput: true };
        }
      } catch (err) {
        useResourceStore.getState().speak(`Sorry, I couldn't convert that.`);
      }
    }, 
    keywords: ['convert', 'currency', 'exchange', 'money', 'forex', 'usd', 'eur', 'gbp'], 
    category: 'web' 
  },
];
