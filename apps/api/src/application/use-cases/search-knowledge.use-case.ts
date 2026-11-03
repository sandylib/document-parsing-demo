import { Inject, Injectable } from '@nestjs/common';
import type { Visibility } from '../../core/knowledge.types.js';
import type { EmbeddingModel } from '../ports/model.port.js';
import type { RetrievalRepository } from '../ports/repositories.port.js';
import { EMBEDDING_MODEL, RETRIEVAL_REPOSITORY } from '../ports/tokens.js';

@Injectable()
export class SearchKnowledgeUseCase {
  constructor(
    @Inject(RETRIEVAL_REPOSITORY) private readonly retrieval: RetrievalRepository,
    @Inject(EMBEDDING_MODEL) private readonly embedding: EmbeddingModel,
  ) {}
  async execute(query: string, role: Visibility, limit = 5) {
    const clean = query.trim();
    if (!clean) return [];
    const [vector] = await this.embedding.embed([clean]);
    return this.retrieval.search(vector, clean, role, Math.min(Math.max(limit, 1), 10));
  }
}
