# ADR 0001: NestJS owns answer orchestration

Status: Accepted

Next.js uses REST/SSE. NestJS authenticates, performs mandatory retrieval, builds context, invokes model adapters and verifies citations. MCP is a separate external adapter over the same use cases.

This centralizes policy and avoids browser/provider coupling. The trade-off is a slightly richer backend and SSE contract.
