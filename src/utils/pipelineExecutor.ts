import { invoke } from '@tauri-apps/api/core';
import type { Action } from './intentEngine';
import { useResourceStore } from '../stores/useResourceStore';
import { useConfigStore } from '../stores/useConfigStore';

export const executePipeline = async (actions: Action[]) => {
  let pipelineContext: any = {};
  const { perplexityApiKey, openaiApiKey } = useConfigStore.getState();
  const apiKey = perplexityApiKey || openaiApiKey;

  for (const action of actions) {
    console.log(`[Pipeline] Executing ${action.action}`, action.params);
    
    switch (action.action) {
      case 'open_app':
        if (action.params.path) {
          await invoke('launch_app', { path: action.params.path });
        }
        break;
        
      case 'search_web':
        const query = action.params.query;
        if (query) {
          window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
        }
        break;

      case 'summarize':
        const textToSummarize = action.params.text || pipelineContext.transcription || '';
        const { ollamaUrl, ollamaModel } = useConfigStore.getState();
        
        if (textToSummarize && (apiKey || ollamaUrl)) {
          try {
            const provider = perplexityApiKey ? 'perplexity' : (openaiApiKey ? 'openai' : 'ollama');
            const isOllama = provider === 'ollama';
            
            const url = isOllama 
              ? `${ollamaUrl.replace(/\/$/, '')}/api/chat`
              : (provider === 'perplexity' 
                ? 'https://api.perplexity.ai/chat/completions' 
                : 'https://api.openai.com/v1/chat/completions');

            const model = isOllama ? ollamaModel : (provider === 'perplexity' ? 'sonar' : 'gpt-4o');

            const body = isOllama 
              ? {
                  model,
                  messages: [
                    { role: 'system', content: 'Summarize the following text concisely.' },
                    { role: 'user', content: textToSummarize }
                  ],
                  stream: false
                }
              : {
                  model,
                  messages: [
                    { role: 'system', content: 'Summarize the following text concisely.' },
                    { role: 'user', content: textToSummarize }
                  ]
                };

            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

            const response = await fetch(url, {
              method: 'POST',
              headers,
              body: JSON.stringify(body)
            });

            const data = await response.json();
            const summary = isOllama ? data.message.content : data.choices[0].message.content;
            pipelineContext.summary = summary;
            useResourceStore.getState().speak(summary);
          } catch (err) {
            console.error('[Pipeline] Summarization failed:', err);
          }
        }
        break;

      case 'speak':
        const msg = action.params.message;
        if (msg) {
          useResourceStore.getState().speak(msg);
        }
        break;

      default:
        console.warn(`[Pipeline] Unknown action or not implemented: ${action.action}`);
    }
  }
};
