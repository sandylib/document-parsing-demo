import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmbeddingModel } from '../../application/ports/model.port.js';

@Injectable()
export class OpenAiEmbeddingAdapter implements EmbeddingModel {
  readonly profile: string;
  readonly dimensions: number;
  private readonly key: string;
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.key = config.get('OPENAI_API_KEY', '');
    this.baseUrl = config.get('OPENAI_BASE_URL', 'https://api.openai.com/v1');
    this.profile = config.get('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small');
    this.dimensions = Number(config.get('EMBEDDING_DIMENSIONS', '1024'));
  }

  async embed(texts: string[]) {
    if (!this.key) throw new Error('OPENAI_API_KEY is required');
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: this.profile, input: texts, dimensions: this.dimensions }),
    });
    if (!response.ok) throw new Error(`OpenAI embedding failed: ${response.status}`);
    const body = (await response.json()) as { data: Array<{ index: number; embedding: number[] }> };
    return body.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
  }

  async health() {
    return Boolean(this.key);
  }
}
