import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ChatEvent, ChatModel, ChatRequest } from '../../application/ports/model.port.js';

@Injectable()
export class OllamaChatAdapter implements ChatModel {
  readonly profile: string;

  readonly capabilities = {
    streaming: true,
    toolCalling: true,
    structuredOutput: true,
    contextLimit: 32768,
  };
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get('OLLAMA_BASE_URL', 'http://localhost:11434');
    this.profile = config.get('OLLAMA_CHAT_MODEL', 'qwen3:0.6b');
  }

  async *stream(request: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: this.profile,
        stream: true,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
          tool_name: m.toolName,
        })),
        tools: request.tools?.map((t) => ({
          type: 'function',
          function: { name: t.name, description: t.description, parameters: t.inputSchema },
        })),
      }),
      signal,
    });
    if (!response.ok || !response.body) throw new Error(`Ollama chat failed: ${response.status}`);
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
        if (!line.trim()) continue;
        const item = JSON.parse(line) as {
          message?: {
            content?: string;
            tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }>;
          };
          done?: boolean;
          done_reason?: string;
          prompt_eval_count?: number;
          eval_count?: number;
        };
        if (item.message?.content) yield { type: 'text-delta', text: item.message.content };
        for (const [index, call] of (item.message?.tool_calls ?? []).entries())
          yield {
            type: 'tool-call',
            id: String(index),
            name: call.function.name,
            arguments: call.function.arguments,
          };
        if (item.done) {
          yield {
            type: 'usage',
            promptTokens: item.prompt_eval_count,
            completionTokens: item.eval_count,
          };
          yield { type: 'completed', reason: item.done_reason ?? 'stop' };
        }
      }
    }
  }

  async health() {
    try {
      return (await fetch(`${this.baseUrl}/api/tags`)).ok;
    } catch {
      return false;
    }
  }
}
