/**
 * Online agents a pack can be handed to. Open links are simulated: they open the
 * service with the message prefilled where the service is reported to accept it, but
 * whether that reaches Grok Bot / Dot / Duet directly is not tested yet (level L0).
 * Copying the message is the path that always works.
 */
export interface Agent {
  id: string;
  name: string;
  company: string;
  openLabel?: string;
  openUrl?: (message: string) => string;
}

export const AGENTS: Agent[] = [
  { id: 'grok-bot', name: 'Grok Bot', company: 'xAI', openLabel: '開啟 Grok', openUrl: (m) => `https://grok.com/?q=${encodeURIComponent(m)}` },
  { id: 'chatgpt-dot', name: 'ChatGPT Dot', company: 'OpenAI', openLabel: '開啟 ChatGPT', openUrl: (m) => `https://chatgpt.com/?q=${encodeURIComponent(m)}` },
  { id: 'claude-duet', name: 'Claude Duet', company: 'Anthropic', openLabel: '開啟 Claude', openUrl: (m) => `https://claude.ai/new?q=${encodeURIComponent(m)}` },
  { id: 'other', name: '其他 AI', company: '複製後貼上' },
];
