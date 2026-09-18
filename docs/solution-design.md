# Document Parsing Capability — Solution Design

## Executive summary

The capability converts departmental documents into a versioned, structured and traceable representation suitable for retrieval-augmented generation (RAG). The demo proves the architecture with born-digital PDF, Markdown and plain text. It deliberately does not attempt production OCR, every source connector, or cloud deployment.

The design uses deterministic parsers, asynchronous ingestion, PostgreSQL/pgvector, policy-controlled hybrid retrieval and mandatory grounding before Qwen generates an answer. Next.js presents the experience through REST/SSE. NestJS owns policy and orchestration. MCP is a read-only external presentation adapter over the same application use cases.

## Scope and assumptions

### Demo scope
- Manual upload of born-digital PDF, Markdown and TXT.
- Local filesystem for originals behind an object-storage port.
- PostgreSQL for documents, immutable versions, authoritative ingestion status, canonical blocks, chunks and audit records.
- Redis-backed BullMQ for asynchronous job delivery, retry timing, progress and worker coordination.
- pgvector embeddings from Ollama; PostgreSQL full-text search for lexical retrieval.
- Local Qwen chat through Ollama.
- Two read-only MCP tools: `search_knowledge` and `get_source`.
- A simple trusted role header/demo token to demonstrate authorization boundaries.

### Deferred but designed for
- DOCX, scanned PDFs/OCR, table-specialist extraction, images and multilingual content.
- SharePoint/CMS connectors, malware scanning, SSO and cloud object storage.
- Horizontal scaling and production deployment.

### Definition of AI-ready
An AI-ready version is immutable and contains ordered typed blocks, hierarchy, provenance, quality warnings, authorization metadata and lifecycle dates. Chunks preserve links to source blocks and are indexed with a versioned embedding profile. Retrieval results carry stable evidence IDs that resolve to a document version, section and page.

## Requirements

### Functional
1. Accept supported files and reject invalid type/size.
2. Detect duplicate content by checksum and make retries idempotent.
3. Parse content while preserving useful structure and page/section provenance.
4. Surface extraction warnings instead of silently losing unsupported content.
5. Chunk by structure, embed and index only a successfully completed version.
6. Keep versions immutable and exclude superseded versions by default.
7. Filter by authorization before evidence can leave retrieval.
8. Return traceable citations for search and answers.
9. Refuse knowledge answers when authorized evidence is insufficient.
10. Expose human workflows by REST/SSE and read-only AI-client retrieval by MCP.

### Non-functional
- Security: no unauthorized chunk, citation or existence disclosure; untrusted documents cannot change instructions.
- Reliability: durable BullMQ delivery, bounded retries/stalled-job recovery and atomic PostgreSQL promotion.
- Reproducibility: pipeline revision and answer-run records.
- Maintainability: SOLID at external boundaries, simple domain logic, enforced import direction.
- Observability: correlation IDs, structured events, processing timings and actionable errors.
- Portability: provider-neutral chat/embedding contracts, provider adapters and conformance tests.

## Architecture

See [architecture.md](architecture.md). The principal boundaries are:
- Next.js: UI composition and browser state only.
- REST/SSE: upload, status, search diagnostics and streamed answers.
- NestJS application: ingestion, retrieval, authorization and answer policy.
- API composition: persists status then enqueues identifier-only jobs.
- Worker composition: consumes BullMQ jobs and invokes ingestion use cases.
- MCP: maps transport DTOs to the same search/source application commands.
- Infrastructure adapters: PostgreSQL, Redis/BullMQ, filesystem, parsers and Ollama.

## Processing flow

1. REST validates metadata, streams the file to storage, calculates SHA-256 and registers an immutable pending version plus `ingestion_jobs` status record.
2. The API enqueues `{ jobId, versionId }` to the `document-ingestion` BullMQ queue; duplicate registrations do not enqueue duplicate work.
3. The dedicated worker consumes the identifier-only job and marks PostgreSQL status `processing`.
4. The selected deterministic parser emits canonical blocks and warnings.
5. Normalization and quality checks produce a pipeline-revisioned representation.
6. Structure-aware chunks retain block, section and page links.
7. The embedding adapter creates vectors using the configured embedding profile.
8. One transaction stores blocks/chunks, marks status completed and promotes the version; failure leaves the previous current version untouched.
9. Processing errors are recorded then rethrown. BullMQ performs three attempts with exponential backoff and stalled-job recovery.

