import type { CanonicalBlockDraft } from '../../core/knowledge.types.js';

export interface ParseInput {
  content: Buffer;
  mimeType: string;
  originalName: string;
}
export interface ParseResult {
  blocks: CanonicalBlockDraft[];
  warnings: string[];
}
export interface DocumentParser {
  readonly name: string;
  supports(input: Pick<ParseInput, 'mimeType' | 'originalName'>): boolean;
  parse(input: ParseInput): Promise<ParseResult>;
}
