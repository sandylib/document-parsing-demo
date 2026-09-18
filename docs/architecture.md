# Architecture

## Container view

```mermaid
flowchart LR
    User[User] --> Web[Next.js]
    Web -->|REST and SSE| Api[NestJS API]
    External[External MCP client] -->|Streamable HTTP| Mcp[NestJS MCP adapter]
    Api --> App[Application use cases]
    Mcp --> App
    Worker[Worker bootstrap] --> App
    App --> Pg[(PostgreSQL and pgvector)]
    App --> Files[Local object storage]
    App --> Parsers[Deterministic parsers]
    App --> Ollama[Ollama]
```

## Dependency rule

```mermaid
flowchart LR
    Presentation[REST SSE MCP] --> Application[Use cases and ports]
    Infrastructure[DB Files Parser Models] --> Application
    Composition[Nest modules] --> Presentation
    Composition --> Infrastructure
```

Application code owns policy and interfaces. Presentation maps transports to commands. Infrastructure implements ports. Composition is the only place concrete adapters are selected.

## Ingestion sequence

```mermaid
sequenceDiagram
    participant UI as Next.js
    participant API as REST
    participant DB as PostgreSQL
    participant W as Worker
    participant P as Parser
    participant E as Embedding
    UI->>API: upload document
    API->>DB: register version and job
    API-->>UI: 202 job ID
    W->>DB: claim lease
    W->>P: parse stored file
    P-->>W: canonical blocks and warnings
    W->>E: embed chunks
    E-->>W: vectors
    W->>DB: atomic persist and promote
    UI->>API: poll job/version
```

## Grounded answer sequence

```mermaid
sequenceDiagram
    participant UI as Next.js
    participant API as Answer endpoint
    participant R as Retrieval use case
    participant M as ChatModel
    UI->>API: question and trusted demo identity
    API->>R: authorized search command
    R-->>API: immutable evidence bundle
    alt insufficient evidence
        API-->>UI: refusal SSE events
    else sufficient evidence
        API->>M: trusted instructions and bounded evidence
        M-->>API: provider-neutral stream
        API-->>UI: text deltas and validated citations
    end
```

## Trust boundaries
- Browser input, uploaded files, model output and retrieved document text are untrusted.
- Identity and authorization scope are derived by the host, never accepted from model tool arguments.
- Evidence IDs are issued by retrieval and resolved server-side.
- MCP transport types and provider SDK types stop at adapters.
