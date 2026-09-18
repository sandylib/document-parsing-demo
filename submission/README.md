# Document Parsing Capability — Interview Submission

This folder is the complete written submission for the Department of Education
Senior Software Engineer solution-design exercise. It proposes how departmental
documents can be converted into secure, traceable and quality-controlled
AI-ready content. No source code or running prototype is required to review it.

## Start here

Read [solution-design.md](solution-design.md). It is the authoritative proposal
and is designed to be reviewed in approximately 15 minutes.

The document contains three portable diagrams:

1. the production system architecture and trust boundaries;
2. the per-document parsing and quality workflow; and
3. the processing and publication lifecycle.

Rendered SVG files are under [`assets/`](assets/) so the diagrams remain visible
in Markdown viewers that do not support Mermaid.

## Review in one minute

- **Outcome:** immutable canonical content that preserves structure, provenance,
  lifecycle and access-policy references.
- **Approach:** native extraction first, selective OCR or specialist processing
  where needed, and owner review for material uncertainty.
- **Safety:** untrusted files are quarantined and parsed in isolation; current
  permissions and lifecycle rules are enforced outside AI models.
- **Reliability:** a transactional outbox, idempotent workers, staged indexes and
  atomic publication prevent lost work and partial revisions.
- **Acceptance:** a representative, owner-annotated corpus measures fidelity,
  material loss, review effort, access leakage, latency and cost before rollout.

## Submission boundary

The design is intentionally technology-neutral where Department constraints are
unknown. Any local prototype and its implementation notes are supporting
engineering evidence, not part of this submitted folder and not evidence of
production readiness.
