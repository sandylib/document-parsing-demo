import { Injectable } from '@nestjs/common';
import type { CanonicalBlockDraft, ChunkDraft } from '../../core/knowledge.types.js';

@Injectable()
export class ChunkerService {
  chunk(blocks: CanonicalBlockDraft[], maxChars = 1200): ChunkDraft[] {
    const chunks: ChunkDraft[] = [];
    let texts: string[] = [];
    let indexes: number[] = [];
    let sectionPath: string[] = [];
    let page: number | undefined;
    const flush = () => {
      if (!texts.length) return;
      chunks.push({
        order: chunks.length,
        text: texts.join('\n\n'),
        page,
        sectionPath,
        blockIndexes: indexes,
      });
      texts = [];
      indexes = [];
      page = undefined;
    };
    for (const [index, block] of blocks.entries()) {
      const wouldOverflow =
        texts.length > 0 && texts.join('\n\n').length + block.text.length + 2 > maxChars;
      const sectionChanged = block.type === 'heading' && texts.length > 0;
      if (wouldOverflow || sectionChanged) flush();
      texts.push(block.text);
      indexes.push(index);
      sectionPath = block.sectionPath;
      page ??= block.page;
    }
    flush();
    return chunks;
  }
}
