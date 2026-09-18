#!/usr/bin/env bash
set -euo pipefail
corepack install --global pnpm@10.17.1 >/dev/null
pnpm install
if [[ ! -f .env ]]; then cp .env.example .env; fi
docker compose up -d postgres
if command -v security >/dev/null 2>&1 && security find-certificate -a -c Zscaler -p /Library/Keychains/System.keychain > infra/ollama/local-ca.crt 2>/dev/null && [[ -s infra/ollama/local-ca.crt ]]; then
  docker compose -f docker-compose.yml -f docker-compose.corporate-ca.yml up -d --build ollama
else
  rm -f infra/ollama/local-ca.crt
  docker compose up -d ollama
fi
until curl -fsS http://127.0.0.1:11434/api/tags >/dev/null; do sleep 2; done
docker compose exec -T ollama ollama pull qwen3:0.6b
docker compose exec -T ollama ollama pull qwen3-embedding:0.6b
pnpm db:migrate
printf 'Local services and models are ready.\n'