## Query and answer flow

`AnswerQuestionUseCase` follows a fixed policy:

`authenticate → build authorized scope → hybrid retrieval → refuse if insufficient → immutable evidence bundle → bounded context → model generation → citation validation → SSE answer`

The model does not choose whether initial retrieval occurs. It may request a bounded follow-up search or source fetch through an allowlisted internal tool registry. Server-issued evidence IDs—not model-created URLs—produce citations.

## Canonical representation

Core records are `Document`, immutable `DocumentVersion`, `CanonicalBlock`, `Chunk`, `EmbeddingProfile`, `PipelineRevision`, `IngestionJob` and `AnswerRun`.

A block records type (`heading`, `paragraph`, `list`, `table`, `image-reference`), ordered text/structure, page, optional bounding box, section path, source offsets, confidence and warnings. A chunk records ordered block IDs, text, token estimate, section/page range, ACL snapshot and embedding profile. Originals remain outside PostgreSQL.

## Quality and validation

The small, human-reviewed fixture set measures:
- Parsing: readable text completeness, reading order, heading/page preservation and visible loss warnings.
- Retrieval: Recall@k on labelled questions and zero permission/version leakage.
- Answering: citation correctness, unsupported-claim rate and correct refusal.

Thresholds are demo baselines, not universal claims. A difficult document should demonstrate warning/reprocess behavior rather than pretend all layouts parse perfectly.

## Security

Authorization is enforced in application use cases before ranking and reused by REST, chat and MCP. Model/tool arguments cannot supply identity or broaden scope. Retrieved content is delimited as untrusted evidence. Tools are read-only, bounded and time-limited. MCP binds to loopback for the demo and requires a token. Logs avoid document bodies, secrets and hidden model reasoning.

Production evolution adds enterprise identity, source ACL synchronization, malware scanning, encryption/key management, retention/legal hold and security monitoring.

## Versions and freshness

Versions are immutable. Atomic promotion marks exactly one version current after successful indexing. Retrieval defaults to current and effective content. Reprocessing creates a new pipeline revision without corrupting existing searchable content. Embedding changes require re-embedding because dimensions and semantics may differ.

## Operations and scaling

The demo uses Redis-backed BullMQ with one worker, three attempts and exponential backoff. Redis owns delivery state; PostgreSQL `ingestion_jobs` owns application-facing status, progress and errors. Progress events trigger UI refetches from PostgreSQL, so missed Redis events do not corrupt displayed state. Exact vector search is appropriate for the fixture corpus; HNSW is introduced only from measured latency/volume and must be evaluated with authorization filters.

Production scales BullMQ workers from measured load and adds object storage, Redis high availability, dead-letter tooling, dashboards, alerts, backups and disaster recovery.

## Decisions and trade-offs

- Deterministic parsing over LLM parsing: predictable and testable; optional AI repair remains future work.
- PostgreSQL + pgvector: metadata, ACLs, versions, lexical and vector search stay transactionally close; specialized search can be introduced from evidence.
- BullMQ + Redis: use a reviewed queue implementation for retries and coordination while keeping PostgreSQL authoritative for domain status.
- NestJS-owned orchestration: keeps policy and provider access server-side; Next.js remains a replaceable client.
- MCP as an edge adapter: proves interoperability without forcing internal services to call themselves over a protocol.
- TypeScript first: one toolchain across web/API/MCP; Python is isolated behind `DocumentParser` only if evaluation justifies it.
- Provider-neutral contracts: OpenAI-compatible transport may simplify an adapter but is not the application contract.

## Risks

- Complex layout loss: record warnings and evaluate representative documents; add specialist adapters later.
- Retrieval leakage: apply ACL/version predicates inside repository queries and test adversarially.
- Prompt injection: mandatory policy, read-only tools, trusted/untrusted context separation and server citations.
- Local-model quality: refusal threshold and provider conformance tests; avoid presenting unsupported answers.
- Demo scope growth: phase gates and explicit deferred capabilities.
- Redis availability: fail upload visibly when enqueueing fails; use `noeviction`, health checks and bounded identifier-only payloads.

## AI-use declaration

Cursor AI was used to help analyse the brief, structure the design, scaffold code and generate initial tests/documentation. The architecture, scope, trade-offs and acceptance criteria were reviewed against the source exercise; executable tests and manual fixture checks validate generated implementation output.
