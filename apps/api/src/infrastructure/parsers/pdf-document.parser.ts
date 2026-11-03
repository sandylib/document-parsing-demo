import { Injectable } from '@nestjs/common';
import type { DocumentParser, ParseInput } from '../../application/ports/document-parser.port.js';
import type { CanonicalBlockDraft } from '../../core/knowledge.types.js';

@Injectable()
export class PdfDocumentParser implements DocumentParser {
  readonly name = 'pdfjs-v1';

  supports(input: Pick<ParseInput, 'mimeType' | 'originalName'>) {
    return input.mimeType === 'application/pdf' || /\.pdf$/i.test(input.originalName);
  }

  async parse(input: ParseInput) {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const document = await pdfjs.getDocument({
      data: new Uint8Array(input.content),
      useWorkerFetch: false,
      useSystemFonts: true,
    }).promise;
    const blocks: CanonicalBlockDraft[] = [];
    const warnings: string[] = [];
    let sectionPath: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!text) {
        warnings.push(`Page ${pageNumber} contained no extractable text`);
        continue;
      }
      const paragraphs = text.split(/(?<=[.!?])\s+(?=[A-Z])/).reduce<string[]>((acc, sentence) => {
        const last = acc.at(-1);
        if (last && last.length < 500) acc[acc.length - 1] = `${last} ${sentence}`;
        else acc.push(sentence);
        return acc;
      }, []);
      for (const paragraph of paragraphs) {
        const heading = paragraph.length < 90 && !/[.!?]$/.test(paragraph);
        if (heading) sectionPath = [paragraph];
        blocks.push({
          type: heading ? 'heading' : 'paragraph',
          order: blocks.length,
          text: paragraph,
          page: pageNumber,
          sectionPath: [...sectionPath],
          confidence: 0.9,
          warnings: [],
        });
      }
    }
    return { blocks, warnings };
  }
}
