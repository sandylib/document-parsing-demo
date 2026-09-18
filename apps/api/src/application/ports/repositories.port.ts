import type { CanonicalBlockDraft, ChunkDraft, DocumentSummary, Evidence, Visibility } from '../../core/knowledge.types.js';

export interface UploadRegistration {
  documentId?: string;
  title: string;
  visibility: Visibility;
  checksum: string;
  mimeType: string;
  originalName: string;
  storageKey: string;
  pipelineRevision: string;
}
export interface UploadReceipt { documentId: string; versionId: string; jobId: string; duplicate: boolean }
export interface ProcessingJob { id: string; versionId: string; attempts: number }
export interface ProcessableVersion {
  id: string;
  documentId: string;
  title: string;
  visibility: Visibility;
  storageKey: string;
  mimeType: string;
  originalName: string;
}
export interface CompletedProcessing {
  jobId: string;
  version: ProcessableVersion;
  blocks: CanonicalBlockDraft[];
  chunks: ChunkDraft[];
  embeddings: number[][];
  embeddingModel: string;
  warnings: string[];
}
export interface DocumentRepository {
  registerUpload(input: UploadRegistration): Promise<UploadReceipt>;
  list(): Promise<DocumentSummary[]>;
  loadProcessableVersion(versionId: string): Promise<ProcessableVersion>;
  completeProcessing(input: CompletedProcessing): Promise<void>;
}
export interface JobRepository {
  claimNext(): Promise<ProcessingJob | null>;
  fail(job: ProcessingJob, message: string): Promise<void>;
}
export interface RetrievalRepository {
  search(queryEmbedding: number[], query: string, role: Visibility, limit: number): Promise<Evidence[]>;
  getEvidence(id: string, role: Visibility): Promise<Evidence | null>;
}
export interface AnswerRunRepository {
  record(input: {
    messageId: string; role: Visibility; question: string; pipelineRevision: string;
    modelProfile: string; evidenceIds: string[]; toolCalls: unknown[];
    outcome: string; durationMs: number;
  }): Promise<void>;
}
