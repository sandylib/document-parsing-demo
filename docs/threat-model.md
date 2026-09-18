# Demo threat model

## Protected assets
Original documents, restricted chunks, authorization metadata, model credentials, evidence/citations and audit records.

## Trust boundaries and controls
- Upload: 10 MB/type allowlist, generated storage keys, no user-controlled paths. Production adds malware scanning and isolated parser workers.
- Authorization: the demo role adapter represents a trusted gateway claim. Repository queries apply role and current-version predicates before returning evidence.
- Prompt injection: document content is labelled untrusted, initial retrieval is mandatory, and only two read-only allowlisted tools exist.
- Citations: evidence IDs are server-issued and resolved through authorization-aware use cases.
- MCP: loopback binding, bearer token, origin validation, schema validation and bounded tool output.
- Model providers: keys stay server-side; raw provider events do not reach the browser.
- Logging: IDs/timings/status are recorded; full restricted bodies, secrets and hidden reasoning are not.

## Verified abuse cases
1. A public search/chat for the staff payroll fact returns no evidence and refuses.
2. The superseded ten-day policy is not retrieved after version two is promoted.
3. MCP without the demo token returns 401.
4. Unknown evidence IDs do not disclose whether a restricted document exists.

## Production follow-up
Enterprise IdP and source ACL sync, malware scanning, encrypted object storage, rate limiting, security events, retention/legal hold and dependency scanning are outside the local demo.
