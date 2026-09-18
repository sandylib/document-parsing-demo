import { Inject, Injectable, Logger } from '@nestjs/common';
import type { DocumentParser } from '../ports/document-parser.port.js';
import type { EmbeddingModel } from '../ports/model.port.js';
import type { ObjectStorage } from '../ports/object-storage.port.js';
import type { DocumentRepository } from '../ports/repositories.port.js';
import {
  DOCUMENT_PARSERS,
  DOCUMENT_REPOSITORY,
  EMBEDDING_MODEL,
  OBJECT_STORAGE,
} from '../ports/tokens.js';
import { ChunkerService } from '../services/chunker.service.js';

export interface ProcessDocumentCommand {
  jobId: string;
  versionId: string;
  reportProgress: (progress: number) => Promise<void>;
}

@Injectable()
export class ProcessDocumentUseCase {
  private readonly logger = new Logger(ProcessDocumentUseCase.name);

  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: DocumentRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(DOCUMENT_PARSERS) private readonly parsers: DocumentParser[],
    @Inject(EMBEDDING_MODEL) private readonly embedding: EmbeddingModel,
    private readonly chunker: ChunkerService,
  ) {}

  async execute(command: ProcessDocumentCommand): Promise<void> {
    await command.reportProgress(10);
    const version = await this.documents.loadProcessableVersion(command.versionId);
    const parser = this.parsers.find((candidate) => candidate.supports(version));
    if (!parser) throw new Error(`No parser supports ${version.mimeType}`);

    const content = await this.storage.get(version.storageKey);
    await command.reportProgress(25);
    const parsed = await parser.parse({
      content,
      mimeType: version.mimeType,
      originalName: version.originalName,
    });
    if (!parsed.blocks.length) throw new Error('Parser returned no readable blocks');

    await command.reportProgress(50);
    const chunks = this.chunker.chunk(parsed.blocks);
    const embeddings = await this.embedding.embed(chunks.map((chunk) => chunk.text));
    await command.reportProgress(85);

    await this.documents.completeProcessing({
      jobId: command.jobId,
      version,
      blocks: parsed.blocks,
      chunks,
      embeddings,
      embeddingModel: this.embedding.profile,
      warnings: parsed.warnings,
    });
    await command.reportProgress(100);
    this.logger.log(
      JSON.stringify({
        event: 'ingestion.completed',
        jobId: command.jobId,
        versionId: version.id,
        blocks: parsed.blocks.length,
        chunks: chunks.length,
      }),
    );
  }
}
