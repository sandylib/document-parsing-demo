# API

NestJS REST/SSE and MCP presentation adapters over clean-architecture application use cases.

- `ApiModule` is the HTTP/MCP composition root and BullMQ producer.
- `WorkerModule` is the separate `document-ingestion` BullMQ consumer.
- `SharedApplicationModule` contains reusable use cases, ports and infrastructure bindings.
- BullMQ carries only `{ jobId, versionId }`; PostgreSQL remains authoritative for status and content.

From the repository root, start Redis/PostgreSQL/Ollama with `pnpm setup`, then run `pnpm dev:api` and `pnpm worker` in separate terminals. `/health` reports Redis queue connectivity alongside PostgreSQL and model providers; `/documents/events` streams ingestion progress.
