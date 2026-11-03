export interface EmbeddingModel {
  readonly profile: string;
  readonly dimensions: number;

  embed(texts: string[]): Promise<number[][]>;
  health(): Promise<boolean>;
}

export type ModelRole = 'system' | 'user' | 'assistant' | 'tool';
export interface ModelMessage {
  role: ModelRole;
  content: string;
  toolName?: string;
}
export interface ModelTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}
export interface ChatRequest {
  messages: ModelMessage[];
  tools?: ModelTool[];
}
export type ChatEvent =
  | { type: 'text-delta'; text: string }
  | { type: 'tool-call'; id: string; name: string; arguments: Record<string, unknown> }
  | { type: 'usage'; promptTokens?: number; completionTokens?: number }
  | { type: 'completed'; reason: string };
export interface ChatCapabilities {
  streaming: boolean;
  toolCalling: boolean;
  structuredOutput: boolean;
  contextLimit: number;
}
export interface ChatModel {
  readonly profile: string;
  readonly capabilities: ChatCapabilities;

  stream(request: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent>;
  health(): Promise<boolean>;
}
