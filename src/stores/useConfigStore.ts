import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConfigState {
  youtubeApiKey: string;
  openaiApiKey: string;
  perplexityApiKey: string;
  apiKeys: Record<string, string>;
  setYoutubeApiKey: (key: string) => void;
  setOpenaiApiKey: (key: string) => void;
  setPerplexityApiKey: (key: string) => void;
  setApiKey: (id: string, key: string) => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      youtubeApiKey: '',
      openaiApiKey: '',
      perplexityApiKey: '',
      apiKeys: {},
      setYoutubeApiKey: (key) => set({ youtubeApiKey: key }),
      setOpenaiApiKey: (key) => set({ openaiApiKey: key }),
      setPerplexityApiKey: (key) => set({ perplexityApiKey: key }),
      setApiKey: (id, key) => set((state) => ({
        apiKeys: { ...state.apiKeys, [id]: key }
      })),
    }),
    {
      name: 'jarvis-config-storage',
    }
  )
);
