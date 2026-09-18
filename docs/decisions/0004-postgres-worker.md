# ADR 0004: Single PostgreSQL-leased worker

Status: Accepted for demo

A separately started worker atomically claims jobs with `FOR UPDATE SKIP LOCKED`, lease expiry, attempts and bounded retry delay. It shares application code with the API.

This proves asynchronous/idempotent design without adding Redis. Production can replace the queue port with a managed service.
