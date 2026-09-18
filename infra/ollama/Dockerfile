FROM ollama/ollama:latest

USER root
COPY local-ca.crt /usr/local/share/ca-certificates/local-ca.crt
RUN update-ca-certificates
