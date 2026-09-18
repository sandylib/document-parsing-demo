export interface DocumentIngestionJob {
  jobId: string;
  versionId: string;
}

export interface IngestionQueueEvent {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'stalled';
  progress?: number;
  error?: string;
}

export type IngestionQueueListener = (event: IngestionQueueEvent) => void;

export interface JobQueue {
  enqueue(job: DocumentIngestionJob): Promise<void>;
  subscribe(listener: IngestionQueueListener): () => void;
  health(): Promise<boolean>;
}
