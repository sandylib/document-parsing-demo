# Document Parsing and Grounded Knowledge Demo

A local prototype supporting the Department of Education document-parsing solution-design exercise. It turns PDF/Markdown/TXT into versioned canonical blocks and chunks. Authorised retrieval and grounded answers demonstrate downstream use of that parsed content.

The self-contained interview submission starts at [submission/README.md](submission/README.md). The code is a supporting prototype, not a required submission. Prototype-specific notes are in [prototype-docs/architecture.md](prototype-docs/architecture.md), [prototype-docs/evaluation.md](prototype-docs/evaluation.md), and [prototype-docs/demo-runbook.md](prototype-docs/demo-runbook.md).

## Architecture
- Next.js feature layers: `app → features → domains → core`.
- NestJS clean architecture: presentation adapters → application use cases/ports ← infrastructure adapters.
- REST/SSE for browser workflows; two read-only MCP tools for external AI clients.
- PostgreSQL + pgvector for authoritative processing status, immutable versions, canonical blocks, hybrid search and answer audit.
- Redis-backed BullMQ for identifier-only job delivery, retries, progress and worker coordination.
- Ollama/Qwen by default. Provider-neutral ports can select OpenAI via environment variables.

## Prerequisites
- Node.js 24+
- pnpm 10 (Corepack can install it)
- Docker Desktop

## Quick start

```bash
pnpm setup
pnpm dev:api       # terminal 1
pnpm worker        # terminal 2
pnpm dev:web       # terminal 3
pnpm seed
```

Open http://localhost:3000. API docs are at http://localhost:3001/openapi and health at http://localhost:3001/health. Redis is exposed locally at `redis://localhost:6379` with `noeviction`; it is queue infrastructure, not an application data source.

`pnpm setup` detects a Zscaler root on macOS and builds a local Ollama image with that CA. The exported local certificate is ignored by git. Without TLS interception it uses the official image directly.

## Validation

```bash
pnpm lint
pnpm test
pnpm build
pnpm evaluate
pnpm --filter @demo/api exec tsx scripts/smoke-mcp.ts
```

## Provider switch
Copy `.env.example` to `.env`. Ollama is default. To use OpenAI chat without changing application logic:

```dotenv
CHAT_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_CHAT_MODEL=gpt-5-mini
```

Embedding providers are configured separately. Changing embeddings requires clearing/re-indexing content because vector meaning and dimensions are model-specific.

## Demo security model
`x-demo-role: staff` represents a role already validated by a trusted identity gateway. It is intentionally not production authentication. MCP binds with the API to loopback and requires `Authorization: Bearer local-demo-token` by default.

## Known limitations
- PDF structure uses a deterministic text extractor and lightweight heuristics; OCR, complex tables and multi-column layout need dedicated adapters.
- BullMQ worker concurrency is one for predictable local model usage; production throughput requires measured worker scaling and Redis operations.
- The evaluation corpus is deliberately small and manually reviewed.
- The local role adapter, filesystem and token are replaceable demo adapters.
