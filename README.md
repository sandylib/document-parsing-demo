# Document Parsing and Grounded Knowledge Demo

A local, architecture-first demonstration for the Department of Education solution-design exercise. It turns PDF/Markdown/TXT into versioned canonical blocks and chunks, retrieves authorised current evidence, and streams grounded Qwen answers with server-owned citations.

The primary submission is [docs/solution-design.md](docs/solution-design.md). See [docs/architecture.md](docs/architecture.md), [docs/evaluation.md](docs/evaluation.md), and [docs/demo-runbook.md](docs/demo-runbook.md).

## Architecture
- Next.js feature layers: `app → features → domains → core`.
- NestJS clean architecture: presentation adapters → application use cases/ports ← infrastructure adapters.
- REST/SSE for browser workflows; two read-only MCP tools for external AI clients.
- PostgreSQL + pgvector for jobs, immutable versions, canonical blocks, hybrid search and answer audit.
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

Open http://localhost:3000. API docs are at http://localhost:3001/openapi and health at http://localhost:3001/health.

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
- One local worker and PostgreSQL leasing are suitable for the demo, not high-throughput ingestion.
- The evaluation corpus is deliberately small and manually reviewed.
- The local role adapter, filesystem and token are replaceable demo adapters.
