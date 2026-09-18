# Prototype contracts and target extensions

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

Ingestion uses a separate stable event shape:

```typescript
type IngestionQueueEvent = {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'stalled';
  progress?: number;
  error?: string;
};
```

The browser treats this as an invalidation signal and refetches authoritative status from PostgreSQL.

## Job queue

`JobQueue.enqueue({ jobId, versionId })` is an outbound application port. `ingestion_jobs.id` is also the BullMQ `jobId`, providing idempotent queue identity. Payloads contain identifiers only. BullMQ transport state controls delivery, retries and stalled recovery; it is never exposed as the REST domain model. `JobRepository` records processing attempts, coarse progress, errors and terminal status in PostgreSQL.

## Evidence bundle

Evidence is immutable for one answer run and includes stable evidence ID, chunk ID, document/version ID, title, section path, page, excerpt and retrieval score. Citation output references evidence IDs only.

## Pipeline revision

The target design records parser/OCR, normalizer, chunker configuration and embedding profile to reproduce processing. Downstream retrieval and answer policies should also be versioned separately.

The prototype uses a `demo-v1` pipeline revision label and stores the embedding model name on chunks; these are not complete configuration records. Its initial database migration fixes vectors at 1024 dimensions. A model with different dimensions requires a compatible schema/index migration and re-indexing, not only an environment-variable change.

Prototype access metadata is a public/staff visibility value, not an enterprise ACL. Currency uses `is_current`; effective dates, source-policy synchronisation and revocation freshness belong to the proposed solution.

## MCP

Initial read-only tools are `search_knowledge` and `get_source`. Transport DTOs map to application commands. Trusted authorization context is added server-side.
