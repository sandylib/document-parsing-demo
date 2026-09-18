# Architecture Contracts

## Canonical document

```typescript
type BlockType = 'heading' | 'paragraph' | 'list' | 'table' | 'image-reference';
interface CanonicalBlock {
  id: string;
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
```

## Chat provider

`ChatModel.stream()` accepts application-owned messages/tools and emits `text-delta`, `tool-call`, `usage`, `completed` or `error`. A capability profile declares streaming, tools, structured output and context limit. Provider payloads do not escape adapters.

## Application SSE

Events: `message.started`, `retrieval.completed`, `text.delta`, `citation.available`, `message.completed`, `message.failed`. Every event has message ID and increasing sequence.

## Evidence bundle

Evidence is immutable for one answer run and includes stable evidence ID, chunk ID, document/version ID, title, section path, page, excerpt and retrieval score. Citation output references evidence IDs only.

## Pipeline revision

A revision identifies parser, normalizer, chunker/configuration, embedding model/dimensions/distance metric, retrieval configuration, prompt/citation policy and tool schema.

## MCP

Initial read-only tools are `search_knowledge` and `get_source`. Transport DTOs map to application commands. Trusted authorization context is added server-side.
