# ADR 0005: Redis-backed BullMQ delivery

Status: Accepted

## Decision

Use the `document-ingestion` BullMQ queue backed by Redis. The API is the producer and a separately composed worker is the only consumer. Jobs use PostgreSQL `ingestion_jobs.id` as BullMQ `jobId` and carry only `{ jobId, versionId }`.

BullMQ owns delivery, three attempts with exponential backoff, concurrency and stalled-job recovery. PostgreSQL remains authoritative for application-facing status, progress, errors, immutable document data and vectors. Worker concurrency is one for predictable local PDF/model resource use.

## Consequences

This adds Redis to local and production operations, but removes custom queue correctness from application code. API enqueue failures are recorded and surfaced; an outbox, dashboard, clustering and elaborate dead-letter operations remain outside demo scope. SSE queue events only trigger UI refreshes—Redis state does not become the frontend domain model.

## Alternatives

- The custom PostgreSQL `FOR UPDATE SKIP LOCKED` queue from ADR 0004 was rejected because leases, retry timing and stalled recovery distract from the document architecture.
- A BullMQ PostgreSQL backend is deferred; the established Redis backend is clearer for reviewers and locally reproducible.
- A cloud-managed queue is unnecessary for the local demo and should be considered only from measured operational needs.
