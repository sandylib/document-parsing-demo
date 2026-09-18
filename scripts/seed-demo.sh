#!/usr/bin/env bash
set -euo pipefail
api=${API_URL:-http://127.0.0.1:3001}
old=$(curl -fsS -F 'file=@fixtures/policy-superseded.md;type=text/markdown' -F 'title=Student Device Policy' -F 'visibility=public' "$api/documents")
document_id=$(printf '%s' "$old" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).documentId))')
for _ in $(seq 1 60); do curl -fsS "$api/documents" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>process.exit(JSON.parse(d).some(x=>x.status==="ready")?0:1))' && break; sleep 2; done
curl -fsS -F 'file=@fixtures/policy-current.md;type=text/markdown' -F "documentId=$document_id" -F 'title=Student Device Policy' -F 'visibility=public' "$api/documents" >/dev/null
curl -fsS -F 'file=@fixtures/restricted-notice.txt;type=text/plain' -F 'title=Payroll Notice' -F 'visibility=staff' "$api/documents" >/dev/null
printf 'Demo fixtures queued. The worker will promote them when indexing succeeds.\n'
