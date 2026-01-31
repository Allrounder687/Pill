import { useConfigStore } from '../stores/useConfigStore';

export async function punctuateText(text: string): Promise<string> {
  const { perplexityApiKey, openaiApiKey, ollamaUrl, ollamaModel } = useConfigStore.getState();
  
  let provider: 'perplexity' | 'openai' | 'ollama' = 'openai';
  let apiKey = '';
  let url = '';
  let model = '';

  if (perplexityApiKey) {
    provider = 'perplexity';
    apiKey = perplexityApiKey;
    url = 'https://api.perplexity.ai/chat/completions';
    model = 'sonar';
  } else if (openaiApiKey) {
    provider = 'openai';
    apiKey = openaiApiKey;
    url = 'https://api.openai.com/v1/chat/completions';
    model = 'gpt-4o';
  } else {
    provider = 'ollama';
    url = `${ollamaUrl.replace(/\/$/, '')}/api/chat`;
    model = ollamaModel;
  }

  const prompt = `Punctuate and fix the grammar of the following transcribed text. Maintain the original meaning and tone. Output ONLY the corrected text, no explanations.\n\nText: "${text}"`;

  try {
    const isOllama = provider === 'ollama';
    const body = isOllama 
      ? {
          model,
          messages: [{ role: 'user', content: prompt }],
          stream: false
        }
      : {
          model,
          messages: [{ role: 'user', content: prompt }]
        };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const data = await response.json();
    const result = isOllama ? data.message.content : data.choices[0].message.content;
    return result.trim().replace(/^"|"$/g, '');
  } catch (err) {
    console.error('[AIUtils] Punctuation failed:', err);
    return text; // Fallback to original
  }
}
