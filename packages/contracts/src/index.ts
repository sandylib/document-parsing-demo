export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type Visibility = 'public' | 'staff';

export interface Citation {
  evidenceId: string;
  documentId: string;
  versionId: string;
  title: string;
  sectionPath: string[];
  page?: number;
  excerpt: string;
}

export type ChatSseEvent =
  | { type: 'message.started'; messageId: string; sequence: number }
  | { type: 'retrieval.completed'; messageId: string; sequence: number; evidenceCount: number }
  | { type: 'text.delta'; messageId: string; sequence: number; text: string }
  | { type: 'citation.available'; messageId: string; sequence: number; citation: Citation }
  | { type: 'message.completed'; messageId: string; sequence: number; refused: boolean }
  | { type: 'message.failed'; messageId: string; sequence: number; code: string; message: string };
