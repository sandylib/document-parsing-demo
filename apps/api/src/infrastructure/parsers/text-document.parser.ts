import { Injectable } from '@nestjs/common';
import type { DocumentParser, ParseInput } from '../../application/ports/document-parser.port.js';
import type { CanonicalBlockDraft } from '../../core/knowledge.types.js';

@Injectable()
export class TextDocumentParser implements DocumentParser {
  readonly name = 'text-v1';

  supports(input: Pick<ParseInput, 'mimeType' | 'originalName'>) {
    return input.mimeType.startsWith('text/') || /\.(md|txt)$/i.test(input.originalName);
  }

  async parse(input: ParseInput) {
    const text = input.content.toString('utf8').replace(/\r\n/g, '\n');
    const blocks: CanonicalBlockDraft[] = [];
    let sectionPath: string[] = [];
    let offset = 0;
    for (const raw of text.split(/\n{2,}/)) {
      const value = raw.trim();
      if (!value) {
        offset += raw.length + 2;
        continue;
      }
      const heading = value.match(/^(#{1,6})\s+(.+)$/);
      const isList = /^(?:[-*]|\d+\.)\s+/m.test(value);
      if (heading) {
        const level = heading[1].length;
        sectionPath = [...sectionPath.slice(0, level - 1), heading[2].trim()];
      }
      blocks.push({
        type: heading ? 'heading' : isList ? 'list' : 'paragraph',
        order: blocks.length,
        text: heading ? heading[2].trim() : value,
        sectionPath: [...sectionPath],
        sourceStart: offset,
        sourceEnd: offset + raw.length,
        confidence: 1,
        warnings: [],
      });
      offset += raw.length + 2;
    }
    return { blocks, warnings: [] };
  }
}
