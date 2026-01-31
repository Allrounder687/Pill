import { useConfigStore } from '../stores/useConfigStore';

export interface Action {
  action: string;
  params: Record<string, any>;
}

export interface IntentResponse {
  intent: string;
  confidence: number;
  parameters: Record<string, any>;
  actions: Action[];
  reasoning: string;
}

const SYSTEM_PROMPT = `You are an Intent Router for a command palette 'Intent Engine'. Your job is to analyze a user query and available context, then output a precise JSON plan to execute the user's intent.

**Context Snapshot**:
- active_app: {name, title, path}
- clipboard: string content
- recent_files: array of file names
- meeting_status: String
- time: ISO string

**Available Intents**: search, create, automate, transform, share, summarize, schedule, run_script, record, communicate

**Available Actions**:
- record (start/stop recording)
- transcribe (convert audio to text)
- summarize (create summary of text/audio)
- format (format text into notes/markdown)
- post_to_slack (post to Slack channel)
- post_to_notion (create Notion page/block)
- open_app (open specific application)
- search_web (perform web search)
- search_files (search recent files)
- create_file (create new file)
- email_send (send email)
- save_clipboard (save clipboard to file)

**Rules**:
1. Output ONLY valid JSON. No explanations.
2. Chain 1-5 actions in a logical sequence.
3. Use context where relevant.
`;

export const resolveIntent = async (query: string, context: any): Promise<IntentResponse | null> => {
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
  
  if (provider !== 'ollama' && !apiKey) {
    console.warn('[IntentEngine] No API key found for Intent Engine');
    return null;
  }

  try {
    const isOllama = provider === 'ollama';
    const body = isOllama 
      ? {
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: JSON.stringify({ query, context }) }
          ],
          format: 'json',
          stream: false
        }
      : {
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: JSON.stringify({ query, context }) }
          ],
          response_format: { type: 'json_object' }
        };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const data = await response.json();
    const content = isOllama ? data.message.content : data.choices[0].message.content;
    return JSON.parse(content) as IntentResponse;
  } catch (err) {
    console.error('[IntentEngine] Failed to resolve intent:', err);
    return null;
  }
};
