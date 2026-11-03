import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ChatEvent, ChatModel, ChatRequest } from '../../application/ports/model.port.js';

@Injectable()
export class OpenAiChatAdapter implements ChatModel {
  readonly profile: string;

  readonly capabilities = {
    streaming: true,
    toolCalling: false,
    structuredOutput: true,
    contextLimit: 128000,
  };
  private readonly key: string;
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.key = config.get('OPENAI_API_KEY', '');
    this.baseUrl = config.get('OPENAI_BASE_URL', 'https://api.openai.com/v1');
    this.profile = config.get('OPENAI_CHAT_MODEL', 'gpt-5-mini');
  }

  async *stream(request: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
    if (!this.key) throw new Error('OPENAI_API_KEY is required');
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: this.profile,
        stream: true,
        stream_options: { include_usage: true },
        messages: request.messages
          .filter((m) => m.role !== 'tool')
          .map((m) => ({ role: m.role, content: m.content })),
      }),
      signal,
    });
    if (!response.ok || !response.body) throw new Error(`OpenAI chat failed: ${response.status}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') {
          yield { type: 'completed', reason: 'stop' };
          continue;
        }
        const item = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string }; finish_reason?: string }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const choice = item.choices?.[0];
        if (choice?.delta?.content) yield { type: 'text-delta', text: choice.delta.content };
        if (item.usage)
          yield {
            type: 'usage',
            promptTokens: item.usage.prompt_tokens,
            completionTokens: item.usage.completion_tokens,
          };
      }
    }
  }

  async health() {
    if (!this.key) return false;
    try {
      return (
        await fetch(`${this.baseUrl}/models`, { headers: { authorization: `Bearer ${this.key}` } })
      ).ok;
    } catch {
      return false;
    }
  }
}
