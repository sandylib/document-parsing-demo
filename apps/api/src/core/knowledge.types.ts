export type Visibility = 'public' | 'staff';
export type BlockType = 'heading' | 'paragraph' | 'list' | 'table' | 'image-reference';

export interface CanonicalBlockDraft {
  type: BlockType;
  order: number;
  text: string;
  page?: number;
  sectionPath: string[];
  sourceStart?: number;
  sourceEnd?: number;
  confidence: number;
  warnings: string[];
}

export interface ChunkDraft {
  order: number;
  text: string;
  page?: number;
  sectionPath: string[];
  blockIndexes: number[];
}

export interface Evidence {
  evidenceId: string;
  chunkId: string;
  documentId: string;
  versionId: string;
  title: string;
  text: string;
  page?: number;
  sectionPath: string[];
  score: number;
}

export interface DocumentSummary {
  id: string;
  title: string;
  visibility: Visibility;
  currentVersionId?: string;
  versionNumber?: number;
  status?: string;
  progress?: number;
  warnings: string[];
  createdAt: string;
}

export const PIPELINE_REVISION = 'demo-v1';
