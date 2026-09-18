import { Inject, Injectable, Logger } from '@nestjs/common';
import type { DocumentParser } from '../ports/document-parser.port.js';
import type { EmbeddingModel } from '../ports/model.port.js';
import type { ObjectStorage } from '../ports/object-storage.port.js';
import type { DocumentRepository, JobRepository } from '../ports/repositories.port.js';
import { DOCUMENT_PARSERS, DOCUMENT_REPOSITORY, EMBEDDING_MODEL, JOB_REPOSITORY, OBJECT_STORAGE } from '../ports/tokens.js';
import { ChunkerService } from '../services/chunker.service.js';

@Injectable()
export class ProcessNextJobUseCase {
  private readonly logger = new Logger(ProcessNextJobUseCase.name);
  constructor(
    @Inject(JOB_REPOSITORY) private readonly jobs: JobRepository,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: DocumentRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(DOCUMENT_PARSERS) private readonly parsers: DocumentParser[],
    @Inject(EMBEDDING_MODEL) private readonly embedding: EmbeddingModel,
    private readonly chunker: ChunkerService,
  ) {}
  async execute(): Promise<boolean> {
    const job = await this.jobs.claimNext();
    if (!job) return false;
    try {
      const version = await this.documents.loadProcessableVersion(job.versionId);
      const parser = this.parsers.find((candidate) => candidate.supports(version));
      if (!parser) throw new Error(`No parser supports ${version.mimeType}`);
      const content = await this.storage.get(version.storageKey);
      const parsed = await parser.parse({ content, mimeType: version.mimeType, originalName: version.originalName });
      if (!parsed.blocks.length) throw new Error('Parser returned no readable blocks');
      const chunks = this.chunker.chunk(parsed.blocks);
      const embeddings = await this.embedding.embed(chunks.map((chunk) => chunk.text));
      await this.documents.completeProcessing({
        jobId: job.id, version, blocks: parsed.blocks, chunks, embeddings,
        embeddingModel: this.embedding.profile, warnings: parsed.warnings,
      });
      this.logger.log(JSON.stringify({ event: 'ingestion.completed', jobId: job.id, versionId: version.id, blocks: parsed.blocks.length, chunks: chunks.length }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown processing error';
      await this.jobs.fail(job, message);
      this.logger.error(JSON.stringify({ event: 'ingestion.failed', jobId: job.id, message }));
    }
    return true;
  }
}
