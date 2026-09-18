# Five-minute demo runbook

## Prepare
1. Run `pnpm setup` once.
2. In separate terminals run `pnpm dev:api`, `pnpm worker`, and `pnpm dev:web`.
3. Run `pnpm seed` and open http://localhost:3000.
4. Run `docker compose exec redis redis-cli ping` and expect `PONG`.
5. Confirm `/health` reports database, queue, chat and embedding as true.

## Scenario 1 — AI-ready ingestion
Upload a born-digital PDF or inspect the seeded policy. Show queued → processing progress → ready without polling the queue. Explain that BullMQ carries only IDs, uses three attempts with exponential backoff and one local worker, while PostgreSQL remains the reconnect/status source of truth.

## Scenario 2 — Grounded current answer
Ask: “How long does a device request take?”
Expected: “five school days,” a verified Student Device Policy citation, and no reference to the superseded ten-day wording.

## Scenario 3 — Authorization and refusal
As Public user ask: “What is the payroll cut-off?”
Expected: mandatory retrieval finds no authorised evidence and refuses before model generation. Switch to Staff user and ask again; expected answer is Thursday at 3:00 PM with the staff citation.

## Scenario 4 — Versioning
Use the upload panel’s Version target to upload a changed Student Device Policy. Show the new version becoming current only after indexing and the previous version becoming superseded.

## Scenario 5 — MCP reuse
Run:

```bash
pnpm --filter @demo/api exec tsx scripts/smoke-mcp.ts
```

Show that the external MCP client discovers only `search_knowledge` and `get_source`, while the handlers reuse authorization-aware application use cases.

## Close
Open [solution-design.md](solution-design.md) and summarize production evolution: source connectors, specialist OCR/layout adapters, enterprise ACL synchronization, object storage, measured BullMQ worker scaling and measured search scaling.
