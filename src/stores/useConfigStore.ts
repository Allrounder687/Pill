import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConfigState {
  youtubeApiKey: string;
  openaiApiKey: string;
  perplexityApiKey: string;
  ollamaUrl: string;
  ollamaModel: string;
  apiKeys: Record<string, string>;
  setYoutubeApiKey: (key: string) => void;
  setOpenaiApiKey: (key: string) => void;
  setPerplexityApiKey: (key: string) => void;
  setOllamaUrl: (url: string) => void;
  setOllamaModel: (model: string) => void;
  setApiKey: (id: string, key: string) => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      youtubeApiKey: '',
      openaiApiKey: '',
      perplexityApiKey: '',
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: 'llama3',
      apiKeys: {},
      setYoutubeApiKey: (key) => set({ youtubeApiKey: key }),
      setOpenaiApiKey: (key) => set({ openaiApiKey: key }),
      setPerplexityApiKey: (key) => set({ perplexityApiKey: key }),
      setOllamaUrl: (url) => set({ ollamaUrl: url }),
      setOllamaModel: (model) => set({ ollamaModel: model }),
      setApiKey: (id, key) => set((state) => ({
        apiKeys: { ...state.apiKeys, [id]: key }
      })),
    }),
    {
      name: 'nexus-bar-config-storage',
    }
  )
);
